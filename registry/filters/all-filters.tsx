"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode, type RefObject, type CSSProperties } from "react";
import { cn } from "../lib/cn";
import { formatsFor } from "../lib/format";
import { useOverflows } from "../lib/overflow";
import { SCROLL } from "../lib/scroll";
import { SEARCH_ART } from "../ui/art-search";
import { EmptyState } from "../ui/empty-state";
import { ShowButton } from "../ui/filters-head";
import { ChevronDownIcon, SearchIcon, XIcon } from "../ui/icons";
import { SkeletonText, useLoading } from "../ui/skeleton";
import { StatusFrame, useFocusKept, type StateProps } from "../ui/status-frame";
import { TextField } from "../ui/text-field";
import { TextSwap } from "../ui/text-swap";

/** One value that is set, drawn as a chip in the list with its own remove. */
export type FilterValue = { key: string; label: string; onRemove: () => void; /** A CSS colour for a small swatch before the label. */ color?: string };

export type FilterEntry = {
  id: string;
  label: string;
  /** One short line under the title, e.g. "Pick one or more." */
  hint?: string;
  /** Other words the find box matches, e.g. ["mileage", "odometer"]. */
  keywords?: readonly string[];
  /** The values that are set. Empty or left out means the filter is unset. */
  values?: readonly FilterValue[];
  /** Clears this filter, from the Clear button beside its title. */
  onClear?: () => void;
  /** The filter itself, shown beside the list. */
  content: ReactNode;
};

export type FilterGroup = { label: string; filters: readonly FilterEntry[] };

export type AllFiltersProps = Omit<HTMLAttributes<HTMLElement>, "title"> &
  Omit<StateProps, "emptyText"> & {
  groups: readonly FilterGroup[];
  /** Default "Filters". */
  title?: string;
  /** Level of the title; the picked filter's title sits one below. Default 2. */
  headingLevel?: 2 | 3;
  /** Controlled picked filter, by id. */
  picked?: string | null;
  defaultPicked?: string | null;
  onPickedChange?: (id: string | null) => void;
  /** Clears every filter, from the "3 set" chip in the head. */
  onClearAll?: () => void;
  /** The head's button, e.g. "Show 34 cars". Default "Done". */
  showLabel?: string;
  onShow?: () => void;
  /** Placeholder and name of the find box. Default "Find a filter". */
  findLabel?: string;
  /** Height of the two columns in px, from 520px wide; each scrolls on its own. Default 560. */
  height?: number;
  /** Formats the "3 set" count, e.g. "ar-EG". Default "en-US". */
  locale?: string;
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const MAX_CHIPS = 3;
/** Below this width the list and the picked filter take turns: a row drills in, Back comes out. */
const NARROW = 520;

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const FOCUS_RING =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]";
/** The first control in the picked filter that Tab stops on. */
const PANE_CONTROL = 'button:not(:disabled):not([tabindex="-1"]), input:not(:disabled):not([tabindex="-1"]), [tabindex="0"]';

const matchesQuery = (entry: FilterEntry, query: string) =>
  !query || entry.label.toLowerCase().includes(query) || (entry.keywords ?? []).some((word) => word.toLowerCase().includes(query));

/** The label with the letters that match the find box in the accent. */
function Marked({ text, query }: { text: string; query: string }) {
  const at = query ? text.toLowerCase().indexOf(query) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent text-[var(--fu-accent-soft,#8FAAFF)]">{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  );
}

/**
 * Every filter in one panel: a list at the start (left, or right in RTL) in groups, each row with its set values as
 * chips, and the picked filter open beside it. The picked row is tinted; the filter's side rises in from a blur.
 * A find box narrows the list. Below 520px wide the list and the filter take turns: a row drills in, Back returns.
 * While loading the list keeps its rows with their values as placeholders and the picked filter draws its own; an
 * error shows its line and Retry in the filter's place, and the list stays; disabled turns the whole panel off but
 * Show, and leaves every Clear and cross out.
 */
export function AllFilters({
  groups,
  title = "Filters",
  headingLevel = 2,
  picked: pickedProp,
  defaultPicked = null,
  onPickedChange,
  onClearAll,
  showLabel = "Done",
  onShow,
  findLabel = "Find a filter",
  height = 560,
  locale,
  status = "ready",
  onRetry,
  errorText,
  disabled = false,
  className,
  ...props
}: AllFiltersProps) {
  const id = useId();
  const findId = `${id}-find`;
  const focusFind = () => document.getElementById(findId)?.focus({ preventScroll: true });
  const root = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const detailBox = useOverflows();
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const [inner, setInner] = useState<string | null>(defaultPicked);
  const picked = pickedProp === undefined ? inner : pickedProp;
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "detail">("list");
  const [narrow, setNarrow] = useState(false);
  const [focusRow, setFocusRow] = useState<string | null>(null);

  const Heading = `h${headingLevel}` as const;
  const PaneHeading = `h${headingLevel + 1}` as "h3" | "h4";
  const q = query.trim().toLowerCase();
  const entries = groups.flatMap((group) => group.filters);
  const visible = entries.filter((entry) => matchesQuery(entry, q));
  const current = entries.find((entry) => entry.id === picked) ?? null;
  const setCount = entries.filter((entry) => (entry.values?.length ?? 0) > 0).length;
  // The one row in the tab order: the picked one while it shows, else the first that shows.
  const tabRow = visible.some((entry) => entry.id === picked) ? picked : (visible[0]?.id ?? null);

  // The picked row shows whole on first paint, clear of the list's bottom fade.
  useLayoutEffect(() => {
    const box = list.current;
    const row = picked ? rows.current.get(picked)?.parentElement : null;
    if (!box || !row) return;
    const at = row.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    const top = at - 8;
    const bottom = at + row.offsetHeight + 40;
    if (bottom > box.scrollTop + box.clientHeight) box.scrollTop = Math.min(top, bottom - box.clientHeight);
    // Only on mount: later picks are made in view.
  }, []);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setNarrow(node.offsetWidth < NARROW));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Focus never scrolls on its own here: a pane still sliding in sits off to the side, and the browser would scroll the
  // panel sideways to reach it. Instead the nearest scrolling box (a dialog's, say) and then the page scroll up or down
  // just enough, the page clear of a sticky header.
  const reveal = (node: HTMLElement | null | undefined) => {
    if (!node) return;
    node.focus({ preventScroll: true });
    const behavior = reducedMotion() ? "auto" : "smooth";
    const box = scrollerOf(node);
    if (box) {
      const inner = node.getBoundingClientRect();
      const outer = box.getBoundingClientRect();
      if (inner.top < outer.top) box.scrollBy({ top: inner.top - outer.top - 8, behavior });
      else if (inner.bottom > outer.bottom) box.scrollBy({ top: inner.bottom - outer.bottom + 8, behavior });
      return;
    }
    const { top, bottom } = node.getBoundingClientRect();
    if (top < 96) window.scrollBy({ top: top - 96, behavior });
    else if (bottom > window.innerHeight - 16) window.scrollBy({ top: bottom - window.innerHeight + 16, behavior });
  };

  const pick = (next: string) => {
    if (pickedProp === undefined) setInner(next);
    onPickedChange?.(next);
    setView("detail");
    if (root.current && root.current.offsetWidth < NARROW) requestAnimationFrame(() => reveal(back.current));
  };

  const goBack = () => {
    setView("list");
    if (picked) requestAnimationFrame(() => reveal(rows.current.get(picked)));
  };

  // A new pick rises in from a 6px blur, as a card's body does.
  const shownId = useRef(picked);
  useLayoutEffect(() => {
    const node = pane.current;
    if (shownId.current === picked) return;
    shownId.current = picked;
    if (!node || reducedMotion()) return;
    const rise = node.animate(
      [
        { opacity: 0, filter: "blur(6px)", translate: "0 6px" },
        { opacity: 1, filter: "blur(0)", translate: "0 0" },
      ],
      { duration: 480, easing: EASE },
    );
    return () => rise.cancel();
  }, [picked]);

  // On a narrow panel the height eases between the list and the filter as they take turns.
  const lastHeight = useRef<number | null>(null);
  useLayoutEffect(() => {
    const node = body.current;
    if (!node) return;
    const to = node.offsetHeight;
    const from = lastHeight.current;
    lastHeight.current = to;
    if (!narrow || from === null || from === to || reducedMotion()) return;
    const ease = node.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 480, easing: EASE });
    return () => ease.cancel();
  }, [view, narrow]);

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, entryId: string) => {
    const at = visible.findIndex((entry) => entry.id === entryId);
    let next: number | null = null;
    if (event.key === "ArrowDown") next = Math.min(at + 1, visible.length - 1);
    else if (event.key === "ArrowUp") {
      if (at === 0) {
        event.preventDefault();
        focusFind();
        return;
      }
      next = at - 1;
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = visible.length - 1;
    if (next === null) return;
    event.preventDefault();
    const target = visible[next];
    if (target) {
      setFocusRow(target.id);
      rows.current.get(target.id)?.focus();
    }
  };

  const detailHidden = narrow && view === "list";
  const listHidden = narrow && view === "detail";
  // The "3 set" chip leaves while disabled: focus that sat on it moves to the panel.
  useFocusKept(root, `${status}|${disabled}`);
  // Its own status, or the loading frame of an item around it.
  const loading = useLoading().loading || status === "loading";

  return (
    <section
      ref={root}
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      className={cn(
        "not-prose @container relative overflow-hidden rounded-[24px] border border-[var(--fu-card-border,#2A2A2A)] bg-[var(--fu-panel,#141414)] text-[var(--fu-text,#F8F5F1)]",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
        className,
      )}
      {...props}
    >
      <div className="flex min-h-16 flex-wrap items-center gap-x-2 gap-y-2 border-b border-[var(--fu-card-border,#2A2A2A)] py-3 pe-3 ps-5 @min-[520px]:py-4 @min-[520px]:pe-4 @min-[520px]:ps-6">
        <Heading id={`${id}-title`} className="m-0 text-[20px] leading-7 font-semibold">
          {title}
        </Heading>
        {onClearAll && setCount > 0 && !disabled && (
          <button
            type="button"
            aria-label={`${formatsFor(locale).number(setCount)} set, clear all`}
            onClick={() => {
              onClearAll();
              focusFind();
            }}
            className={cn(
              "group/clear relative inline-flex h-7 cursor-pointer items-center gap-1 rounded-full bg-[var(--fu-selected,#1F2747)] pe-1.5 ps-2.5 text-[13px] leading-4 font-medium text-[var(--fu-accent-pale,#D1DDFF)] tabular-nums",
              "transition-[background-color,opacity,filter,translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--fu-accent-soft,#8FAAFF)]/20",
              "starting:-translate-x-1 rtl:starting:translate-x-1 starting:opacity-0 starting:blur-[2px] motion-reduce:transition-none",
              "pointer-coarse:after:absolute pointer-coarse:after:-inset-2 pointer-coarse:after:content-['']",
              FOCUS_RING,
            )}
          >
            <TextSwap>{formatsFor(locale).number(setCount)}</TextSwap> set
            <XIcon size={14} className="text-[var(--fu-accent-soft,#8FAAFF)] transition-[color] duration-200 group-hover/clear:text-[var(--fu-accent-pale,#D1DDFF)]" />
          </button>
        )}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {showLabel.replace(/^Show /, "")}
        </span>
        <ShowButton label={showLabel} onClick={onShow} loading={loading} className="ms-auto" />
      </div>

      {/* Loading and disabled hold the whole body; an error sits in the filter's place below, so the list stays. */}
      <StatusFrame
        status={loading ? "loading" : "ready"}
        disabled={disabled}
        className="rounded-none rounded-b-[23px] focus-visible:-outline-offset-2"
      >
        <div
          ref={body}
          data-view={view}
          style={{ "--all-filters-h": `${height}px` } as CSSProperties}
          className={cn(
            "group/body relative grid grid-cols-1 overflow-hidden",
            "@min-[520px]:h-[var(--all-filters-h)] @min-[520px]:grid-cols-[minmax(208px,232px)_minmax(0,1fr)] @min-[760px]:grid-cols-[minmax(240px,264px)_minmax(0,1fr)]",
          )}
        >
          <div
            inert={listHidden}
            className={cn(
              "flex min-h-0 min-w-0 flex-col transition-[translate,opacity] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              "@max-[519px]:group-data-[view=detail]/body:pointer-events-none @max-[519px]:group-data-[view=detail]/body:absolute @max-[519px]:group-data-[view=detail]/body:inset-x-0 @max-[519px]:group-data-[view=detail]/body:top-0 @max-[519px]:group-data-[view=detail]/body:translate-x-[calc(var(--flip,1)*-24%)] @max-[519px]:group-data-[view=detail]/body:opacity-0",
              // Right to left, the list leaves to the right and the filter comes in from the left.
              "[--flip:1] rtl:[--flip:-1]",
            )}
          >
            <div className="px-3 pt-3 pb-1 @min-[520px]:px-4 @min-[520px]:pt-4 @min-[520px]:pb-2">
              <TextField
                id={findId}
                value={query}
                onChange={setQuery}
                label={findLabel}
                placeholder={findLabel}
                type="search"
                autoComplete="off"
                spellCheck={false}
                prefix={<SearchIcon size={18} />}
                clearLabel="Clear the find box"
                className="h-10"
                inputClassName="[&::-webkit-search-cancel-button]:appearance-none"
                onKeyDown={(event) => {
                  if (event.key === "Escape" && query) {
                    event.stopPropagation();
                    event.preventDefault();
                    setQuery("");
                  } else if (event.key === "ArrowDown" && visible[0]) {
                    event.preventDefault();
                    rows.current.get(visible[0].id)?.focus();
                  } else if (event.key === "Enter" && q && visible[0]) {
                    event.preventDefault();
                    pick(visible[0].id);
                  }
                }}
              />
            </div>
            <div
              ref={list}
              // Disabled, its rows take no focus, and Firefox would then stop Tab on the list itself.
              tabIndex={disabled ? -1 : undefined}
              className={cn(
                "relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 @min-[520px]:px-4 @min-[520px]:pb-8 @min-[520px]:[mask-image:linear-gradient(to_bottom,#000_calc(100%-32px),transparent)]",
                SCROLL,
                // Disabled, the list holds still where it is: its rows take no input, so it is a picture, not a scroll box.
                disabled && "overflow-y-hidden",
              )}
            >
              <Highlight list={list} activeId={picked && visible.some((entry) => entry.id === picked) ? `${id}-row-${picked}` : null} />
              {groups.map((group, index) => {
                const shown = group.filters.filter((entry) => matchesQuery(entry, q));
                if (!shown.length) return null;
                const groupId = `${id}-group-${index}`;
                return (
                  <div key={group.label} role="group" aria-labelledby={groupId} className="relative">
                    <div id={groupId} className="px-3 pt-4 pb-1.5 @min-[520px]:pt-5 @min-[520px]:pb-2 text-[12px] leading-4 font-medium text-[var(--fu-dim,#929292)]">
                      {group.label}
                    </div>
                    {shown.map((entry) => (
                      <Row
                        key={entry.id}
                        id={`${id}-row-${entry.id}`}
                        entry={entry}
                        query={q}
                        picked={entry.id === picked}
                        tabbable={entry.id === (focusRow && visible.some((e) => e.id === focusRow) ? focusRow : tabRow)}
                        disabled={disabled}
                        buttonRef={(node) => {
                          if (node) rows.current.set(entry.id, node);
                          else rows.current.delete(entry.id);
                        }}
                        onPick={() => pick(entry.id)}
                        onFocus={() => setFocusRow(entry.id)}
                        onKeyDown={(event) => moveFocus(event, entry.id)}
                      />
                    ))}
                  </div>
                );
              })}
              {visible.length === 0 && (
                <div role="status" className="px-3 pt-8 pb-4">
                  <EmptyState
                    art={SEARCH_ART}
                    title={
                      <span className="flex min-w-0 flex-wrap justify-center">
                        <span className="shrink-0">No filter called&nbsp;</span>
                        <span className="flex min-w-0">
                          <span className="min-w-0 truncate">&ldquo;{query.trim()}</span>
                          <span className="shrink-0">&rdquo;</span>
                        </span>
                      </span>
                    }
                    action={
                      <button
                        type="button"
                        onClick={() => {
                          setQuery("");
                          focusFind();
                        }}
                        className={cn(
                          "relative cursor-pointer rounded-[6px] text-[14px] leading-5 font-medium text-[var(--fu-accent-soft,#8FAAFF)] transition-[color] duration-200 before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] hover:text-[var(--fu-accent-pale,#D1DDFF)]",
                          "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
                        )}
                      >
                        Clear search
                      </button>
                    }
                  />
                </div>
              )}
            </div>
          </div>

          <div
            ref={detailBox}
            inert={detailHidden}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !event.defaultPrevented && narrow) {
                event.preventDefault();
                goBack();
              }
            }}
            className={cn(
              "min-h-0 min-w-0 transition-[translate,opacity] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              "@min-[520px]:m-3 @min-[520px]:ms-0 @min-[520px]:max-h-[calc(100%-24px)] @min-[520px]:self-start @min-[520px]:overflow-y-auto @min-[520px]:data-[overflows]:overscroll-contain @min-[520px]:rounded-[18px] @min-[520px]:bg-[var(--fu-card,#1F1F1F)]",
              SCROLL,
              disabled && "@min-[520px]:overflow-y-hidden",
              "@max-[519px]:group-data-[view=list]/body:pointer-events-none @max-[519px]:group-data-[view=list]/body:absolute @max-[519px]:group-data-[view=list]/body:inset-x-0 @max-[519px]:group-data-[view=list]/body:top-0 @max-[519px]:group-data-[view=list]/body:translate-x-[calc(var(--flip,1)*104%)] @max-[519px]:group-data-[view=list]/body:opacity-0",
              "[--flip:1] rtl:[--flip:-1]",
            )}
          >
            <div className="px-3 pt-2 @min-[520px]:hidden">
              <button
                ref={back}
                type="button"
                onClick={goBack}
                className={cn(
                  "-ms-1 inline-flex h-11 cursor-pointer items-center gap-1 rounded-[10px] pe-3 ps-1.5 text-[15px] leading-5 font-medium text-[var(--fu-mute,#BDBDBD)] transition-[color,background-color] duration-200 hover:bg-[var(--fu-hover-wash,rgb(255_255_255/0.14))] hover:text-[var(--fu-text,#F8F5F1)]",
                  FOCUS_RING,
                )}
              >
                <ChevronDownIcon size={18} className="rotate-90 rtl:-rotate-90" />
                All filters
              </button>
            </div>
            <div ref={pane} className="px-5 pt-2 pb-6 @min-[520px]:px-6 @min-[520px]:pt-6 @min-[520px]:pb-8">
              {current && (
                <div className="flex min-h-7 items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <PaneHeading className="m-0 text-[20px] leading-7 font-semibold">{current.label}</PaneHeading>
                    {current.hint && <p className="m-0 mt-0.5 text-[14px] leading-5 text-[var(--fu-mute,#BDBDBD)]">{current.hint}</p>}
                  </div>
                  {current.onClear && (current.values?.length ?? 0) > 0 && !disabled && (
                    <button
                      type="button"
                      onClick={() => {
                        current.onClear?.();
                        // Clear leaves once the filter is clear; the filter's first control takes focus, as the next Tab would.
                        requestAnimationFrame(() => pane.current?.querySelector<HTMLElement>(PANE_CONTROL)?.focus({ preventScroll: true }));
                      }}
                      aria-label={`Clear ${current.label.toLowerCase()}`}
                      className={cn(
                        "relative -me-1 h-7 shrink-0 cursor-pointer rounded-[6px] px-1 text-[14px] leading-5 font-medium text-[var(--fu-accent-soft,#8FAAFF)] transition-[color] duration-200 hover:text-[var(--fu-accent-pale,#D1DDFF)]",
                        "starting:opacity-0 motion-reduce:transition-none pointer-coarse:after:absolute pointer-coarse:after:-inset-2 pointer-coarse:after:content-['']",
                        FOCUS_RING,
                      )}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
              <div className={current ? "mt-5 max-w-[420px] @min-[520px]:mt-6 @min-[760px]:max-w-[560px]" : undefined}>
                <StatusFrame status={status === "error" ? "error" : "ready"} onRetry={onRetry} errorText={errorText}>
                  {current ? (
                    current.content
                  ) : (
                    <p className="m-0 grid min-h-[240px] place-items-center text-center text-[15px] leading-6 text-[var(--fu-dim,#929292)]">
                      {/* The list's side, in words, follows the direction. */}
                      <span>
                        Pick a filter on the <span className="rtl:hidden">left</span>
                        <span className="hidden rtl:inline">right</span>.
                      </span>
                    </p>
                  )}
                </StatusFrame>
              </div>
            </div>
          </div>
        </div>
      </StatusFrame>
    </section>
  );
}

/** The nearest box around node that scrolls up and down, short of the page itself. */
function scrollerOf(node: HTMLElement) {
  for (let box = node.parentElement; box && box !== document.body && box !== document.documentElement; box = box.parentElement) {
    const { overflowY } = getComputedStyle(box);
    if ((overflowY === "auto" || overflowY === "scroll") && box.scrollHeight > box.clientHeight + 1) return box;
  }
  return null;
}

type RowProps = {
  id: string;
  entry: FilterEntry;
  query: string;
  picked: boolean;
  tabbable: boolean;
  /** The chips' crosses are left out, as they cannot run. */
  disabled: boolean;
  buttonRef: (node: HTMLButtonElement | null) => void;
  onPick: () => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

/**
 * A filter in the list: its name and chevron, then its values as chips. The whole row picks it; a chip's cross removes
 * one value. A long name wraps in the row; a long value wraps in its chip.
 */
function Row({ id, entry, query, picked, tabbable, disabled, buttonRef, onPick, onFocus, onKeyDown }: RowProps) {
  const values = entry.values ?? [];
  const set = values.length > 0;
  // A row found by another word says which, so "mileage" finding Kilometres makes sense.
  const via = query && !entry.label.toLowerCase().includes(query) ? entry.keywords?.find((word) => word.toLowerCase().includes(query)) : undefined;
  return (
    <div id={id} className="group/row relative rounded-[10px]">
      <button
        ref={buttonRef}
        type="button"
        tabIndex={tabbable ? 0 : -1}
        aria-current={picked ? "true" : undefined}
        onClick={onPick}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        className={cn(
          "flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2.5 text-start pointer-coarse:min-h-11 font-[inherit] text-[15px] leading-5 outline-none",
          "after:absolute after:inset-0 after:rounded-[10px] after:content-['']",
          "focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-solid focus-visible:after:outline-[var(--fu-accent-soft,#8FAAFF)]",
          "transition-[background-color] duration-200",
          !picked && "[@media(hover:hover)]:hover:bg-[var(--fu-wash,rgb(255_255_255/0.08))]",
          "forced-colors:aria-[current=true]:outline-2 forced-colors:aria-[current=true]:-outline-offset-2 forced-colors:aria-[current=true]:outline-solid forced-colors:aria-[current=true]:outline-[Highlight]",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 font-medium [overflow-wrap:anywhere] transition-[color] duration-200",
            picked ? "text-[var(--fu-accent-pale,#D1DDFF)]" : set ? "text-[var(--fu-text,#F8F5F1)]" : "text-[var(--fu-mute,#BDBDBD)]",
          )}
        >
          <Marked text={entry.label} query={query} />
          {via && (
            <span className="ms-1.5 text-[13px] font-normal text-[var(--fu-dim,#929292)]">
              <Marked text={via} query={query} />
            </span>
          )}
        </span>
        {set && <span className="sr-only">, {values.map((value) => value.label).join(", ")}</span>}
        <ChevronDownIcon
          size={16}
          className={cn(
            "shrink-0 -rotate-90 rtl:rotate-90 [--flip:1] rtl:[--flip:-1] transition-[color,translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            picked
              ? "translate-x-[calc(var(--flip,1)*0.125rem)] text-[var(--fu-accent-soft,#8FAAFF)]"
              : "text-[var(--fu-dim,#929292)] group-hover/row:translate-x-[calc(var(--flip,1)*0.125rem)]",
          )}
        />
      </button>
      <ValueChips values={values} picked={picked} disabled={disabled} />
    </div>
  );
}

type ChipItem = FilterValue & { gone: boolean };

// While a chip grows in or collapses, its inside keeps its width, so a long value that wraps never rewraps on the way.
const freeze = (node: HTMLElement) => {
  const inner = node.firstElementChild;
  if (inner instanceof HTMLElement) inner.style.cssText = `width:${inner.offsetWidth}px;max-width:none;flex-shrink:0`;
};
const thaw = (node: HTMLElement) => {
  const inner = node.firstElementChild;
  if (inner instanceof HTMLElement) inner.style.cssText = "";
};

// Leaving chips keep their place among the ones that stay, so the rest close the gap from where they were.
function mergeChips(prev: readonly ChipItem[], next: readonly FilterValue[]): ChipItem[] {
  const keys = new Set(next.map((value) => value.key));
  const out: ChipItem[] = [];
  let at = 0;
  for (const value of next) {
    const was = prev.findIndex((item) => item.key === value.key);
    if (was >= 0) {
      for (; at < was; at++) if (!keys.has(prev[at].key)) out.push({ ...prev[at], gone: true });
      at = Math.max(at, was + 1);
    }
    out.push({ ...value, gone: false });
  }
  for (; at < prev.length; at++) if (!keys.has(prev[at].key)) out.push({ ...prev[at], gone: true });
  return out;
}

/** The row's values: a new chip grows in from nothing, a removed one collapses through a blur and the rest close up. */
function ValueChips({ values, picked, disabled }: { values: readonly FilterValue[]; picked: boolean; disabled: boolean }) {
  const extra = values.length - MAX_CHIPS;
  const wanted: FilterValue[] = extra > 0 ? [...values.slice(0, MAX_CHIPS), { key: "\u0000more", label: `+${extra}`, onRemove: () => {} }] : [...values];
  const signature = wanted.map((value) => `${value.key}\u0000${value.label}`).join("\u0001");
  const [items, setItems] = useState<ChipItem[]>(() => wanted.map((value) => ({ ...value, gone: false })));
  const [lastSignature, setLastSignature] = useState(signature);
  if (signature !== lastSignature) {
    setLastSignature(signature);
    setItems((prev) => mergeChips(prev, wanted));
  }

  const nodes = useRef(new Map<string, HTMLSpanElement>());
  const seen = useRef<Set<string> | null>(null);

  useLayoutEffect(() => {
    const before = seen.current;
    seen.current = new Set(items.filter((item) => !item.gone).map((item) => item.key));
    const quiet = reducedMotion();
    const drop = (key: string) => setItems((list) => list.filter((item) => !(item.key === key && item.gone)));
    for (const item of items) {
      const node = nodes.current.get(item.key);
      if (!node) continue;
      if (!item.gone && node.dataset.leaving) {
        delete node.dataset.leaving;
        node.getAnimations().forEach((animation) => animation.cancel());
        thaw(node);
      }
      if (item.gone) {
        if (node.dataset.leaving) continue;
        node.dataset.leaving = "true";
        if (quiet) {
          drop(item.key);
          continue;
        }
        const width = node.offsetWidth;
        freeze(node);
        const out = node.animate(
          [
            { width: `${width}px`, marginInlineEnd: "6px", opacity: 1, filter: "blur(0)" },
            { width: "0px", marginInlineEnd: "0px", opacity: 0, filter: "blur(2px)" },
          ],
          { duration: 280, easing: EASE, fill: "forwards" },
        );
        out.onfinish = () => drop(item.key);
      } else if (before && !before.has(item.key) && !quiet) {
        const width = node.offsetWidth;
        freeze(node);
        const into = node.animate(
          [
            { width: "0px", marginInlineEnd: "0px", opacity: 0, filter: "blur(2px)" },
            { width: `${width}px`, marginInlineEnd: "6px", opacity: 1, filter: "blur(0)" },
          ],
          { duration: 320, easing: EASE },
        );
        into.onfinish = into.oncancel = () => thaw(node);
      }
    }
  }, [items]);

  const latest = new Map(wanted.map((value) => [value.key, value]));
  const open = items.length > 0;

  return (
    <div
      className={cn(
        "pointer-events-none relative grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="flex flex-wrap px-3 pt-0.5 pb-2">
          {items.map((item) => {
            const value = item.gone ? item : (latest.get(item.key) ?? item);
            const more = item.key === "\u0000more";
            return (
              <span
                key={item.key}
                ref={(node) => {
                  if (node) nodes.current.set(item.key, node);
                  else nodes.current.delete(item.key);
                }}
                aria-hidden={more || undefined}
                className="me-1.5 mb-1.5 inline-flex max-w-full shrink-0 overflow-hidden rounded-[7px]"
              >
                <span
                  className={cn(
                    "inline-flex min-h-6 min-w-0 items-center gap-1.5 rounded-[7px] py-0.5 text-[13px] leading-4 tabular-nums transition-[background-color] duration-200",
                    more || disabled ? "px-2" : "pe-0.5 ps-2",
                    picked
                      ? "bg-[var(--fu-accent-soft,#8FAAFF)]/15 text-[var(--fu-accent-pale,#D1DDFF)]"
                      : "bg-[var(--fu-selected,#1F2747)] text-[var(--fu-accent-pale,#D1DDFF)]",
                  )}
                >
                  {value.color && (
                    <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_var(--fu-swatch-edge,rgb(255_255_255/0.2))]" style={{ backgroundColor: value.color }} />
                  )}
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <SkeletonText>{value.label}</SkeletonText>
                  </span>
                  {!more && !disabled && (
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={`Remove ${value.label}`}
                      disabled={item.gone}
                      onClick={() => value.onRemove()}
                      className={cn(
                        "pointer-events-auto relative grid size-5 shrink-0 cursor-pointer place-items-center rounded-[5px] text-[var(--fu-accent-soft,#8FAAFF)] transition-[background-color,color] duration-150 hover:bg-[var(--fu-accent-soft,#8FAAFF)]/20 hover:text-[var(--fu-accent-pale,#D1DDFF)]",
                        "pointer-coarse:after:absolute pointer-coarse:after:-inset-3 pointer-coarse:after:content-['']",
                      )}
                    >
                      <XIcon size={12} strokeWidth={2.5} />
                    </button>
                  )}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type Mark = { top: number; height: number };

/** The picked row's fill, one for the whole list, measured onto the picked row. */
function Highlight({ list, activeId }: { list: RefObject<HTMLDivElement | null>; activeId: string | null }) {
  const [mark, setMark] = useState<Mark | null>(null);

  const measure = () => {
    const node = activeId ? document.getElementById(activeId) : null;
    const container = list.current;
    if (!node || !container) {
      setMark(null);
      return;
    }
    let top = 0;
    for (let at: HTMLElement | null = node; at && at !== container; at = at.offsetParent as HTMLElement | null) top += at.offsetTop;
    const next = { top, height: node.offsetHeight };
    setMark((was) => (was && was.top === next.top && was.height === next.height ? was : next));
  };

  useLayoutEffect(measure);

  useEffect(() => {
    const container = list.current;
    if (!container) return;
    const observer = new ResizeObserver(() => measure());
    for (const child of container.querySelectorAll("[id]")) observer.observe(child);
    return () => observer.disconnect();
  });

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-3 top-0 rounded-[10px] bg-[var(--fu-selected,#1F2747)] forced-colors:hidden",
        "transition-[opacity] duration-200 motion-reduce:transition-none",
        !mark && "opacity-0",
      )}
      style={mark ? { translate: `0 ${mark.top}px`, height: mark.height } : undefined}
    />
  );
}
