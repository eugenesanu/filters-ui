"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { Button, IconButton } from "../ui/button";
import { DropdownMenu } from "../ui/dropdown-menu";
import { ListTreeIcon, PlusIcon, XIcon } from "../ui/icons";
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

export type RulesProps<Item> = {
  fields: readonly RuleField<Item>[];
  /** Every item, for the counts. */
  items: readonly Item[];
  value: RuleSet;
  onChange: (value: RuleSet) => void;
  /** Accessible name of the whole set. */
  label?: string;
  /** Words for a count: "34 cars". */
  countLabel?: (n: number) => string;
  /** Caption over the column of counts, e.g. "Cars left". */
  leftLabel?: string;
  formatCount?: (n: number) => string;
  className?: string;
};

const SMOOTH = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const integer = new Intl.NumberFormat("en-US");
const defaultFormat = (n: number) => integer.format(n);
const defaultCountLabel = (n: number) => (n === 1 ? "1 result" : `${integer.format(n)} results`);
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
let made = 0;
const newId = () => `rule-${Date.now().toString(36)}-${(made += 1)}`;

export const defaultParse = (text: string) => {
  const typed = text.trim().toLowerCase().replace(/[$,\s]/g, "").replace(/[a-z]+$/, (unit) => (unit === "k" || unit === "m" ? unit : ""));
  const match = typed.match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if (!match) return null;
  return Math.round(Number(match[1]) * (match[2] === "k" ? 1e3 : match[2] === "m" ? 1e6 : 1));
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

/** A number typed into a pill that grows with it. It applies while typed and tidies itself on leaving: "45k" becomes "45,000". */
function NumberPill({
  value,
  onValue,
  label,
  prefix,
  placeholder,
  format,
  parse,
}: {
  value: number | null;
  onValue: (value: number | null) => void;
  label: string;
  prefix?: string;
  placeholder: string;
  format: (n: number) => string;
  parse: (text: string) => number | null;
}) {
  const shown = value === null ? "" : format(value);
  const [draft, setDraft] = useState(shown);
  const [editing, setEditing] = useState(false);
  if (!editing && draft !== shown) setDraft(shown);
  return (
    <label className={PILL}>
      {prefix && (
        <span aria-hidden="true" className="text-[var(--fu-mute,#BDBDBD)]">
          {prefix}
        </span>
      )}
      <input
        value={draft}
        aria-label={label}
        placeholder={placeholder}
        inputMode="decimal"
        autoComplete="off"
        size={Math.max(3, (draft || placeholder).length)}
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
        className="min-w-0 bg-transparent font-[inherit] font-medium text-[var(--fu-text,#F8F5F1)] tabular-nums outline-none placeholder:font-normal placeholder:text-[var(--fu-mute,#BDBDBD)]"
      />
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
}: {
  value: readonly string[];
  onValue: (value: string[]) => void;
  options: readonly string[];
  counts: ReadonlyMap<string, number>;
  label: string;
}) {
  return (
    <>
      {value.map((name) => (
        <button
          key={name}
          type="button"
          aria-label={`Remove ${name}`}
          onClick={() => onValue(value.filter((v) => v !== name))}
          className={cn(
            "relative flex h-[26px] max-w-full cursor-pointer items-center gap-1 rounded-full border border-[var(--fu-selected,#1F2747)] bg-[var(--fu-selected,#1F2747)] pr-[7px] pl-[10px]",
            "font-[inherit] text-[14px] leading-5 font-medium text-[var(--fu-accent-pale,#D1DDFF)]",
            "transition-[background-color,color,border-color,opacity,filter,scale] duration-300 motion-reduce:transition-none",
            SMOOTH,
            "starting:scale-[0.82] starting:opacity-0 starting:blur-[3px]",
            "hover:border-[var(--fu-accent-soft,#8FAAFF)] active:scale-[0.97]",
            "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
            "pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-[9px] pointer-coarse:after:content-['']",
          )}
        >
          <span className="truncate">{name}</span>
          <XIcon size={14} className="shrink-0 text-[var(--fu-accent-soft,#8FAAFF)]" />
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
          hint: integer.format(counts.get(name) ?? 0),
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
  const x = nested ? "left-[17px]" : "left-[21px]";
  const mid = nested ? "top-[18px]" : "top-6";
  const word = join === "and" ? "And" : "Or";
  return (
    <div className={cn("relative shrink-0 self-stretch", nested ? "w-[38px]" : "w-11")}>
      {of > 1 && at === 0 && <span aria-hidden="true" className={cn(line, x, mid, "right-0 -bottom-2.5 rounded-tl-[10px] border-t border-l")} />}
      {of > 1 && at > 0 && at < of - 1 && (
        <>
          <span aria-hidden="true" className={cn(line, x, "-top-px -bottom-2.5 border-l")} />
          <span aria-hidden="true" className={cn(line, x, mid, "right-0 border-t")} />
        </>
      )}
      {of > 1 && at === of - 1 && (
        <span aria-hidden="true" className={cn(line, x, "-top-px right-0 rounded-bl-[10px] border-b border-l", nested ? "h-[19px]" : "h-[25px]")} />
      )}
      {at > 0 && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${word}, switch to ${join === "and" ? "Or" : "And"}`}
          className={cn(
            "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full px-2 font-[inherit] text-[12px] leading-[22px] font-medium",
            mid,
            nested ? "left-[17.5px]" : "left-[21.5px]",
            "bg-[var(--fu-selected,#1F2747)] text-[var(--fu-accent-pale,#D1DDFF)]",
            "transition-[box-shadow] duration-200 motion-reduce:transition-none hover:shadow-[inset_0_0_0_1px_var(--fu-accent-soft,#8FAAFF)]",
            "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
            "pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-[11px] pointer-coarse:after:content-['']",
          )}
        >
          {/* A switched word rises in, one stop after another down the rail. */}
          <span
            key={join}
            style={{ transitionDelay: `${(at - 1) * 70}ms` }}
            className={cn("block transition-[opacity,filter,translate] duration-300 motion-reduce:transition-none starting:translate-y-1 starting:opacity-0 starting:blur-[2px]", SMOOTH)}
          >
            {word}
          </span>
        </button>
      )}
    </div>
  );
}

/** Items left once a row applies: the number over a short hairline bar measured against every item. */
function Left({ count, total, format, className }: { count: number; total: number; format: (n: number) => string; className?: string }) {
  const share = total ? count / total : 0;
  return (
    <div aria-hidden="true" className={cn("flex w-12 shrink-0 flex-col items-end gap-1.5", className)}>
      <span className="relative order-2 h-[3px] w-10 overflow-hidden rounded-full bg-[var(--fu-hover,#333333)]">
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full bg-[var(--fu-accent-soft,#8FAAFF)] transition-[width] duration-[480ms] motion-reduce:transition-none", SMOOTH)}
          style={{ width: `${share > 0 ? Math.max(6, share * 100) : 0}%` }}
        />
      </span>
      <TextSwap className="shrink-0 text-[15px] leading-5 font-medium text-[var(--fu-text,#F8F5F1)] tabular-nums">{format(count)}</TextSwap>
    </div>
  );
}

// Wide, a row is one line: field and condition, the value, then the count and the cross. Narrow, field and condition share
// the first line with the count (a row in a group has none, so they take the whole line), and the value takes the second
// with the cross.
const ROW = cn(
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5",
  "@min-[440px]/well:grid-cols-[auto_minmax(0,1fr)_auto_auto] @min-[440px]/well:[grid-template-areas:'head_value_left_x']",
);
const ROW_AREAS = "[grid-template-areas:'head_left'_'value_x']";
const NESTED_AREAS = "[grid-template-areas:'head_head'_'value_x']";

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
  countLabel = defaultCountLabel,
  leftLabel = "Left",
  formatCount = defaultFormat,
  className,
}: RulesProps<Item>) {
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
        <NamesPills value={rule.value as readonly string[]} onValue={(next) => update(rule.id, (r) => ({ ...r, value: next }))} options={field.options} counts={counts} label={said} />
      );
    }
    if (field.kind === "step") {
      const format = field.format ?? String;
      return (
        <DropdownMenu
          label={said}
          value={rule.value === null ? "" : String(rule.value)}
          onChange={(next) => update(rule.id, (r) => ({ ...r, value: next === "" ? null : Number(next) }))}
          options={[{ value: "", label: "Any" }, ...field.steps.map((step) => ({ value: String(step), label: format(step) }))]}
        />
      );
    }
    const number = { format: field.format ?? defaultFormat, parse: field.parse ?? defaultParse, ...(field.prefix && { prefix: field.prefix }) };
    if (rule.op === "between") {
      const [low, high] = rule.value as readonly [number | null, number | null];
      return (
        <>
          <NumberPill {...number} value={low} onValue={(next) => update(rule.id, (r) => ({ ...r, value: [next, high] }))} label={`Lowest ${name}`} placeholder="Min" />
          <span className="text-[14px] leading-5 text-[var(--fu-dim,#929292)]">and</span>
          <NumberPill {...number} value={high} onValue={(next) => update(rule.id, (r) => ({ ...r, value: [low, next] }))} label={`Highest ${name}`} placeholder="Max" />
        </>
      );
    }
    return <NumberPill {...number} value={rule.value as number | null} onValue={(next) => update(rule.id, (r) => ({ ...r, value: next }))} label={said} placeholder="Any" />;
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
            "flex min-w-0 flex-wrap items-center gap-1.5 [grid-area:value] [&>*]:transition-[opacity,filter,translate] [&>*]:duration-150 motion-reduce:[&>*]:transition-none",
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
    <div ref={box} role="group" aria-label={label} className={cn("@container/rules w-full", className)}>
      <p aria-hidden="true" className="hidden pr-[44px] pb-2 text-right text-[12px] leading-4 text-[var(--fu-dim,#929292)] @min-[484px]/rules:block">
        {leftLabel}
      </p>
      <ol className="flex flex-col gap-2.5">
        {value.items.map((item, i) => {
          const rail = <Rail at={i} of={value.items.length} join={value.join} onToggle={() => onChange({ ...value, join: value.join === "and" ? "or" : "and" })} />;
          const leftWords = `${countLabel(after[i])} left`;
          if (!isGroup(item)) {
            return (
              <li key={item.id} data-flip={item.id} className={cn("flex", ENTER)}>
                {rail}
                <div role="group" aria-label={`Rule ${i + 1}: ${spoken(item)}. ${leftWords}`} data-rule={item.id} className={cn("@container/well min-w-0 flex-1 p-1.5 @min-[440px]/well:pl-2", WELL)}>
                  {sentence(
                    item,
                    <>
                      <Left count={after[i]} total={items.length} format={formatCount} className="[grid-area:left]" />
                      <IconButton size="sm" label={`Remove rule ${i + 1}`} onClick={() => remove(item.id)} className="h-9 w-8 [grid-area:x]">
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
              <div role="group" aria-label={`Group ${i + 1}, ${word.toLowerCase()}. ${leftWords}`} className={cn("@container/well min-w-0 flex-1 p-1.5", WELL)}>
                <div className="flex min-h-9 items-center gap-2 pl-2.5">
                  <TextSwap className="mr-auto text-[13px] leading-5 text-[var(--fu-mute,#BDBDBD)]">{word}</TextSwap>
                  <Left count={after[i]} total={items.length} format={formatCount} />
                  <IconButton size="sm" label={`Remove group ${i + 1}`} onClick={() => remove(item.id)} className="h-9 w-8">
                    <XIcon size={16} />
                  </IconButton>
                </div>
                <ol className="mt-1 flex flex-col gap-2.5">
                  {item.rules.map((rule, j) => (
                    <li key={rule.id} data-flip={rule.id} className={cn("flex", ENTER)}>
                      <Rail nested at={j} of={item.rules.length} join={item.join} onToggle={() => setItems(value.items.map((other) => (other.id === item.id && isGroup(other) ? { ...other, join: other.join === "and" ? "or" : "and" } : other)))} />
                      <div role="group" aria-label={spoken(rule)} data-rule={rule.id} className="min-w-0 flex-1">
                        {sentence(
                          rule,
                          <IconButton size="sm" label={`Remove ${fieldOf(rule.field).label.toLowerCase()} from group ${i + 1}`} onClick={() => remove(rule.id)} className="h-9 w-8 [grid-area:x]">
                            <XIcon size={16} />
                          </IconButton>,
                          true,
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                <Button
                  variant="quiet-accent"
                  size="sm"
                  before={<PlusIcon />}
                  onClick={() => {
                    const rule = newRule(fields, used);
                    add(rule, value.items.map((other) => (other.id === item.id && isGroup(other) ? { ...other, rules: [...other.rules, rule] } : other)));
                  }}
                  className="mt-1.5 ml-7"
                >
                  Add condition
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-1 pl-11">
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
          before={<ListTreeIcon />}
          onClick={() => {
            const rule = newRule(fields, used);
            add(rule, [...value.items, { id: newId(), join: value.join === "and" ? "or" : "and", rules: [rule] }]);
          }}
        >
          Add group
        </Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {countLabel(total)}
      </p>
    </div>
  );
}
