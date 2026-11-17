"use client";

import { useEffect, useId, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { formatsFor, resultsLabel } from "../lib/format";
import { SCROLL } from "../lib/scroll";
import { CountPill } from "../ui/count-pill";
import { CheckIcon, SearchIcon } from "../ui/icons";
import { placeholderLabels, SkeletonText, useLoading } from "../ui/skeleton";
import { StatusFrame, type StateProps } from "../ui/status-frame";
import { TextField } from "../ui/text-field";

export type SearchableListChild = {
  value: string;
  label: string;
  count: number;
};

export type SearchableListOption = SearchableListChild & {
  /** Shown indented under the option once it is ticked. Values need only be unique within their parent. */
  children?: readonly SearchableListChild[];
};

/** One ticked option and the children that narrow it. No children means the whole option. */
export type SearchableListPick = {
  value: string;
  children: string[];
};

export type SearchableListProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> &
  StateProps & {
  /** In display order: the first `collapsedCount` make the short list, the rest show after "All N". */
  options: readonly SearchableListOption[];
  value: readonly SearchableListPick[];
  onChange: (value: SearchableListPick[]) => void;
  /** Accessible name of the list. */
  label: string;
  /** Plural noun for the options: "Search makes", "All 21 makes", "No makes match". */
  noun?: string;
  collapsedCount?: number;
  formatCount?: (n: number) => string;
  /** Screen-reader words for a count: "6 results". */
  countLabel?: (n: number) => string;
  /** Formats the counts and their spoken words by default, e.g. "de-DE". Default "en-US". */
  locale?: string;
  /**
   * "card" (default): the look inside a FilterCard. "panel": a 48px search, 20px filled checkboxes, 17px names, counts as
   * plain numbers and rows flush with the field, as in the Filter panel block. The list grows in place for its scrolling
   * parent rather than scrolling in a box of its own.
   */
  variant?: "card" | "panel";
};

const ROW_HEIGHT = 36;
const SMOOTH = "ease-[cubic-bezier(0.22,1,0.36,1)]";

// Swapped letters count as one slip, so "telsa" is one edit from "tesla".
function editDistance(a: string, b: string) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[a.length][b.length];
}

/** The closest name with results, for a word of 4+ letters: one slip allowed, two past 5 letters. On a tie the longer name wins. */
function nearestName(typed: string, options: readonly SearchableListOption[]) {
  if (typed.length < 4) return null;
  const allowed = typed.length > 5 ? 2 : 1;
  // Names further apart in length than the slips allowed cannot match, so a long paste costs nothing.
  const names = options
    .flatMap((o) => [o, ...(o.children ?? [])])
    .filter((o) => o.count > 0 && Math.abs(o.label.length - typed.length) <= allowed);
  const [best] = names
    .map((o) => ({ name: o.label, edits: editDistance(typed, o.label.toLowerCase()) }))
    .filter((o) => o.edits <= allowed)
    .sort((a, b) => a.edits - b.edits || b.name.length - a.name.length);
  return best?.name ?? null;
}

// Names in the panel look are already semibold, so there the letters around the match dim instead.
function Marked({ text, query, panel = false }: { text: string; query: string; panel?: boolean }) {
  const at = query ? text.toLowerCase().indexOf(query) : -1;
  if (at < 0) return <>{text}</>;
  if (panel) {
    const dim = "text-[var(--fu-dim,#929292)]";
    return (
      <>
        <span className={dim}>{text.slice(0, at)}</span>
        {text.slice(at, at + query.length)}
        <span className={dim}>{text.slice(at + query.length)}</span>
      </>
    );
  }
  return (
    <>
      {text.slice(0, at)}
      <b className="font-semibold">{text.slice(at, at + query.length)}</b>
      {text.slice(at + query.length)}
    </>
  );
}

/** Opens and closes with the card's own motion: height over 480ms, content in from a 6px blur, 6px lower. */
function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      inert={!open}
      data-state={open ? "open" : "closed"}
      className={cn(
        "group/reveal grid grid-rows-[0fr] transition-[grid-template-rows] duration-[480ms] motion-reduce:transition-none",
        SMOOTH,
        "data-[state=open]:grid-rows-[1fr]",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn(
            "translate-y-1.5 opacity-0 blur-[6px] transition-[opacity,filter,translate] duration-[480ms] motion-reduce:transition-none",
            SMOOTH,
            "group-data-[state=open]/reveal:translate-y-0 group-data-[state=open]/reveal:opacity-100 group-data-[state=open]/reveal:blur-none",
            "group-data-[state=open]/reveal:delay-[120ms] group-data-[state=open]/reveal:duration-[460ms] group-data-[state=open]/reveal:ease-[cubic-bezier(0.16,1,0.3,1)]",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

type RowProps = {
  label: string;
  query: string;
  count: number;
  checked: boolean;
  disabled: boolean;
  nested?: boolean;
  panel: boolean;
  formatCount: (n: number) => string;
  countLabel: (n: number) => string;
  onToggle: (input: HTMLInputElement) => void;
  onBlur: () => void;
};

// The whole row is the checkbox's label. A long name wraps onto more lines; the box and the count stay in the row. The native box is hidden and drawn again: 18px, 5px radius, the tile's selected fill with an accent check that draws in.
// The panel look draws it 20px with 6px corners, filled with the accent and an --fu-on-accent check once ticked.
function Row({ label, query, count, checked, disabled, nested, panel, formatCount, countLabel, onToggle, onBlur }: RowProps) {
  const { loading } = useLoading();
  return (
    <label
      data-state={checked ? "on" : "off"}
      className={cn(
        "group/row relative flex min-h-9 min-w-0 cursor-pointer items-center gap-2.5 rounded-[12px] py-2 pe-3 text-[14px] leading-5 text-[var(--fu-text,#F8F5F1)]",
        nested ? "ps-[40px]" : "ps-3",
        // 17px names on a 24px line, 6px above and below: 36px, as the card look's 20px line with 8px.
        panel && "rounded-[10px] py-1.5 pe-2 text-[17px] leading-6 font-semibold pointer-coarse:min-h-11",
        panel && (nested ? "ps-[38px]" : "ps-2"),
        "transition-[background-color,opacity] duration-200 motion-reduce:transition-none",
        "[@media(hover:hover)]:has-[input:enabled]:hover:bg-[var(--fu-wash,rgb(255_255_255/0.08))]",
        // Drawn inside the row, so neither the scroll area nor the card can clip it.
        "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-solid has-[input:focus-visible]:outline-[var(--fu-accent-soft,#8FAAFF)]",
        "has-[input:disabled]:cursor-default",
        count === 0 && !checked && !loading && "opacity-40",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={`${label}, ${countLabel(count)}`}
        onChange={(event) => onToggle(event.currentTarget)}
        onBlur={onBlur}
        className={cn("peer absolute size-[18px] cursor-[inherit] opacity-0", panel && "size-5")}
      />
      <span
        aria-hidden="true"
        className={cn(
          "grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-[var(--fu-control-border,#737373)] text-[var(--fu-accent-soft,#8FAAFF)]",
          "transition-[background-color,border-color] duration-200 motion-reduce:transition-none",
          SMOOTH,
          "[@media(hover:hover)]:group-hover/row:peer-enabled:border-[var(--fu-control-hover,#A3A3A3)]",
          panel
            ? "size-5 rounded-[6px] border-[1.5px] bg-[var(--fu-field-wash,rgb(255_255_255/0.03))] text-[var(--fu-on-accent,#FFFFFF)] peer-checked:border-[var(--fu-accent,#3B57E6)] peer-checked:bg-[var(--fu-accent,#3B57E6)] [@media(hover:hover)]:group-hover/row:peer-checked:border-[var(--fu-accent,#3B57E6)]"
            : "peer-checked:border-[var(--fu-accent-soft,#8FAAFF)] peer-checked:bg-[var(--fu-selected,#1F2747)] [@media(hover:hover)]:group-hover/row:peer-checked:border-[var(--fu-accent-soft,#8FAAFF)]",
        )}
      >
        <CheckIcon
          size={14}
          strokeWidth={3}
          className={cn(
            // The path is about 23 units long; a negative offset draws it from the short leg up.
            "[&_path]:[stroke-dasharray:23] [&_path]:[stroke-dashoffset:-23] [&_path]:transition-[stroke-dashoffset] [&_path]:duration-200 motion-reduce:[&_path]:transition-none",
            "[&_path]:ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[state=on]/row:[&_path]:[stroke-dashoffset:0]",
          )}
        />
      </span>
      <span aria-hidden="true" className="min-w-0 flex-1 [overflow-wrap:anywhere]">
        <SkeletonText>
          <Marked text={label} query={query} panel={panel} />
        </SkeletonText>
      </span>
      {panel ? (
        <span aria-hidden="true" className="shrink-0 font-normal tabular-nums text-[var(--fu-mute,#BDBDBD)]">
          <SkeletonText>{formatCount(count)}</SkeletonText>
        </span>
      ) : (
        <CountPill aria-hidden="true" variant="square" on={checked} count={count} format={formatCount} />
      )}
    </label>
  );
}

/**
 * A search field over a checklist whose options open their own children when ticked, e.g. makes and their models.
 * The short list shows the first `collapsedCount` options and grows with what is ticked; "All N" adds the rest inside a
 * scroll area capped at 320px. Typing filters options and children at once, holding the short list's height so the card
 * does not jump per key; a typo with no match offers the nearest name.
 */
export function SearchableList({
  options,
  value,
  onChange,
  label,
  noun = "items",
  collapsedCount = 8,
  formatCount: formatCountProp,
  countLabel: countLabelProp,
  locale,
  variant = "card",
  status = "ready",
  onRetry,
  errorText = `Couldn't load the ${noun}.`,
  emptyText = `No ${noun} to show.`,
  disabled = false,
  className,
  ...props
}: SearchableListProps) {
  const formatCount = formatCountProp ?? formatsFor(locale).number;
  const countLabel = countLabelProp ?? ((n: number) => resultsLabel(n, locale));
  const panel = variant === "panel";
  const listId = useId();
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(false);
  const field = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLUListElement>(null);
  const [fade, setFade] = useState({ top: false, bottom: false });

  // A row turned off at 0 would become disabled under the pointer or keyboard and drop focus; it stays enabled until it loses focus.
  const [kept, setKept] = useState<string | null>(null);

  // Ticked options past the short list stay in it while it is short, and do not vanish when unticked there.
  const tickedLater = value.map((p) => p.value).filter((v) => options.findIndex((o) => o.value === v) >= collapsedCount);
  const [pinned, setPinned] = useState<string[]>(tickedLater);
  if (tickedLater.some((v) => !pinned.includes(v))) setPinned([...pinned, ...tickedLater.filter((v) => !pinned.includes(v))]);
  if (value.length === 0 && pinned.length > 0 && !all) setPinned([]);

  const pickOf = (v: string) => value.find((p) => p.value === v);

  const toggleParent = (v: string, input: HTMLInputElement) => {
    const on = Boolean(pickOf(v));
    setKept(on && document.activeElement === input ? v : null);
    onChange(on ? value.filter((p) => p.value !== v) : [...value, { value: v, children: [] }]);
  };

  // Ticking a child ticks its parent too; a child narrows the parent to the children ticked.
  const toggleChild = (parent: string, child: string, input: HTMLInputElement) => {
    const pick = pickOf(parent);
    const on = Boolean(pick?.children.includes(child));
    setKept(on && document.activeElement === input ? `${parent}\n${child}` : null);
    if (!pick) return onChange([...value, { value: parent, children: [child] }]);
    const children = on ? pick.children.filter((c) => c !== child) : [...pick.children, child];
    onChange(value.map((p) => (p.value === parent ? { ...p, children } : p)));
  };

  useEffect(() => {
    const node = scroller.current;
    const inner = content.current;
    if (!node || !inner) return;
    const measure = () => {
      const top = node.scrollTop > 1;
      const bottom = node.scrollTop + node.clientHeight < node.scrollHeight - 1;
      setFade((f) => (f.top === top && f.bottom === bottom ? f : { top, bottom }));
    };
    measure();
    node.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    observer.observe(inner);
    return () => {
      node.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, []);

  // Its own status, or the loading frame of an item around it, such as a block's card.
  const loading = useLoading().loading || status === "loading";
  // While the options are on their way, a short list of stand-ins keeps the place they will take.
  const listed: readonly SearchableListOption[] =
    loading && options.length === 0 ? placeholderLabels(collapsedCount).map((name) => ({ value: name, label: name, count: 0 })) : options;
  const typed = loading ? "" : query.trim().toLowerCase();

  const parentRow = (option: SearchableListOption, q: string) => {
    const checked = Boolean(pickOf(option.value));
    return (
      <Row
        label={option.label}
        query={q}
        count={option.count}
        checked={checked}
        disabled={option.count === 0 && !checked && kept !== option.value}
        panel={panel}
        formatCount={formatCount}
        countLabel={countLabel}
        onToggle={(input) => toggleParent(option.value, input)}
        onBlur={() => kept === option.value && setKept(null)}
      />
    );
  };

  const childRows = (option: SearchableListOption, children: readonly SearchableListChild[], q: string) => {
    const pick = pickOf(option.value);
    return (
      <ul aria-label={option.label} className="m-0 list-none p-0">
        {children.map((child) => {
          const key = `${option.value}\n${child.value}`;
          const checked = Boolean(pick?.children.includes(child.value));
          return (
            <li key={child.value} className="m-0 p-0">
              <Row
                nested
                label={child.label}
                query={q}
                count={child.count}
                checked={checked}
                disabled={child.count === 0 && !checked && kept !== key}
                panel={panel}
                formatCount={formatCount}
                countLabel={countLabel}
                onToggle={(input) => toggleChild(option.value, child.value, input)}
                onBlur={() => kept === key && setKept(null)}
              />
            </li>
          );
        })}
      </ul>
    );
  };

  let rows: ReactNode;
  let found = 0;
  if (typed) {
    const matches = options.flatMap((option) => {
      const children = option.children ?? [];
      const self = option.label.toLowerCase().includes(typed);
      const kids = children.filter((c) => c.label.toLowerCase().includes(typed));
      return self || kids.length ? [{ option, self, kids }] : [];
    });
    found = matches.length;
    rows = matches.map(({ option, self, kids }) => {
      const checked = Boolean(pickOf(option.value));
      const showAll = !kids.length || (checked && self);
      return (
        <li key={option.value} className="m-0 p-0">
          {parentRow(option, typed)}
          {(option.children?.length ?? 0) > 0 && (
            <Reveal open={checked || kids.length > 0}>{childRows(option, showAll ? option.children! : kids, typed)}</Reveal>
          )}
        </li>
      );
    });
  } else {
    rows = listed.map((option, i) => {
      const item = (
        <>
          {parentRow(option, "")}
          {(option.children?.length ?? 0) > 0 && <Reveal open={Boolean(pickOf(option.value))}>{childRows(option, option.children!, "")}</Reveal>}
        </>
      );
      return (
        <li key={option.value} className="m-0 p-0">
          {i < collapsedCount ? item : <Reveal open={all || pinned.includes(option.value)}>{item}</Reveal>}
        </li>
      );
    });
  }

  const near = typed && found === 0 ? nearestName(typed, options) : null;
  const more = listed.length > collapsedCount;

  return (
    <div className={cn("min-w-0", className)} {...props}>
      <StatusFrame
        status={status}
        onRetry={onRetry}
        errorText={errorText}
        empty={options.length === 0}
        emptyText={emptyText}
        disabled={disabled}
        className={cn(panel && "rounded-[14px]")}
      >
        <div ref={field}>
          <TextField
            type="search"
            value={query}
            onChange={setQuery}
            label={`Search ${noun}`}
            placeholder={`Search ${noun}`}
            prefix={<SearchIcon size={panel ? 20 : 16} className="block" />}
            clearLabel="Clear search"
            autoComplete="off"
            spellCheck={false}
            className={panel ? "h-12 gap-3 bg-[var(--fu-field-wash,rgb(255_255_255/0.03))] px-3.5 text-[17px]" : undefined}
            inputClassName="[&::-webkit-search-cancel-button]:appearance-none"
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.stopPropagation();
                event.preventDefault();
                setQuery("");
              }
            }}
          />
        </div>

        {/* In the panel look the list reaches 8px past the field on each side, so boxes and counts line up with its edges.
            The panel scrolls the whole list itself, so there the list neither scrolls in its own box nor holds its height while typing. */}
        <div className={cn("relative mt-2", panel && "-mx-2")}>
          <div
            ref={scroller}
            id={listId}
            className={cn(
              all && !panel && ["max-h-80 scroll-py-7 overflow-y-auto overscroll-contain", SCROLL],
            )}
            style={typed && !panel ? { minHeight: collapsedCount * ROW_HEIGHT } : undefined}
          >
            <ul ref={content} aria-label={label} className="m-0 list-none p-0">
              {rows}
            </ul>
          </div>
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-6 bg-linear-to-b from-[var(--fu-card,#1F1F1F)] to-transparent opacity-0 transition-opacity duration-200 motion-reduce:transition-none",
              fade.top && "opacity-100",
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-[var(--fu-card,#1F1F1F)] to-transparent opacity-0 transition-opacity duration-200 motion-reduce:transition-none",
              fade.bottom && "opacity-100",
            )}
          />
        </div>

        <div role="status" className={cn("text-[14px] leading-5", panel && "text-[15px]")}>
          {typed && found === 0 && (
            <div className={cn("px-3 pt-1 pb-1.5", panel && "px-0")}>
              <p className="flex min-w-0 text-[var(--fu-mute,#BDBDBD)]">
                <span className="shrink-0">No {noun} match&nbsp;</span>
                <span className="min-w-0 truncate text-[var(--fu-text,#F8F5F1)]">“{query.trim()}</span>
                <span className="shrink-0 text-[var(--fu-text,#F8F5F1)]">”</span>
              </p>
              {near && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery(near);
                    field.current?.querySelector("input")?.focus();
                  }}
                  className={cn(
                    "relative mt-1 cursor-pointer rounded-[6px] font-medium text-[var(--fu-accent-soft,#8FAAFF)] before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']",
                    "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
                  )}
                >
                  Did you mean {near}?
                </button>
              )}
            </div>
          )}
        </div>

        {!typed && more && (
          <button
            type="button"
            aria-expanded={all}
            aria-controls={listId}
            onClick={() => {
              if (all) setPinned(tickedLater);
              setAll(!all);
            }}
            className={cn(
              "group/more relative mt-1.5 ms-3 cursor-pointer rounded-[6px] text-[14px] leading-5 font-medium text-[var(--fu-accent-soft,#8FAAFF)] transition-[color] duration-200 hover:text-[var(--fu-accent-pale,#D1DDFF)] before:absolute before:-inset-x-1 before:-inset-y-2 before:content-['']",
              "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
              panel && "mt-2 ms-0 text-[15px] pointer-coarse:before:-inset-y-3",
            )}
          >
            {/* A 1px line draws in under the words from the start edge while it is hovered or focused. */}
            <span
              className={cn(
                "bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] rtl:bg-[position:100%_100%] bg-no-repeat pb-px",
                "transition-[background-size] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                "[@media(hover:hover)]:group-hover/more:bg-[length:100%_1px] group-focus-visible/more:bg-[length:100%_1px]",
              )}
            >
              <SkeletonText>{all ? "Show fewer" : `All ${formatCount(listed.length)} ${noun}`}</SkeletonText>
            </span>
          </button>
        )}
      </StatusFrame>
    </div>
  );
}
