"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { formatsFor } from "../lib/format";
import { findFixes, type Fix, type RelaxMap } from "../lib/relax";
import { ArrowRightIcon, SearchXIcon } from "../ui/icons";
import { placeholderLabels, SKELETON_FILL, SkeletonText, useLoading } from "../ui/skeleton";
import { StatusFrame, type StateProps } from "../ui/status-frame";

export type CountNoun = { one: string; other: string };

export type NoResultsProps<Item, State> = Omit<HTMLAttributes<HTMLElement>, "onChange" | "title"> &
  Omit<StateProps, "emptyText"> & {
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
  /** What a fix says a press does, in its count's place, while it is pointed at: dropping its filters, or loosening one. Default "Remove" and "Apply". */
  removeLabel?: string;
  applyLabel?: string;
  /** Heading level of the title. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const noop = () => () => {};

/** False while hydrating server HTML, true for anything rendered on the client: only the latter animates in. */
const useClientRender = () => useSyncExternalStore(noop, () => true, () => false);

/** A loading bar's share of the row while there are no fixes yet: calm and falling, so it never hints at counts. */
const loadingShare = (i: number) => Math.max(0.3, 0.9 - i * 0.22);

/** Stand-in fixes while the counts are on their way: one change each, only their widths are shown. */
function placeholderFixes<State>(limit: number, state: State): Fix<State>[] {
  const words = placeholderLabels(limit * 3);
  return Array.from({ length: limit }, (_, i) => ({
    id: `placeholder-${i}`,
    changes: [{ key: "placeholder", label: words[i * 3 + 1], from: words[i * 3 + 2], to: words[i * 3], removed: false }],
    state,
    count: 0,
  }));
}

function spoken<State>(fix: Fix<State>, verb: string, noun: CountNoun, format: (n: number) => string) {
  // The verb, then the changes in the order the row shows them, so the name holds the visible words:
  // "Remove: Seats 7+ → Any, 3 cars".
  const changes = fix.changes.map((c) => `${c.label} ${c.from} → ${c.to}`).join("; ");
  return `${verb}: ${changes}, ${format(fix.count)} ${fix.count === 1 ? noun.one : noun.other}`;
}

/**
 * Shown where results would be when the filters find nothing: the smallest changes that bring some back, each with
 * its count and a soft bar to compare them. Pointing at a fix crosses out the value it replaces and puts what a press
 * does in the count's place: Remove when it drops its filters, Apply when it loosens one. One press applies it.
 * Loading, the title stays and each fix keeps its place with placeholders for its words, count and bar; an error shows
 * its line and Retry in place of the fixes, and Clear all still works.
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
  removeLabel = "Remove",
  applyLabel = "Apply",
  headingLevel = 3,
  status = "ready",
  onRetry,
  errorText = "Couldn't load the changes.",
  disabled = false,
  className,
  ...props
}: NoResultsProps<Item, State>) {
  const formatCount = formatCountProp ?? formatsFor(locale).number;
  const id = useId();
  // Its own status, or the loading frame of an item around it, such as a block's card.
  const loading = useLoading().loading || status === "loading";
  const failed = status === "error";
  const fixes = useMemo(() => findFixes({ items, value, matches, relax, limit }), [items, value, matches, relax, limit]);
  const most = Math.max(1, ...fixes.map((fix) => fix.count));
  // Until the counts are in, it cannot know that no change helps, so it says what it will offer.
  const said = description ?? (fixes.length || status !== "ready" ? "Try one of these changes." : "No small change finds anything. Clear a few filters.");
  const placeholders = loading && fixes.length === 0;
  const shownFixes = placeholders ? placeholderFixes(limit, value) : fixes;
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

  // Said once the card is on screen, so a screen reader hears it even though it mounts with its text. While the counts
  // load or fail, the status line under the title speaks instead.
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    const words =
      status !== "ready" ? "" : `${title}. ${fixes.length ? `${fixes.length} ${fixes.length === 1 ? "change brings" : "changes bring"} ${noun.other} back.` : said}`;
    const timer = setTimeout(() => setAnnounce(words), 120);
    return () => clearTimeout(timer);
  }, [title, said, fixes.length, noun.other, status]);

  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        "not-prose overflow-hidden rounded-[24px] border border-[var(--fu-card-border,#2A2A2A)] bg-[var(--fu-card,#1F1F1F)] text-[var(--fu-text,#F8F5F1)]",
        className,
      )}
      {...props}
    >
      {/* The outer frame holds the whole card: no input while loading, and dimmed and off while disabled. The fixes have a
          frame of their own, which says "Loading" and the error, so an error stands under the title and Clear all stays. */}
      <StatusFrame status={loading ? "loading" : "ready"} disabled={disabled} announce={false} className="rounded-[23px] focus-visible:-outline-offset-2">
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

        <StatusFrame status={status} onRetry={onRetry} errorText={errorText} className={failed ? "mx-4 mb-4" : undefined}>
          {shownFixes.length > 0 && (
            <ul ref={rows} aria-labelledby={`${id}-said`} className="m-0 flex list-none flex-col gap-0.5 px-2 pb-2">
              {shownFixes.map((fix, i) => {
                const verb = fix.changes.every((change) => change.removed) ? removeLabel : applyLabel;
                return (
                <li key={fix.id} data-fix-row="">
                  <button
                    type="button"
                    aria-label={spoken(fix, verb, noun, formatCount)}
                    onClick={() => onChange(fix.state)}
                    className={cn(
                      "group/fix relative isolate flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-[16px] py-2.5 pe-3 ps-4 text-start font-[inherit] text-[14px] leading-5 text-inherit",
                      "transition-[background-color,scale] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.99] active:duration-75 motion-reduce:transition-none",
                      "[@media(hover:hover)]:hover:bg-[var(--fu-card-hover,#262626)] focus-visible:bg-[var(--fu-card-hover,#262626)]",
                      "outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
                    )}
                  >
                    {/* Grey at rest, and blue on the fix in hand. Bars stop short of the count, so they read as a chart. */}
                    <span
                      aria-hidden="true"
                      data-fix-bar=""
                      style={{ width: `max(40px, calc((100% - 72px) * ${placeholders ? loadingShare(i) : fix.count / most}))` }}
                      className={cn(
                        "absolute inset-y-1 inset-s-1 -z-10 rounded-[12px]",
                        loading ? SKELETON_FILL : "bg-[var(--fu-share-hover,rgb(255_255_255/0.1))]",
                        "transition-[width,background-color] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                        "group-hover/fix:bg-[var(--fu-selected,#1F2747)] group-focus-visible/fix:bg-[var(--fu-selected,#1F2747)]",
                      )}
                    />
                    <span aria-hidden="true" data-fix-content="" className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        {fix.changes.map((change) => (
                          <span key={change.key} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-[13px] text-[var(--fu-dim,#929292)]">
                              <SkeletonText>{change.label}</SkeletonText>
                            </span>{" "}
                            {/* When old and new do not fit on one line, the new value moves to the next one whole, never cut. The arrow
                                stays with the old value, which is cut short when it alone fills the line. */}
                            <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <span className="flex min-w-0 items-center gap-x-1.5">
                                <span className="relative truncate text-[var(--fu-mute,#BDBDBD)] transition-[color] duration-200 group-hover/fix:text-[var(--fu-dim,#929292)] group-focus-visible/fix:text-[var(--fu-dim,#929292)]">
                                  <SkeletonText>{change.from}</SkeletonText>
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
                              </span>
                              {" "}
                              <span className="font-medium transition-[color] duration-200 group-hover/fix:text-[var(--fu-accent-pale,#D1DDFF)] group-focus-visible/fix:text-[var(--fu-accent-pale,#D1DDFF)]">
                                <SkeletonText>{change.to}</SkeletonText>
                              </span>
                            </span>
                          </span>
                        ))}
                      </span>{" "}
                      {/* The count and the verb share one place, as wide as the wider of the two, so nothing moves when they swap. */}
                      <span className="grid shrink-0 items-center justify-items-end tabular-nums">
                        <span
                          className={cn(
                            "[grid-area:1/1] transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                            !loading && "group-hover/fix:-translate-y-1 group-hover/fix:opacity-0 group-focus-visible/fix:-translate-y-1 group-focus-visible/fix:opacity-0",
                          )}
                        >
                          <SkeletonText>
                            <span className="text-[15px] font-medium text-[var(--fu-accent-soft,#8FAAFF)]">{formatCount(fix.count)}</span>
                            <span className="text-[13px] text-[var(--fu-dim,#929292)]"> {fix.count === 1 ? noun.one : noun.other}</span>
                          </SkeletonText>
                        </span>
                        {/* Loading, the verb stays in place unseen, so the row is as wide as it will be when the fixes are back. */}
                        <span
                          className={cn(
                            "translate-y-1 text-[14px] font-medium text-[var(--fu-accent-pale,#D1DDFF)] opacity-0 [grid-area:1/1]",
                            "transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                            loading
                              ? "invisible"
                              : "group-hover/fix:translate-y-0 group-hover/fix:opacity-100 group-focus-visible/fix:translate-y-0 group-focus-visible/fix:opacity-100",
                          )}
                        >
                          {verb}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
                );
              })}
            </ul>
          )}
        </StatusFrame>

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
      </StatusFrame>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </section>
  );
}
