"use client";

import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { formatsFor } from "../lib/format";
import { ARRIVING, SKELETON_FILL, useLoading } from "./skeleton";
import { TextSwap } from "./text-swap";

export type CountNoun = { one: string; other: string };

type SharedProps = {
  /** How many results the current filters give. */
  count: number;
  /** The result noun. Default { one: "result", other: "results" }. */
  noun?: CountNoun;
  /** Formats the number in the button. Default Intl en-US ("1,204"). */
  formatCount?: (n: number) => string;
  /** Formats the count when no formatCount is given, e.g. "de-DE". Default "en-US". */
  locale?: string;
  /** Override the whole button label. Default "Show {count} {noun}". */
  showLabel?: (count: number) => string;
  onShow?: () => void;
  onClearAll?: () => void;
  /** False hides "Clear all" (nothing to clear). Default true. */
  canClear?: boolean;
  clearAllLabel?: string;
  /** The count is on its way: the number in Show draws as a placeholder of its width. Default false. */
  loading?: boolean;
};

function labelOf({ count, noun = { one: "result", other: "results" }, formatCount, locale, showLabel }: SharedProps) {
  return showLabel ? showLabel(count) : `Show ${(formatCount ?? formatsFor(locale).number)(count)} ${count === 1 ? noun.one : noun.other}`;
}

const PRESS =
  "transition-[background-color,color,scale] duration-200 ease-out active:scale-[0.97] active:duration-75 motion-reduce:transition-none motion-reduce:active:scale-100";
const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]";

/** Quiet text button, 40px high. */
export function ClearAllButton({ className, children = "Clear all", ...props }: HTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-[10px] px-3.5 text-[15px] font-medium leading-5 text-[var(--fu-text,#F8F5F1)] hover:bg-[var(--fu-hover-wash,rgb(255_255_255/0.14))]",
        PRESS,
        FOCUS,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** The first number in a label, in any script, with the marks that group its digits: "1,234", "1.234", "١٬٢٣٤". */
const NUMBER = /\p{Nd}(?:[\p{Nd}.,\u066B\u066C\u00A0\u202F\u2009\u2019']*\p{Nd})?/u;
/** How long an arriving number keeps its fade-in class: a little more than the 300ms fade. */
const ARRIVAL_MS = 400;

export type ShowButtonProps = Omit<HTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  /** The count is on its way: the number in the label draws as a soft bar of its width. Default: the nearest StatusFrame's loading state. */
  loading?: boolean;
};

/**
 * Primary accent button whose label swaps with TextSwap as the count changes. While loading, the number in its label
 * draws as a placeholder of the number's own width, so the button keeps its size; it fades in once when it arrives.
 */
export function ShowButton({ label, loading: loadingProp, className, ...props }: ShowButtonProps) {
  const frame = useLoading();
  const loading = loadingProp ?? frame.loading;
  const [was, setWas] = useState(loading);
  const [arrived, setArrived] = useState(false);
  if (was !== loading) {
    setWas(loading);
    setArrived(was && !loading);
  }
  useEffect(() => {
    if (!arrived) return;
    const timer = setTimeout(() => setArrived(false), ARRIVAL_MS);
    return () => clearTimeout(timer);
  }, [arrived]);
  const number = loading || arrived ? NUMBER.exec(label) : null;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-[10px] bg-[var(--fu-accent,#3B57E6)] px-3.5 text-[15px] font-medium leading-5 text-[var(--fu-on-accent,#FFFFFF)] tabular-nums hover:bg-[var(--fu-accent-hover,#3450D4)]",
        PRESS,
        FOCUS,
        className,
      )}
      {...props}
    >
      {number ? (
        // The same boxes as TextSwap's, so nothing moves between the placeholder, the arrival and the swap after it.
        <span className="inline-grid whitespace-nowrap">
          <span className="[grid-area:1/1]">
            {label.slice(0, number.index)}
            {loading ? (
              <span key="skeleton" className="relative inline-block align-top">
                <span className="invisible">{number[0]}</span>
                <span
                  aria-hidden="true"
                  className={cn("absolute inset-x-0 inset-y-[0.22lh] rounded-[4px]", SKELETON_FILL, "bg-[var(--fu-on-accent,#FFFFFF)]/30")}
                />
              </span>
            ) : (
              <span key="arrived" className={ARRIVING}>
                {number[0]}
              </span>
            )}
            {label.slice(number.index + number[0].length)}
          </span>
        </span>
      ) : (
        <TextSwap>{label}</TextSwap>
      )}
    </button>
  );
}

export type FiltersHeadProps = SharedProps &
  Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
    /** Default "Filters". */
    title?: ReactNode;
    headingLevel?: 1 | 2 | 3;
    /** Classes for the Clear all / Show wrapper, e.g. "max-sm:hidden" when a FiltersBar carries them on phones. */
    actionsClassName?: string;
  };

/** "Filters" at the start; "Clear all" and "Show N results" at the end. The count is announced politely. */
export function FiltersHead({
  title = "Filters",
  headingLevel = 2,
  count,
  noun,
  formatCount,
  locale,
  showLabel,
  onShow,
  onClearAll,
  canClear = true,
  clearAllLabel,
  loading = false,
  actionsClassName,
  className,
  ...props
}: FiltersHeadProps) {
  const Heading = `h${headingLevel}` as const;
  const label = labelOf({ count, noun, formatCount, locale, showLabel });
  return (
    <div className={cn("not-prose flex min-h-10 items-center gap-2", className)} {...props}>
      <Heading className="m-0 me-auto text-[26px] font-semibold leading-8 text-[var(--fu-text,#F8F5F1)]">{title}</Heading>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {label.replace(/^Show /, "")}
      </span>
      <div className={cn("flex items-center gap-2", actionsClassName)}>
        {canClear && <ClearAllButton onClick={onClearAll}>{clearAllLabel ?? "Clear all"}</ClearAllButton>}
        <ShowButton label={label} onClick={onShow} loading={loading} />
      </div>
    </div>
  );
}

export type FiltersBarProps = SharedProps &
  HTMLAttributes<HTMLDivElement> & {
    /** Slides the bar in or out (opacity and 18px). Default true. */
    visible?: boolean;
  };

/**
 * The floating bar for phones: Clear all and Show N in a pill, pinned to the bottom centre.
 * Pair it with a FiltersHead and show it while the head's own button is scrolled out of view.
 */
export function FiltersBar({
  visible = true,
  count,
  noun,
  formatCount,
  locale,
  showLabel,
  onShow,
  onClearAll,
  canClear = true,
  clearAllLabel,
  loading = false,
  className,
  ...props
}: FiltersBarProps) {
  const label = labelOf({ count, noun, formatCount, locale, showLabel });
  return (
    <div
      inert={!visible}
      data-state={visible ? "visible" : "hidden"}
      className={cn(
        "fixed bottom-[max(26px,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 gap-2 rounded-[20px] border border-[var(--fu-hover,#333333)] bg-[var(--fu-bar,rgb(31_31_31/0.94))] p-2 shadow-[0_16px_40px_var(--fu-shadow,rgb(0_0_0/0.5))] backdrop-blur-md",
        "transition-[opacity,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        "data-[state=hidden]:pointer-events-none data-[state=hidden]:translate-y-[18px] data-[state=hidden]:opacity-0",
        className,
      )}
      {...props}
    >
      {canClear && <ClearAllButton onClick={onClearAll}>{clearAllLabel ?? "Clear all"}</ClearAllButton>}
      <ShowButton label={label} onClick={onShow} loading={loading} />
    </div>
  );
}
