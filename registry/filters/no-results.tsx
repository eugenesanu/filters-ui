"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { formatsFor } from "../lib/format";
import { findFixes, type Fix, type RelaxMap } from "../lib/relax";
import { ArrowRightIcon, SearchXIcon } from "../ui/icons";

export type CountNoun = { one: string; other: string };

export type NoResultsProps<Item, State> = Omit<HTMLAttributes<HTMLElement>, "onChange" | "title"> & {
  /** Every item, for the count each fix would give. */
  items: readonly Item[];
  /** The filters that find nothing. */
  value: State;
  /** Called with the filters a fix gives. */
  onChange: (value: State) => void;
  /** Does an item pass these filters? */
  matches: (item: Item, state: State) => boolean;
  /** How each filter can be loosened. */
  relax: RelaxMap<State>;
  /** Default "No results". */
  title?: string;
  /** Default "Try one of these changes.", or a nudge to clear filters when no change helps. */
  description?: string;
  /** Default { one: "result", other: "results" }. */
  noun?: CountNoun;
  /** Default: the number in the locale ("1,204"). */
  formatCount?: (n: number) => string;
  /** Formats the counts by default, e.g. "de-DE". Default "en-US". */
  locale?: string;
  /** How many fixes to offer. Default 3. */
  limit?: number;
  /** When given, a Clear all button closes the card. */
  onClearAll?: () => void;
  clearAllLabel?: string;
  /** Heading level of the title. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const noop = () => () => {};

/** False while hydrating server HTML, true for anything rendered on the client: only the latter animates in. */
const useClientRender = () => useSyncExternalStore(noop, () => true, () => false);

function spoken<State>(fix: Fix<State>, noun: CountNoun, format: (n: number) => string) {
  // In the order the row shows them, so the name holds the visible words: "Seats 7+ → Any, 3 cars".
  const changes = fix.changes.map((c) => `${c.label} ${c.from} → ${c.to}`).join("; ");
  return `${changes}, ${format(fix.count)} ${fix.count === 1 ? noun.one : noun.other}`;
}

/**
 * Shown where results would be when the filters find nothing: the smallest changes that bring some back, each with
 * its count and a soft bar to compare them. Pointing at a fix crosses out the value it replaces. One press applies it.
 */
export function NoResults<Item, State>({
  items,
  value,
  onChange,
  matches,
  relax,
  title = "No results",
  description,
  noun = { one: "result", other: "results" },
  formatCount: formatCountProp,
  locale,
  limit = 3,
  onClearAll,
  clearAllLabel = "Clear all",
  headingLevel = 3,
  className,
  ...props
}: NoResultsProps<Item, State>) {
  const formatCount = formatCountProp ?? formatsFor(locale).number;
  const id = useId();
  const fixes = useMemo(() => findFixes({ items, value, matches, relax, limit }), [items, value, matches, relax, limit]);
  const most = Math.max(1, ...fixes.map((fix) => fix.count));
  const said = description ?? (fixes.length ? "Try one of these changes." : "No small change finds anything. Clear a few filters.");
  const Heading = `h${headingLevel}` as const;

  // Rows rise in one after another and their bars grow, whenever a new set of fixes shows on the client. Nothing
  // cancels them on cleanup: they belong to these rows, and a remount in Strict Mode would otherwise lose them.
  const rows = useRef<HTMLUListElement>(null);
  const client = useClientRender();
  const animateFirst = useRef(client);
  const shownKey = fixes.map((fix) => fix.id).join(",");
  const lastKey = useRef<string | null>(null);
  useLayoutEffect(() => {
    const first = lastKey.current === null;
    if (lastKey.current === shownKey) return;
    lastKey.current = shownKey;
    if ((first && !animateFirst.current) || reducedMotion() || !rows.current) return;
    rows.current.querySelectorAll<HTMLElement>("[data-fix-row]").forEach((row, i) => {
      row.querySelector<HTMLElement>("[data-fix-content]")?.animate(
        [
          { opacity: 0, transform: "translateY(6px)", filter: "blur(6px)" },
          { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
        ],
        { duration: 480, delay: i * 40, easing: EASE, fill: "backwards" },
      );
      row
        .querySelector<HTMLElement>("[data-fix-bar]")
        ?.animate([{ clipPath: "inset(0 100% 0 0 round 8px)" }, { clipPath: "inset(0 0 0 0 round 8px)" }], {
          duration: 720,
          delay: 140 + i * 60,
          easing: EASE,
          fill: "backwards",
        });
    });
  }, [shownKey]);

  // Said once the card is on screen, so a screen reader hears it even though it mounts with its text.
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    const words = `${title}. ${fixes.length ? `${fixes.length} ${fixes.length === 1 ? "change brings" : "changes bring"} ${noun.other} back.` : said}`;
    const timer = setTimeout(() => setAnnounce(words), 120);
    return () => clearTimeout(timer);
  }, [title, said, fixes.length, noun.other]);

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        "not-prose overflow-hidden rounded-[24px] border border-[var(--fu-card-border,#2A2A2A)] bg-[var(--fu-card,#1F1F1F)] text-[var(--fu-text,#F8F5F1)]",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--fu-surface-3,#2A2A2A)] text-[var(--fu-mute,#BDBDBD)]"
        >
          <SearchXIcon size={20} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <Heading id={`${id}-title`} className="m-0 text-[15px] font-semibold leading-5">
            {title}
          </Heading>
          <p id={`${id}-said`} className="m-0 mt-0.5 text-[14px] leading-5 text-[var(--fu-dim,#929292)]">
            {said}
          </p>
        </div>
      </div>

      {fixes.length > 0 && (
        <ul ref={rows} aria-labelledby={`${id}-said`} className="m-0 flex list-none flex-col gap-0.5 px-2 pb-2">
          {fixes.map((fix) => (
            <li key={fix.id} data-fix-row="">
              <button
                type="button"
                aria-label={spoken(fix, noun, formatCount)}
                onClick={() => onChange(fix.state)}
                className={cn(
                  "group/fix relative isolate flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-[10px] py-2.5 pe-3 ps-3 text-start font-[inherit] text-[14px] leading-5 text-inherit",
                  "transition-[background-color,scale] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.99] active:duration-75 motion-reduce:transition-none",
                  "[@media(hover:hover)]:hover:bg-[var(--fu-card-hover,#262626)] focus-visible:bg-[var(--fu-card-hover,#262626)]",
                  "outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
                )}
              >
                {/* Grey at rest, and blue on the fix in hand. Bars stop short of the count, so they read as a chart. */}
                <span
                  aria-hidden="true"
                  data-fix-bar=""
                  style={{ width: `max(40px, calc((100% - 72px) * ${fix.count / most}))` }}
                  className={cn(
                    "absolute inset-y-1 inset-s-1 -z-10 rounded-[8px] bg-[var(--fu-card-hover,#262626)]",
                    "transition-[width,background-color] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                    "group-hover/fix:bg-[var(--fu-selected,#1F2747)] group-focus-visible/fix:bg-[var(--fu-selected,#1F2747)]",
                  )}
                />
                <span aria-hidden="true" data-fix-content="" className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    {fix.changes.map((change) => (
                      <span key={change.key} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-[13px] text-[var(--fu-dim,#929292)]">{change.label}</span>{" "}
                        {/* When old and new do not fit on one line, the new value moves to the next one whole, never cut. */}
                        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span className="relative truncate text-[var(--fu-mute,#BDBDBD)] transition-[color] duration-200 group-hover/fix:text-[var(--fu-dim,#929292)] group-focus-visible/fix:text-[var(--fu-dim,#929292)]">
                            {change.from}
                            <span
                              className={cn(
                                "absolute inset-x-[-2px] top-1/2 h-px origin-left rtl:origin-right scale-x-0 bg-current",
                                "transition-[scale] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                                "group-hover/fix:scale-x-100 group-focus-visible/fix:scale-x-100",
                              )}
                            />
                          </span>{" "}
                          <ArrowRightIcon
                            size={12}
                            strokeWidth={2.25}
                            className="shrink-0 text-[var(--fu-dim,#929292)] transition-[translate,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] [--flip:1] rtl:[--flip:-1] rtl:-scale-x-100 group-hover/fix:translate-x-[calc(var(--flip,1)*0.125rem)] group-hover/fix:text-[var(--fu-mute,#BDBDBD)] motion-reduce:transition-none"
                          />
                          {" "}
                          <span className="font-medium transition-[color] duration-200 group-hover/fix:text-[var(--fu-accent-pale,#D1DDFF)] group-focus-visible/fix:text-[var(--fu-accent-pale,#D1DDFF)]">
                            {change.to}
                          </span>
                        </span>
                      </span>
                    ))}
                  </span>{" "}
                  <span className="shrink-0 tabular-nums">
                    <span className="text-[15px] font-medium text-[var(--fu-accent-soft,#8FAAFF)]">{formatCount(fix.count)}</span>
                    <span className="text-[13px] text-[var(--fu-dim,#929292)]"> {fix.count === 1 ? noun.one : noun.other}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {onClearAll && (
        <div className="mx-4 flex min-h-12 items-center justify-between gap-3 border-t border-[var(--fu-card-border,#2A2A2A)] py-1">
          <span className="text-[13px] leading-5 text-[var(--fu-dim,#929292)]">Or start again</span>
          <button
            type="button"
            onClick={onClearAll}
            className={cn(
              "relative -me-2.5 inline-flex h-9 cursor-pointer items-center rounded-[10px] px-2.5 font-[inherit] text-[14px] font-medium leading-5 text-[var(--fu-accent-soft,#8FAAFF)]",
              "transition-[color,background-color,scale] duration-200 hover:bg-[var(--fu-hover-wash,rgb(255_255_255/0.14))] hover:text-[var(--fu-accent-pale,#D1DDFF)] active:scale-[0.97] motion-reduce:transition-none",
              "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
              "pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1 pointer-coarse:after:content-['']",
            )}
          >
            {clearAllLabel}
          </button>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </section>
  );
}
