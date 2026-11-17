"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { resultsLabel } from "../lib/format";
import { SCROLL } from "../lib/scroll";
import { countOf, ghostOf, matchIn, readSentence, suggest, wholeWord, type Correction, type Suggestion, type Vocabulary } from "../lib/sentence";
import { CountPill } from "../ui/count-pill";
import { SearchIcon, XIcon } from "../ui/icons";

/** A row of your own in the list while the box is empty, such as a saved search. */
export type OwnRow<State> = {
  /** Unique on the page: the row element's id. */
  id: string;
  /** Enter, or a press. */
  onSelect: () => void;
  /** Picking it closes the list. */
  closes?: boolean;
  /** Delete or Backspace while it is highlighted. */
  onRemove?: () => void;
  /** The value it sets: its tokens show faintly in the box, and its count at the foot, while it is highlighted. */
  preview?: State;
};

/** Spread on a row's element: its id, role, highlight and press. */
export type OwnRowProps = { id: string; role: "option"; "aria-selected": boolean; onPointerMove: () => void; onClick: () => void };

export type OwnRows<State> = {
  rows: readonly OwnRow<State>[];
  /** Draws the rows; spread option(row.id) on each row's element. Keep the elements out of positioned wrappers, so the highlight can find them. */
  render: (option: (id: string) => OwnRowProps) => ReactNode;
  /** Shown in place of the suggestions; otherwise above them. */
  replace?: boolean;
  /** Key hints for the foot of the list while these rows show. */
  keys?: readonly { key: string; label: string }[];
};

export type SentenceSearchProps<Item, State> = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
  /** The words it knows: names, phrases and how each one changes the value. */
  vocabulary: Vocabulary<Item, State>;
  /** Every item, for the counts. */
  items: readonly Item[];
  value: State;
  onChange: (value: State) => void;
  /** Accessible name of the field. */
  label?: string;
  /** Shown while nothing is set. Defaults to the label. */
  placeholder?: string;
  /** Shown once a token is in the box. */
  addPlaceholder?: string;
  /** The button that reads the whole sentence, shown when the box is 480px or wider. */
  submitLabel?: string;
  formatCount?: (n: number) => string;
  /** Screen-reader words for the result count and each suggestion's count: "6 results". */
  countLabel?: (n: number) => string;
  /** Formats the counts and their words by default, e.g. "de-DE". Default "en-US". */
  locale?: string;
  /** Text in the field on first render. */
  defaultText?: string;
  /** Suggestions open on first render. */
  defaultOpen?: boolean;
  /** The row highlighted on first render, by position, e.g. for a still picture of an open list. */
  defaultHighlight?: number;
  /** Focus the field on first render. */
  autoFocus?: boolean;
  /** Controlled open state of the list, with onOpenChange. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Rows of your own while the box is empty, such as recent searches: in place of the suggestions, or above them. */
  emptyRows?: OwnRows<State>;
};

const SMOOTH = "ease-[cubic-bezier(0.22,1,0.36,1)]";
/** A 44px tap area on touch screens around a smaller drawn control. */
const TAP = "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-[4px] pointer-coarse:after:rounded-[inherit]";
const quote = (words: readonly string[]) => words.map((word) => `“${word}”`).join(", ");

function Label({ label, typed }: { label: string; typed: string }) {
  const hit = matchIn(label, typed);
  if (!hit) return <span className="min-w-0 truncate text-[var(--fu-text,#F8F5F1)]">{label}</span>;
  return (
    <span className="min-w-0 truncate text-[var(--fu-dim,#929292)]">
      {label.slice(0, hit.at)}
      <span className="font-medium text-[var(--fu-text,#F8F5F1)]">{label.slice(hit.at, hit.at + hit.length)}</span>
      {label.slice(hit.at + hit.length)}
    </span>
  );
}

function Key({ name, children }: { name: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="rounded-[6px] border border-[var(--fu-control-border,#737373)] px-1.5 font-[inherit] text-[12px] leading-[18px] text-[var(--fu-text,#F8F5F1)]">
        {name}
      </kbd>
      {children}
    </span>
  );
}

/**
 * A search field that reads a typed sentence into filters: "blue suv under 30k" becomes three removable tokens.
 * Suggestions under it finish names, offer the next filter and fix misspelt names, each with its count.
 */
export function SentenceSearch<Item, State>({
  vocabulary,
  items,
  value,
  onChange,
  label = "Describe what you want",
  placeholder,
  addPlaceholder = "Add another filter",
  submitLabel = "Search",
  formatCount,
  countLabel: countLabelProp,
  locale,
  defaultText = "",
  defaultOpen = false,
  defaultHighlight,
  autoFocus = false,
  open: openProp,
  onOpenChange,
  emptyRows,
  className,
  onFocus,
  onBlur,
  ...props
}: SentenceSearchProps<Item, State>) {
  const countLabel = countLabelProp ?? ((n: number) => resultsLabel(n, locale));
  const id = useId();
  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const [text, setText] = useState(defaultText);
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = (next: boolean) => {
    setOpenState(next);
    if (next !== open) onOpenChange?.(next);
  };
  // Where the arrow keys or the pointer left the highlight. Until then the best match leads.
  const [moved, setMoved] = useState<number | null>(defaultHighlight ?? null);
  const [order, setOrder] = useState<string[]>([]);
  const [unused, setUnused] = useState<string[]>([]);
  const [fixes, setFixes] = useState<Correction[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  const applied = vocabulary.tokens(value);
  const keys = applied.map((token) => token.key);
  // Tokens stay in the order they were added, which is the order they were thought of.
  const kept = [...order.filter((key) => keys.includes(key)), ...keys.filter((key) => !order.includes(key))];
  if (kept.join("\n") !== order.join("\n")) setOrder(kept);
  const tokens = kept.flatMap((key) => applied.filter((token) => token.key === key));

  const suggested = useMemo(() => suggest(vocabulary, items, text, value), [vocabulary, items, text, value]);
  const count = useMemo(() => countOf(vocabulary, items, value), [vocabulary, items, value]);
  const typing = text.trim().length > 0;
  // Own rows come first; the suggestions follow them, or step aside for them.
  const own = typing ? undefined : emptyRows;
  const ownRows = own?.rows ?? [];
  const lead = ownRows.length;
  const replaced = own?.replace === true;
  const groups = useMemo(() => (replaced ? [] : suggested), [replaced, suggested]);
  const rows = useMemo(() => groups.flatMap((group) => group.rows), [groups]);
  const total = lead + rows.length;
  const active = Math.min(moved ?? (typing && rows.length ? 0 : -1), total - 1);
  const shown = open && (own !== undefined || rows.length > 0);
  const idAt = (index: number) => (index < lead ? ownRows[index].id : optionId(index - lead));
  const ghost = shown ? ghostOf(text, rows[active - lead]) : "";
  const preview = shown && active >= 0 && active < lead ? ownRows[active].preview : undefined;
  const previewTokens = preview !== undefined ? vocabulary.tokens(preview) : [];
  const previewId = preview !== undefined ? ownRows[active].id : "";

  const [mark, setMark] = useState<{ top: number; height: number; slide: boolean } | null>(null);
  const marked = useRef(-1);
  useLayoutEffect(() => {
    const node = shown && active >= 0 ? document.getElementById(idAt(active)) : null;
    if (!node) {
      marked.current = -1;
      setMark(null);
      return;
    }
    const next = { top: node.offsetTop, height: node.offsetHeight, slide: marked.current >= 0 };
    marked.current = active;
    setMark((was) => (was && was.top === next.top && was.height === next.height ? was : next));
  }, [shown, active, rows, ownRows]);

  useEffect(() => {
    if (!autoFocus) return;
    const input = field.current;
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }, [autoFocus]);

  const land = (next: State, left: string[] = [], added: readonly string[] = [], fixed: Correction[] = []) => {
    setOrder([...kept, ...added.filter((key) => !kept.includes(key))]);
    setMoved(null);
    setText("");
    setUnused(left);
    setFixes(fixed);
    onChange(next);
  };

  const pick = (row: Suggestion<State>) => land(row.next, row.left, row.order);

  // Reads the whole sentence, as the Search button does, with misspelt names fixed.
  const submit = () => {
    setOpen(false);
    setMoved(null);
    if (!typing) return;
    const reading = readSentence(vocabulary, items, text, { context: value, fixTypos: true });
    if (reading.tokens.length) {
      land(
        vocabulary.merge(value, reading.value),
        reading.left,
        reading.tokens.map((token) => token.key),
        reading.corrections,
      );
    } else setUnused(reading.left.length ? reading.left : [text.trim()]);
  };

  const type = (next: string) => {
    setMoved(null);
    setOpen(true);
    setUnused([]);
    setFixes([]);
    if (/[\s,]$/.test(next)) {
      const word = next.replace(/[\s,]+$/, "");
      const comma = next.endsWith(",");
      const whole = wholeWord(vocabulary, items, word, value);
      if (whole) return land(whole.next, [], whole.order);
      const best = comma ? suggest(vocabulary, items, word, value).flatMap((group) => group.rows)[0] : undefined;
      if (best) return pick(best);
      if (comma) return setText(`${word} `);
    }
    setText(next);
  };

  const move = (index: number) => {
    setMoved(index);
    document.getElementById(idAt(index))?.scrollIntoView({ block: "nearest" });
  };

  const choose = (row: OwnRow<State>) => {
    setMoved(null);
    if (row.closes) setOpen(false);
    row.onSelect();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const mine = shown && active >= 0 && active < lead ? ownRows[active] : undefined;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (!total) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const from = shown ? active : -1;
      move((Math.max(from, step > 0 ? -1 : 0) + step + total) % total);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (mine) choose(mine);
      else if (shown && rows[active - lead]) pick(rows[active - lead]);
      else submit();
    } else if (event.key === "Tab" && !event.shiftKey && shown && typing && rows[active]) {
      event.preventDefault();
      pick(rows[active]);
    } else if ((event.key === "Delete" || event.key === "Backspace") && !text && mine?.onRemove) {
      event.preventDefault();
      mine.onRemove();
    } else if (event.key === "Escape") {
      setOpen(false);
      setMoved(null);
    } else if (event.key === "Backspace" && !text && tokens.length) {
      event.preventDefault();
      setUnused([]);
      setFixes([]);
      onChange(tokens[tokens.length - 1].clear(value));
    }
  };

  const clearAll = () => {
    land(vocabulary.empty);
    field.current?.focus();
  };

  let index = -1;

  return (
    <div
      ref={root}
      className={cn("relative w-full @container", className)}
      onFocus={(event) => {
        if (event.target !== field.current) setOpen(false);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (root.current?.contains(event.relatedTarget)) return;
        setOpen(false);
        setMoved(null);
      }}
      {...props}
    >
      <div className="relative">
      <div
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault();
            field.current?.focus();
          }
        }}
        className={cn(
          "flex cursor-text items-start gap-2 rounded-[12px] border border-[var(--fu-control-border,#737373)] bg-[var(--fu-search,#2A2A2A)] py-1.5 pe-1.5 ps-3.5",
          "transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none",
          "hover:border-[var(--fu-control-hover,#A3A3A3)] focus-within:border-[var(--fu-accent-soft,#8FAAFF)] focus-within:hover:border-[var(--fu-accent-soft,#8FAAFF)]",
          "focus-within:shadow-[inset_0_0_0_1px_var(--fu-accent-soft,#8FAAFF)]",
        )}
      >
        <span aria-hidden="true" className="pointer-events-none flex h-9 shrink-0 items-center text-[var(--fu-mute,#BDBDBD)]">
          <SearchIcon size={20} />
        </span>
        <ul className="flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-1.5 py-[5px]" onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault();
            field.current?.focus();
          }
        }}>
          {tokens.map((token) => (
            <li key={token.key} className="min-w-0">
              <button
                type="button"
                aria-label={`Remove ${token.label}`}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  setUnused([]);
                  setFixes([]);
                  onChange(token.clear(value));
                  field.current?.focus();
                }}
                className={cn(
                  "relative flex h-[26px] max-w-full cursor-pointer items-center pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-[9px] gap-1 rounded-full border border-[var(--fu-token-edge,#D1DDFF)] bg-[var(--fu-token,#D1DDFF)] pe-[7px] ps-[11px]",
                  "font-[inherit] text-[14px] leading-5 font-medium text-[var(--fu-token-text,#171717)]",
                  "transition-[background-color,color,border-color,opacity,filter,scale] duration-300 motion-reduce:transition-none",
                  SMOOTH,
                  "starting:scale-[0.82] starting:opacity-0 starting:blur-[3px]",
                  "hover:bg-transparent hover:text-[var(--fu-accent-soft,#8FAAFF)] hover:border-[var(--fu-accent-soft,#8FAAFF)] active:scale-[0.97]",
                  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
                )}
              >
                <span className="truncate">{token.label}</span>
                <XIcon size={14} className="shrink-0" />
              </button>
            </li>
          ))}
          <li className="relative h-6 min-w-[140px] flex-1">
            {previewTokens.length > 0 && !tokens.length && (
              // The highlighted row's filters, tried on in the box without moving anything.
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-y-px inset-s-0 -inset-e-2 flex items-center gap-1.5 overflow-hidden [mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)] rtl:[mask-image:linear-gradient(to_left,#000_calc(100%-24px),transparent)]"
              >
                {previewTokens.map((token, i) => (
                  <span
                    key={`${previewId}-${token.key}-${token.label}`}
                    style={{ transitionDelay: `${i * 45}ms` }}
                    className={cn(
                      "flex h-[26px] shrink-0 items-center rounded-full border border-dashed border-[var(--fu-accent-soft,#8FAAFF)] px-[11px] text-[14px] leading-5 font-medium whitespace-nowrap text-[var(--fu-accent-soft,#8FAAFF)]",
                      "transition-[opacity,filter,translate] duration-300 motion-reduce:transition-none",
                      SMOOTH,
                      "starting:-translate-x-1 rtl:starting:translate-x-1 starting:opacity-0 starting:blur-[3px]",
                    )}
                  >
                    {token.label}
                  </span>
                ))}
              </span>
            )}
            {ghost && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden text-[16px] leading-6 whitespace-pre text-[var(--fu-dim,#929292)]"
              >
                <span className="invisible">{text}</span>
                {ghost}
              </span>
            )}
            <input
              ref={field}
              role="combobox"
              aria-label={label}
              aria-expanded={shown}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={shown && active >= 0 ? idAt(active) : undefined}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="search"
              placeholder={tokens.length ? addPlaceholder : previewTokens.length ? "" : (placeholder ?? label)}
              value={text}
              onChange={(event) => type(event.target.value)}
              onFocus={() => setOpen(true)}
              onClick={() => setOpen(true)}
              onKeyDown={onKeyDown}
              className={cn(
                "relative block h-6 w-full min-w-0 bg-transparent font-[inherit] text-[16px] leading-6 text-[var(--fu-text,#F8F5F1)] outline-none placeholder:text-[var(--fu-mute,#BDBDBD)]",
                previewTokens.length > 0 && !tokens.length && "caret-transparent",
              )}
            />
          </li>
        </ul>
        {(typing || tokens.length > 0) && (
          <button
            type="button"
            aria-label="Clear search"
            onPointerDown={(event) => event.preventDefault()}
            onClick={clearAll}
            className={cn(
              TAP,
              "grid size-9 shrink-0 cursor-pointer place-items-center rounded-[10px] text-[var(--fu-mute,#BDBDBD)]",
              "transition-[background-color,color,opacity,scale] duration-200 motion-reduce:transition-none starting:scale-[0.6] starting:opacity-0",
              "hover:bg-[var(--fu-hover,#333333)] hover:text-[var(--fu-text,#F8F5F1)]",
              "outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
            )}
          >
            <XIcon size={20} />
          </button>
        )}
        <button
          type="button"
          onPointerDown={(event) => event.preventDefault()}
          onClick={submit}
          className={cn(
            "hidden h-9 shrink-0 cursor-pointer items-center rounded-[10px] bg-[var(--fu-accent,#3B57E6)] px-3 font-[inherit] text-[14px] leading-5 font-medium text-[var(--fu-on-accent,#FFFFFF)] @min-[480px]:inline-flex",
            "transition-[background-color,scale] duration-200 hover:bg-[var(--fu-accent-hover,#3450D4)] active:scale-[0.97] motion-reduce:transition-none",
            "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
          )}
        >
          {submitLabel}
        </button>
      </div>

      <div
        data-state={shown ? "open" : "closed"}
        className={cn(
          "absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-[16px] border border-[var(--fu-menu-edge,#737373)] bg-[var(--fu-search,#2A2A2A)] shadow-[0_16px_40px_var(--fu-shadow,rgb(0_0_0/0.5))]",
          "origin-top transition-[opacity,translate,visibility] duration-[170ms] motion-reduce:transition-none",
          SMOOTH,
          "data-[state=closed]:invisible data-[state=closed]:translate-y-1.5 data-[state=closed]:opacity-0",
          "data-[state=open]:visible data-[state=open]:translate-y-0 data-[state=open]:opacity-100 data-[state=open]:duration-[260ms]",
        )}
      >
        <div
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          onPointerDown={(event) => event.preventDefault()}
          className={cn("relative max-h-[min(56dvh,440px)] overflow-y-auto overscroll-contain p-1.5", SCROLL)}
        >
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-1.5 top-0 rounded-[12px] bg-[var(--fu-row-hover,rgb(255_255_255/0.1))] motion-reduce:transition-none",
              mark?.slide && "transition-[translate,height] duration-200",
              SMOOTH,
              !mark && "opacity-0",
            )}
            style={mark ? { translate: `0 ${mark.top}px`, height: mark.height } : undefined}
          />
          {own?.render((rowId) => {
            const at = ownRows.findIndex((row) => row.id === rowId);
            return {
              id: rowId,
              role: "option",
              "aria-selected": shown && at >= 0 && at === active,
              onPointerMove: () => at >= 0 && moved !== at && setMoved(at),
              onClick: () => {
                if (at < 0) return;
                field.current?.focus();
                choose(ownRows[at]);
              },
            };
          })}
          {groups.map((group) => (
            <div key={group.title ?? "matches"} role="group" aria-label={group.title ?? "Matches"}>
              {group.title && <p className="px-3 pt-2 pb-1 text-[13px] leading-[18px] text-[var(--fu-mute,#BDBDBD)]">{group.title}</p>}
              {group.rows.map((row) => {
                index += 1;
                const at = index;
                return (
                  <div
                    key={row.key}
                    id={optionId(at)}
                    role="option"
                    aria-selected={shown && at + lead === active}
                    aria-label={`${row.label}${row.hint ? `, ${row.hint}` : ""}, ${countLabel(row.count)}`}
                    onPointerMove={() => moved !== at + lead && setMoved(at + lead)}
                    onClick={() => {
                      pick(row);
                      field.current?.focus();
                    }}
                    className="relative flex h-10 cursor-pointer items-center gap-2.5 rounded-[12px] px-3 text-[15px] leading-[22px]"
                  >
                    {row.swatch && (
                      <span
                        aria-hidden="true"
                        className="size-4 shrink-0 rounded-full border border-[var(--fu-control-border,#737373)]"
                        style={{ background: row.swatch }}
                      />
                    )}
                    <Label label={row.label} typed={text} />{" "}
                    <span aria-hidden="true" className="ms-auto flex shrink-0 items-center gap-2 ps-3">
                      {row.hint && <span className="text-[13px] leading-5 text-[var(--fu-mute,#BDBDBD)]">{row.hint}</span>}{" "}
                      <CountPill count={row.count} locale={locale} {...(formatCount && { format: formatCount })} />
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div
          aria-hidden="true"
          onPointerDown={(event) => event.preventDefault()}
          className="flex h-10 items-center gap-4 border-t border-[var(--fu-line,#404040)] px-3 text-[13px] leading-5 text-[var(--fu-mute,#BDBDBD)]"
        >
          <span className="hidden items-center gap-4 @min-[480px]:flex">
            {own?.keys ? (
              own.keys.map((hint) => (
                <Key key={hint.key} name={hint.key}>
                  {hint.label}
                </Key>
              ))
            ) : (
              <>
                <Key name="↑↓">Move</Key>
                <Key name="Enter">Add</Key>
                {typing ? <Key name="Tab">Complete</Key> : tokens.length > 0 && <Key name="⌫">Remove last</Key>}
              </>
            )}
          </span>
          <span className="ms-auto tabular-nums">{countLabel(preview !== undefined ? countOf(vocabulary, items, preview) : count)}</span>
        </div>
      </div>
      </div>

      <p aria-live="polite" className="text-[13px] leading-5 text-[var(--fu-dim,#929292)]">
        {fixes.length > 0 && <span className="mt-2 block px-4">Read {fixes.map((fix) => `“${fix.word}” as ${fix.name}`).join(", ")}</span>}
        {unused.length > 0 && <span className="mt-2 block px-4">Not used: {quote(unused)}</span>}
      </p>
      <p aria-live="polite" className="sr-only">
        {countLabel(count)}
      </p>
    </div>
  );
}
