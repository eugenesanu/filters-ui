"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { formatsFor, resultsLabel } from "../lib/format";
import { Button, IconButton } from "../ui/button";
import { DragHandle, type NumberDrag } from "../ui/drag-handle";
import { DropdownMenu } from "../ui/dropdown-menu";
import { ListTreeIcon, PlusIcon, XIcon } from "../ui/icons";
import { ARRIVING, SKELETON_FILL, SkeletonText, useLoading } from "../ui/skeleton";
import { StatusFrame, type StateProps } from "../ui/status-frame";
import { TextSwap } from "../ui/text-swap";

export type Join = "and" | "or";
export type RuleOp = "atMost" | "atLeast" | "between" | "is" | "anyOf" | "noneOf";
export type RuleValue = number | null | readonly [number | null, number | null] | readonly string[];

export type Rule = { id: string; field: string; op: RuleOp; value: RuleValue };
/** Rules inside a group are joined by the group's own And or Or. */
export type RuleGroup = { id: string; join: Join; rules: Rule[] };
export type RuleSet = { join: Join; items: (Rule | RuleGroup)[] };

/**
 * A field rules can test. "number" is typed (prices, kilometres), "step" is picked from a few values (years, seats),
 * "list" holds names (fuel, body style). get reads the item's value; null fails every rule on the field.
 */
export type RuleField<Item> =
  | {
      key: string;
      label: string;
      kind: "number";
      get: (item: Item) => number | null;
      /** Text in the field, e.g. "45,000". */
      format?: (value: number) => string;
      /** Reads typed text; null when it holds no number. Default reads "45000", "45,000", "45k" and "1.2m". */
      parse?: (text: string) => number | null;
      /** Muted text before the value, e.g. "$". */
      prefix?: string;
    }
  | { key: string; label: string; kind: "step"; get: (item: Item) => number | null; steps: readonly number[]; format?: (value: number) => string }
  | { key: string; label: string; kind: "list"; get: (item: Item) => string | null; options: readonly string[] };

export type RulesProps<Item> = Omit<StateProps, "emptyText"> & {
  fields: readonly RuleField<Item>[];
  /** Every item, for the counts. */
  items: readonly Item[];
  value: RuleSet;
  onChange: (value: RuleSet) => void;
  /** Accessible name of the whole set. */
  label?: string;
  /** Words for a count: "34 cars". */
  countLabel?: (n: number) => string;
  /** Word after each row's count, e.g. "left" in "196 left". */
  leftLabel?: string;
  formatCount?: (n: number) => string;
  /** Formats counts and typed numbers and reads them back ("45.000" in de-DE), e.g. "de-DE". Default "en-US". */
  locale?: string;
  className?: string;
};

const SMOOTH = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
let made = 0;
const newId = () => `rule-${Date.now().toString(36)}-${(made += 1)}`;

/** Reads a typed number in en-US: "45000", "$45,000", "45k" or "1.2m". */
export const defaultParse = (text: string) => {
  const typed = text.trim().toLowerCase().replace(/[$,\s]/g, "").replace(/[a-z]+$/, (unit) => (unit === "k" || unit === "m" ? unit : ""));
  const match = typed.match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if (!match) return null;
  return Math.round(Number(match[1]) * (match[2] === "k" ? 1e3 : match[2] === "m" ? 1e6 : 1));
};

/** The default reader for a locale: en-US keeps defaultParse; others read their own marks, so "45.000" is 45000 in de-DE. */
const parseFor = (locale?: string) => {
  const f = formatsFor(locale);
  if (f.locale === "en-US") return defaultParse;
  return (text: string) => {
    const n = f.readNumber(text);
    return n === null ? null : Math.round(n);
  };
};

const OPS: Record<RuleField<unknown>["kind"], RuleOp[]> = {
  number: ["atMost", "atLeast", "between"],
  step: ["atLeast", "atMost", "is"],
  list: ["anyOf", "noneOf"],
};
const OP_WORDS: Record<RuleOp, string> = {
  atMost: "at most",
  atLeast: "at least",
  between: "between",
  is: "is",
  anyOf: "any of",
  noneOf: "none of",
};
const OP_SIGNS: Partial<Record<RuleOp, string>> = { atMost: "≤", atLeast: "≥", is: "=" };

export const isGroup = (item: Rule | RuleGroup): item is RuleGroup => "rules" in item;

const isSet = (rule: Rule) => {
  const { value } = rule;
  if (value === null) return false;
  if (typeof value === "number") return true;
  if (rule.op === "between") return (value as readonly unknown[]).some((end) => end !== null);
  return (value as readonly unknown[]).length > 0;
};

function passes<Item>(item: Item, rule: Rule, field: RuleField<Item> | undefined) {
  if (!field || !isSet(rule)) return true;
  if (field.kind === "list") {
    const has = field.get(item);
    const names = rule.value as readonly string[];
    return rule.op === "noneOf" ? has === null || !names.includes(has) : has !== null && names.includes(has);
  }
  const has = field.get(item);
  if (has === null) return false;
  if (rule.op === "between") {
    const [low, high] = rule.value as readonly [number | null, number | null];
    return (low === null || has >= low) && (high === null || has <= high);
  }
  const limit = rule.value as number;
  return rule.op === "atMost" ? has <= limit : rule.op === "atLeast" ? has >= limit : has === limit;
}

const joined = <T,>(join: Join, list: readonly T[], test: (entry: T) => boolean) => (join === "and" ? list.every(test) : list.some(test));
const liveRules = (rules: readonly Rule[]) => rules.filter(isSet);
const liveItems = (items: readonly (Rule | RuleGroup)[]) => items.filter((item) => (isGroup(item) ? liveRules(item.rules).length > 0 : isSet(item)));

/** Whether an item passes a rule set. A rule with no value yet, and a group with none set, tests nothing. */
export function matchRules<Item>(item: Item, set: RuleSet, fields: readonly RuleField<Item>[]) {
  const fieldOf = (key: string) => fields.find((field) => field.key === key);
  const test = (rule: Rule) => passes(item, rule, fieldOf(rule.field));
  const live = liveItems(set.items);
  if (!live.length) return true;
  return joined(set.join, live, (entry) => (isGroup(entry) ? joined(entry.join, liveRules(entry.rules), test) : test(entry)));
}

type Scale = { min: number; max: number; step: number };
const scales = new WeakMap<object, Map<string, Scale | null>>();

/**
 * The scale a number field's drag handle moves along: from the lowest to the highest value among the items, widened to
 * a round step of about a hundredth of that span. Worked out once per list of items; null when the values do not differ.
 */
function scaleOf<Item>(items: readonly Item[], field: RuleField<Item> & { kind: "number" }): Scale | null {
  let known = scales.get(items);
  if (!known) scales.set(items, (known = new Map()));
  const kept = known.get(field.key);
  if (kept !== undefined) return kept;
  let low = Infinity;
  let high = -Infinity;
  let whole = true;
  for (const item of items) {
    const n = field.get(item);
    if (n === null) continue;
    if (n < low) low = n;
    if (n > high) high = n;
    if (!Number.isInteger(n)) whole = false;
  }
  let scale: Scale | null = null;
  if (high > low) {
    const rough = (high - low) / 100;
    const power = 10 ** Math.floor(Math.log10(rough));
    const round = (rough / power >= 5 ? 5 : rough / power >= 2 ? 2 : 1) * power;
    // Whole numbers step by at least 1; ratings and ratios keep a step below it, written with its own decimals.
    const step = whole ? Math.max(1, round) : round;
    const tidy = (n: number) => Number(n.toFixed(Math.max(0, -Math.floor(Math.log10(step)))));
    scale = { min: tidy(Math.floor(low / step) * step), max: tidy(Math.ceil(high / step) * step), step: tidy(step) };
  }
  known.set(field.key, scale);
  return scale;
}

const emptyFor = (op: RuleOp): RuleValue => (op === "between" ? [null, null] : op === "anyOf" || op === "noneOf" ? [] : null);

/** A new rule on the first field not used yet. */
export function newRule<Item>(fields: readonly RuleField<Item>[], used: readonly string[] = []): Rule {
  const field = fields.find((f) => !used.includes(f.key)) ?? fields[0];
  const op = OPS[field.kind][0];
  return { id: newId(), field: field.key, op, value: emptyFor(op) };
}

/** Keeps what it can of a value when the condition changes: at most 40k becomes between any and 40k. */
function convert(rule: Rule, op: RuleOp): RuleValue {
  if (rule.op === op) return rule.value;
  const { value } = rule;
  if (op === "between") return rule.op === "atLeast" ? [value as number | null, null] : [null, typeof value === "number" ? value : null];
  if (rule.op === "between") {
    const [low, high] = value as readonly [number | null, number | null];
    return op === "atLeast" ? low : (high ?? low);
  }
  return value;
}


const PILL = cn(
  "relative inline-flex h-9 min-w-0 cursor-text items-center gap-1 rounded-[10px] bg-[var(--fu-surface-3,#2A2A2A)] px-3 text-[14px] leading-5",
  "transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none hover:bg-[var(--fu-hover,#333333)]",
  "focus-within:bg-[var(--fu-hover,#333333)] focus-within:shadow-[inset_0_0_0_1px_var(--fu-accent-soft,#8FAAFF)]",
  "pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1 pointer-coarse:after:content-['']",
);

/**
 * A number typed into a pill that grows with it. It applies while typed and tidies itself on leaving: "45k" becomes
 * "45,000". With a scale it can be dragged as well, by the handle that shows under a mouse.
 */
function NumberPill({
  value,
  onValue,
  label,
  prefix,
  placeholder,
  format,
  parse,
  scale,
}: {
  value: number | null;
  onValue: (value: number | null) => void;
  label: string;
  prefix?: string;
  placeholder: string;
  format: (n: number) => string;
  parse: (text: string) => number | null;
  scale?: Omit<NumberDrag, "value" | "onChange"> | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const shown = value === null ? "" : format(value);
  // While its handle is dragged the pill holds the width of the longest value on the scale, so it does not grow and
  // shrink under the pointer as digits come and go.
  const widest = scale ? Math.max(format(scale.min).length, format(scale.max).length) : 0;
  const [draft, setDraft] = useState(shown);
  const [editing, setEditing] = useState(false);
  if (!editing && draft !== shown) setDraft(shown);
  // Loading, the field keeps its size and a bar the width of its words stands in for them; they fade in once.
  const { loading, arriving } = useLoading();
  return (
    // The prefix and the number read as one left-to-right unit ("$45,000"), as formatted prices do in right to left.
    <label dir="ltr" className={cn(PILL, scale && "group/field isolate")}>
      {prefix && (
        <span aria-hidden="true" className="text-[var(--fu-mute,#BDBDBD)]">
          {prefix}
        </span>
      )}
      <span className="relative inline-flex min-w-0">
      {loading && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 inset-s-0 flex items-center font-medium tabular-nums">
          <SkeletonText loading>{draft || placeholder}</SkeletonText>
        </span>
      )}
      <input
        key={loading ? "loading" : "ready"}
        ref={input}
        value={draft}
        aria-label={label}
        placeholder={placeholder}
        inputMode="decimal"
        autoComplete="off"
        size={Math.max(3, (draft || placeholder).length)}
        style={scale ? ({ "--widest": `${widest}ch` } as CSSProperties) : undefined}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          if (!text.trim()) onValue(null);
          else {
            const next = parse(text);
            if (next !== null) onValue(next);
          }
        }}
        onFocus={() => setEditing(true)}
        onBlur={() => {
          setEditing(false);
          setDraft(shown);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") setDraft(shown);
          if (event.key === "Escape" && draft !== shown) {
            event.preventDefault();
            setDraft(shown);
          }
        }}
        className={cn(
          "min-w-0 bg-transparent font-[inherit] font-medium text-[var(--fu-text,#F8F5F1)] tabular-nums outline-none placeholder:font-normal placeholder:text-[var(--fu-mute,#BDBDBD)]",
          scale && "group-has-[[data-dragging]]/field:min-w-[var(--widest)]",
          loading && "invisible",
          arriving && ARRIVING,
        )}
      />
      </span>
      {scale && !loading && (
        <DragHandle
          pad={10}
          input={input}
          drag={{
            ...scale,
            value,
            onChange: (dragged) => {
              setDraft(format(dragged));
              onValue(dragged);
            },
          }}
        />
      )}
    </label>
  );
}

/** Picked names as chips that drop out with their cross, then a menu that ticks more, each with its count. */
function NamesPills({
  value,
  onValue,
  options,
  counts,
  label,
  format,
}: {
  value: readonly string[];
  onValue: (value: string[]) => void;
  options: readonly string[];
  counts: ReadonlyMap<string, number>;
  label: string;
  format: (n: number) => string;
}) {
  // Loading, each chip is a pulsing pill of its own size.
  const { loading } = useLoading();
  return (
    <>
      {value.map((name) => (
        <button
          key={name}
          type="button"
          aria-label={`Remove ${name}`}
          onClick={(event) => {
            // The chip leaves with its press; focus goes on to the chip after it, or to the menu after the last one.
            const row = event.currentTarget.parentElement;
            const at = value.indexOf(name);
            onValue(value.filter((v) => v !== name));
            requestAnimationFrame(() => (row?.querySelectorAll<HTMLElement>("button")[at] ?? row?.querySelector<HTMLElement>("button"))?.focus());
          }}
          className={cn(
            // 5px above and below, so a line of chips is as tall as the field beside it and sits level with it.
            "relative my-[5px] flex h-[26px] max-w-full cursor-pointer items-center gap-1 rounded-full border pe-[7px] ps-[10px]",
            loading ? cn(SKELETON_FILL, "border-transparent") : "border-[var(--fu-selected,#1F2747)] bg-[var(--fu-selected,#1F2747)]",
            "font-[inherit] text-[14px] leading-5 font-medium text-[var(--fu-accent-pale,#D1DDFF)]",
            "transition-[background-color,color,border-color,opacity,filter,scale] duration-300 motion-reduce:transition-none",
            SMOOTH,
            "starting:scale-[0.82] starting:opacity-0 starting:blur-[3px]",
            "hover:border-[var(--fu-accent-soft,#8FAAFF)] active:scale-[0.97]",
            "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
            "pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-[9px] pointer-coarse:after:content-['']",
          )}
        >
          <span className={cn("truncate", loading && "invisible")}>{name}</span>
          <XIcon size={14} className={cn("shrink-0 text-[var(--fu-accent-soft,#8FAAFF)]", loading && "invisible")} />
        </button>
      ))}
      <DropdownMenu
        multiple
        variant={value.length ? "quiet" : "filled"}
        label={label}
        valueLabel={value.length ? "Add" : "Choose"}
        value={value}
        onChange={onValue}
        options={options.map((name) => ({
          value: name,
          label: name,
          hint: format(counts.get(name) ?? 0),
          disabled: !counts.get(name) && !value.includes(name),
        }))}
      />
    </>
  );
}

/**
 * The rail's hairlines for one row: a corner into the first, a tee into each middle one and a corner into the last. They
 * meet the row at its first line, so a row that wraps keeps its join next to its field.
 */
function Rail({ at, of, join, onToggle, nested = false }: { at: number; of: number; join: Join; onToggle: () => void; nested?: boolean }) {
  const line = "pointer-events-none absolute border-[var(--fu-line,#404040)]";
  const x = nested ? "inset-s-[17px]" : "inset-s-[21px]";
  const mid = nested ? "top-[18px]" : "top-6";
  const word = join === "and" ? "And" : "Or";
  return (
    <div className={cn("relative shrink-0 self-stretch", nested ? "w-[38px]" : "w-11")}>
      {of > 1 && at === 0 && <span aria-hidden="true" className={cn(line, x, mid, "inset-e-0 -bottom-2.5 rounded-ss-[10px] border-t border-s")} />}
      {of > 1 && at > 0 && at < of - 1 && (
        <>
          <span aria-hidden="true" className={cn(line, x, "-top-px -bottom-2.5 border-s")} />
          <span aria-hidden="true" className={cn(line, x, mid, "inset-e-0 border-t")} />
        </>
      )}
      {of > 1 && at === of - 1 && (
        <span aria-hidden="true" className={cn(line, x, "-top-px inset-e-0 rounded-es-[10px] border-b border-s", nested ? "h-[19px]" : "h-[25px]")} />
      )}
      {at > 0 && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${word}, switch to ${join === "and" ? "Or" : "And"}`}
          className={cn(
            "absolute -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full px-2 font-[inherit] text-[12px] leading-[22px] font-medium",
            mid,
            nested ? "inset-s-[17.5px]" : "inset-s-[21.5px]",
            "bg-[var(--fu-selected,#1F2747)] text-[var(--fu-accent-pale,#D1DDFF)]",
            "transition-[box-shadow] duration-200 motion-reduce:transition-none hover:shadow-[inset_0_0_0_1px_var(--fu-accent-soft,#8FAAFF)]",
            "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
            "pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-[11px] pointer-coarse:after:content-['']",
          )}
        >
          {/* A switched word rises in, one stop after another down the rail; from the fourth on they come together, so a
              long rail settles as soon as a short one. */}
          <span
            key={join}
            style={{ transitionDelay: `${Math.min(at - 1, 3) * 70}ms` }}
            className={cn("block transition-[opacity,filter,translate] duration-300 motion-reduce:transition-none starting:translate-y-1 starting:opacity-0 starting:blur-[2px]", SMOOTH)}
          >
            {word}
          </span>
        </button>
      )}
    </div>
  );
}

/** Items left once a row applies, as a count pill: "196 left". */
function Left({ count, word, format, className }: { count: number; word: string; format: (n: number) => string; className?: string }) {
  // Loading, the pill pulses at its own size with its words unseen; they fade in once when the count arrives.
  const { loading, arriving } = useLoading();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-5 shrink-0 items-center justify-self-end rounded-[6px] px-1.5 text-[12px] leading-4 font-medium text-[var(--fu-pill-text,#C8C8C8)] tabular-nums",
        loading ? SKELETON_FILL : "bg-[var(--fu-pill,rgb(255_255_255/0.1))]",
        className,
      )}
    >
      <span key={loading ? "loading" : "ready"} className={cn("inline-flex items-center gap-1", loading && "invisible", arriving && ARRIVING)}>
        <TextSwap className="text-[var(--fu-text,#F8F5F1)]">{format(count)}</TextSwap>
        {word}
      </span>
    </span>
  );
}

// Wide, a row is one line: field and condition, the value, then the count and the cross. Narrow, field and condition share
// the first line with the count (a row in a group has none, so they take the whole line), and the value takes the second
// with the cross. Everything hangs from the top, so a value that wraps grows the row downward and nothing else moves.
const ROW = cn(
  "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-1.5",
  "@min-[440px]/well:grid-cols-[auto_minmax(min-content,1fr)_auto_auto] @min-[440px]/well:[grid-template-areas:'head_value_left_x']",
);
const ROW_AREAS = "[grid-template-areas:'head_left'_'value_x']";
const NESTED_AREAS = "[grid-template-areas:'head_head'_'value_x']";

// What a cross would remove lights up while the pointer or the focus ring is on it: a rule's well, a group's well, or a
// row inside a group, which has no well and takes a plate 4px larger than itself. The plate's corners run parallel to
// the 10px corners of the controls it holds: 10px on the row, so 14px on the plate.
const DOOMED = "transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none";
const DOOMED_RULE = cn(
  DOOMED,
  "has-[[data-remove=rule]:hover]:bg-[var(--fu-card-hover,#262626)] has-[[data-remove=rule]:hover]:shadow-[inset_0_0_0_1px_var(--fu-line,#404040)]",
  "has-[[data-remove=rule]:focus-visible]:bg-[var(--fu-card-hover,#262626)] has-[[data-remove=rule]:focus-visible]:shadow-[inset_0_0_0_1px_var(--fu-line,#404040)]",
);
const DOOMED_GROUP = cn(
  DOOMED,
  "has-[[data-remove=group]:hover]:bg-[var(--fu-card-hover,#262626)] has-[[data-remove=group]:hover]:shadow-[inset_0_0_0_1px_var(--fu-line,#404040)]",
  "has-[[data-remove=group]:focus-visible]:bg-[var(--fu-card-hover,#262626)] has-[[data-remove=group]:focus-visible]:shadow-[inset_0_0_0_1px_var(--fu-line,#404040)]",
);
const DOOMED_NESTED = cn(
  DOOMED,
  "rounded-[10px]",
  "has-[[data-remove=rule]:hover]:bg-[var(--fu-card-hover,#262626)] has-[[data-remove=rule]:hover]:shadow-[0_0_0_4px_var(--fu-card-hover,#262626),0_0_0_5px_var(--fu-line,#404040)]",
  "has-[[data-remove=rule]:focus-visible]:bg-[var(--fu-card-hover,#262626)] has-[[data-remove=rule]:focus-visible]:shadow-[0_0_0_4px_var(--fu-card-hover,#262626),0_0_0_5px_var(--fu-line,#404040)]",
);

/**
 * Rows of field, condition and value that read as sentences, joined by And or Or along a hairline rail, with one level of
 * groups. The value follows the field: a typed number, a picked step, or names as chips. Each top row shows how many
 * items are left once it applies, so the column reads as a funnel.
 */
export function Rules<Item>({
  fields,
  items,
  value,
  onChange,
  label = "Rules",
  countLabel: countLabelProp,
  leftLabel = "left",
  formatCount: formatCountProp,
  locale,
  status = "ready",
  onRetry,
  errorText = "Couldn't load the counts.",
  disabled = false,
  className,
}: RulesProps<Item>) {
  const numbers = formatsFor(locale);
  const formatCount = formatCountProp ?? numbers.number;
  const countLabel = countLabelProp ?? ((n: number) => resultsLabel(n, locale));
  const box = useRef<HTMLDivElement>(null);
  const [focusNext, setFocusNext] = useState<string | null>(null);
  const fieldOf = (key: string) => fields.find((field) => field.key === key) ?? fields[0];

  const countOf = (set: RuleSet) => {
    let n = 0;
    for (const item of items) if (matchRules(item, set, fields)) n++;
    return n;
  };
  const after = value.items.map((_, i) => countOf({ join: value.join, items: value.items.slice(0, i + 1) }));
  const total = countOf(value);

  // A new row takes focus on its field; a removed one hands it to the next row, or to Add rule.
  useEffect(() => {
    if (!focusNext) return;
    box.current?.querySelector<HTMLElement>(focusNext === "add" ? "[data-add]" : `[data-rule="${focusNext}"] button`)?.focus();
    setFocusNext(null);
  }, [focusNext]);

  // Rows that move when one above them goes glide from where they were.
  // Tops are summed up to the box's own positioned parent: a group still sliding in is, for that moment, the offset
  // parent of its rows, and a top read against it would make them leap from above on the next change.
  const places = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    const moving = !reducedMotion();
    const stop = box.current?.offsetParent ?? null;
    for (const node of box.current?.querySelectorAll<HTMLElement>("[data-flip]") ?? []) {
      const key = node.dataset.flip!;
      let top = 0;
      for (let at: Element | null = node; at instanceof HTMLElement && at !== stop; at = at.offsetParent) top += at.offsetTop;
      next.set(key, top);
      const was = places.current.get(key);
      if (moving && was !== undefined && was !== top) node.animate([{ translate: `0 ${was - top}px` }, { translate: "0 0" }], { duration: 380, easing: EASE });
    }
    places.current = next;
  });

  const setItems = (next: (Rule | RuleGroup)[]) => onChange({ ...value, items: next });
  const used = value.items.flatMap((item) => (isGroup(item) ? item.rules.map((rule) => rule.field) : [item.field]));

  const update = (ruleId: string, change: (rule: Rule) => Rule) =>
    setItems(
      value.items.map((item) =>
        isGroup(item) ? { ...item, rules: item.rules.map((rule) => (rule.id === ruleId ? change(rule) : rule)) } : item.id === ruleId ? change(item) : item,
      ),
    );

  const remove = (ruleId: string) => {
    const flat = value.items.flatMap((item) => (isGroup(item) ? [item.id, ...item.rules.map((rule) => rule.id)] : [item.id]));
    const at = flat.indexOf(ruleId);
    const next = value.items.flatMap<Rule | RuleGroup>((item) => {
      if (item.id === ruleId) return [];
      if (!isGroup(item)) return [item];
      const rules = item.rules.filter((rule) => rule.id !== ruleId);
      return rules.length ? [{ ...item, rules }] : [];
    });
    const left = next.flatMap((item) => (isGroup(item) ? item.rules.map((rule) => rule.id) : [item.id]));
    const target = flat.slice(at + 1).find((id) => left.includes(id)) ?? flat.slice(0, at).reverse().find((id) => left.includes(id));
    setFocusNext(target ?? "add");
    setItems(next);
  };

  /** Items that pass every rule but this one, for the counts in its list. */
  const pool = (ruleId: string) => {
    const without: RuleSet = {
      join: value.join,
      items: value.items.flatMap<Rule | RuleGroup>((item) => {
        if (item.id === ruleId) return [];
        if (!isGroup(item)) return [item];
        return [{ ...item, rules: item.rules.filter((rule) => rule.id !== ruleId) }];
      }),
    };
    return items.filter((item) => matchRules(item, without, fields));
  };

  const valueOf = (rule: Rule) => {
    const field = fieldOf(rule.field);
    const name = field.label.toLowerCase();
    const said = `${field.label} ${OP_WORDS[rule.op]}`;
    if (field.kind === "list") {
      const counts = new Map<string, number>();
      for (const item of pool(rule.id)) {
        const has = field.get(item);
        if (has !== null) counts.set(has, (counts.get(has) ?? 0) + 1);
      }
      return (
        <NamesPills value={rule.value as readonly string[]} onValue={(next) => update(rule.id, (r) => ({ ...r, value: next }))} options={field.options} counts={counts} label={said} format={numbers.number} />
      );
    }
    if (field.kind === "step") {
      const format = field.format ?? numbers.plain;
      return (
        <DropdownMenu
          label={said}
          value={rule.value === null ? "" : String(rule.value)}
          onChange={(next) => update(rule.id, (r) => ({ ...r, value: next === "" ? null : Number(next) }))}
          options={[{ value: "", label: "Any" }, ...field.steps.map((step) => ({ value: String(step), label: format(step) }))]}
        />
      );
    }
    const number = { format: field.format ?? numbers.number, parse: field.parse ?? parseFor(locale), ...(field.prefix && { prefix: field.prefix }) };
    const scale = scaleOf(items, field);
    if (rule.op === "between") {
      const [low, high] = rule.value as readonly [number | null, number | null];
      return (
        <>
          <NumberPill {...number} value={low} onValue={(next) => update(rule.id, (r) => ({ ...r, value: [next, high] }))} label={`Lowest ${name}`} placeholder="Min" scale={scale && { ...scale, emptyAt: "min", ceiling: high ?? scale.max }} />
          <span className="text-[14px] leading-5 text-[var(--fu-dim,#929292)]">and</span>
          <NumberPill {...number} value={high} onValue={(next) => update(rule.id, (r) => ({ ...r, value: [low, next] }))} label={`Highest ${name}`} placeholder="Max" scale={scale && { ...scale, emptyAt: "max", floor: low ?? scale.min }} />
        </>
      );
    }
    return <NumberPill {...number} value={rule.value as number | null} onValue={(next) => update(rule.id, (r) => ({ ...r, value: next }))} label={said} placeholder="Any" scale={scale && { ...scale, emptyAt: rule.op === "atMost" ? "max" : "min" }} />;
  };

  const spoken = (rule: Rule) => {
    const v = rule.value;
    const words = !isSet(rule)
      ? "anything"
      : rule.op === "between"
        ? (v as readonly (number | null)[]).map((end) => (end === null ? "any" : String(end))).join(" and ")
        : Array.isArray(v)
          ? v.join(", ")
          : String(v);
    return `${fieldOf(rule.field).label} ${OP_WORDS[rule.op]} ${words}`;
  };

  /** Field, condition and value, then the row's count and cross (tail); see ROW for how it lays out. */
  const sentence = (rule: Rule, tail: ReactNode, nested = false) => {
    const field = fieldOf(rule.field);
    return (
      <div className={cn(ROW, nested ? NESTED_AREAS : ROW_AREAS)}>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 [grid-area:head]">
        <DropdownMenu
          label="Field"
          value={rule.field}
          onChange={(key) => {
            const op = OPS[fieldOf(key).kind][0];
            update(rule.id, (r) => ({ ...r, field: key, op, value: emptyFor(op) }));
          }}
          options={fields.map((f) => ({ value: f.key, label: f.label }))}
        />
        <DropdownMenu
          label={`${field.label} condition`}
          prefix={OP_SIGNS[rule.op]}
          value={rule.op}
          onChange={(op) => update(rule.id, (r) => ({ ...r, op, value: convert(r, op) }))}
          options={OPS[field.kind].map((op) => ({ value: op, label: OP_WORDS[op] }))}
        />
        </div>
        {/* A new field brings a new kind of value, which swaps in through a short blur. */}
        <span
          key={`${rule.field}-${rule.op === "between"}`}
          className={cn(
            "flex min-w-0 flex-wrap items-center gap-x-1.5 [grid-area:value] [&>*]:transition-[opacity,filter,translate] [&>*]:duration-150 motion-reduce:[&>*]:transition-none",
            // Chips carry their own space above and below; fields that wrap need the gap between their lines.
            field.kind === "list" ? "gap-y-0" : "gap-y-1.5",
            "[&>*]:ease-[cubic-bezier(0.22,1,0.36,1)] starting:[&>*]:translate-y-1 starting:[&>*]:opacity-0 starting:[&>*]:blur-[2px]",
          )}
        >
          {valueOf(rule)}
        </span>
        {tail}
      </div>
    );
  };

  const ENTER = cn("transition-[opacity,filter,translate] duration-[480ms] motion-reduce:transition-none", SMOOTH, "starting:translate-y-1.5 starting:opacity-0 starting:blur-[6px]");
  const WELL = "rounded-[16px] bg-[var(--fu-card,#1F1F1F)]";
  const add = (rule: Rule, next: (Rule | RuleGroup)[]) => {
    setFocusNext(rule.id);
    setItems(next);
  };

  return (
    <div ref={box} role="group" aria-label={label} aria-disabled={disabled || undefined} className={cn("@container/rules w-full", className)}>
      {/* An error stands where the rows were, lined up with the rows' fields. */}
      <StatusFrame status={status} onRetry={onRetry} errorText={errorText} disabled={disabled} className={cn(status === "error" && "ps-11")}>
      <ol className="flex flex-col gap-2.5">
        {value.items.map((item, i) => {
          const rail = <Rail at={i} of={value.items.length} join={value.join} onToggle={() => onChange({ ...value, join: value.join === "and" ? "or" : "and" })} />;
          const leftWords = `${countLabel(after[i])} left`;
          if (!isGroup(item)) {
            return (
              <li key={item.id} data-flip={item.id} className={cn("flex", ENTER)}>
                {rail}
                <div role="group" aria-label={`Rule ${i + 1}: ${spoken(item)}. ${leftWords}`} data-rule={item.id} className={cn("@container/well min-w-0 flex-1 p-1.5 @min-[440px]/well:ps-2", WELL, DOOMED_RULE)}>
                  {sentence(
                    item,
                    <>
                      <Left count={after[i]} word={leftLabel} format={formatCount} className="[grid-area:left] me-1 mt-2" />
                      <IconButton size="sm" data-remove="rule" label={`Remove rule ${i + 1}`} onClick={() => remove(item.id)} className="h-9 w-8 [grid-area:x]">
                        <XIcon size={16} />
                      </IconButton>
                    </>,
                  )}
                </div>
              </li>
            );
          }
          const word = item.join === "and" ? "All of these" : "Any of these";
          return (
            <li key={item.id} data-flip={item.id} className={cn("flex", ENTER)}>
              {rail}
              <div role="group" aria-label={`Group ${i + 1}, ${word.toLowerCase()}. ${leftWords}`} className={cn("@container/well min-w-0 flex-1 p-1.5", WELL, DOOMED_GROUP)}>
                <div className="flex min-h-9 items-center gap-2 ps-2.5">
                  <TextSwap className="me-auto text-[13px] leading-5 text-[var(--fu-mute,#BDBDBD)]">{word}</TextSwap>
                  <Left count={after[i]} word={leftLabel} format={formatCount} className="me-1" />
                  <IconButton size="sm" data-remove="group" label={`Remove group ${i + 1}`} onClick={() => remove(item.id)} className="h-9 w-8">
                    <XIcon size={16} />
                  </IconButton>
                </div>
                <ol className="mt-1 flex flex-col gap-2.5">
                  {item.rules.map((rule, j) => (
                    <li key={rule.id} data-flip={rule.id} className={cn("flex", ENTER)}>
                      <Rail nested at={j} of={item.rules.length} join={item.join} onToggle={() => setItems(value.items.map((other) => (other.id === item.id && isGroup(other) ? { ...other, join: other.join === "and" ? "or" : "and" } : other)))} />
                      <div role="group" aria-label={spoken(rule)} data-rule={rule.id} className={cn("min-w-0 flex-1", DOOMED_NESTED)}>
                        {sentence(
                          rule,
                          <IconButton size="sm" data-remove="rule" label={`Remove ${fieldOf(rule.field).label.toLowerCase()} from group ${i + 1}`} onClick={() => remove(rule.id)} className="h-9 w-8 [grid-area:x]">
                            <XIcon size={16} />
                          </IconButton>,
                          true,
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                {/* Adding cannot run while disabled, so the add buttons are left out; focus on one moves to the frame. */}
                {!disabled && (
                  <Button
                    variant="quiet-accent"
                    size="sm"
                    before={<PlusIcon />}
                    onClick={() => {
                      const rule = newRule(fields, used);
                      add(rule, value.items.map((other) => (other.id === item.id && isGroup(other) ? { ...other, rules: [...other.rules, rule] } : other)));
                    }}
                    className="mt-1.5 ms-7"
                  >
                    Add condition
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {!disabled && (
        <div className="mt-3 flex flex-wrap items-center gap-1 ps-11">
          <Button
            data-add=""
            variant="secondary"
            size="sm"
            before={<PlusIcon />}
            onClick={() => {
              const rule = newRule(fields, used);
              add(rule, [...value.items, rule]);
            }}
          >
            Add rule
          </Button>
          <Button
            variant="quiet"
            size="sm"
            before={<ListTreeIcon className="rtl:-scale-x-100" />}
            onClick={() => {
              const rule = newRule(fields, used);
              add(rule, [...value.items, { id: newId(), join: value.join === "and" ? "or" : "and", rules: [rule] }]);
            }}
          >
            Add group
          </Button>
        </div>
      )}
      </StatusFrame>
      <p aria-live="polite" className="sr-only">
        {status === "ready" ? countLabel(total) : ""}
      </p>
    </div>
  );
}
