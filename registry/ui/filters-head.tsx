"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";
import { TextSwap } from "./text-swap";

export type CountNoun = { one: string; other: string };

type SharedProps = {
  /** How many results the current filters give. */
  count: number;
  /** The result noun. Default { one: "result", other: "results" }. */
  noun?: CountNoun;
  /** Formats the number in the button. Default Intl en-US ("1,204"). */
  formatCount?: (n: number) => string;
  /** Override the whole button label. Default "Show {count} {noun}". */
  showLabel?: (count: number) => string;
  onShow?: () => void;
  onClearAll?: () => void;
  /** False hides "Clear all" (nothing to clear). Default true. */
  canClear?: boolean;
  clearAllLabel?: string;
};

const defaultFormat = (n: number) => new Intl.NumberFormat("en-US").format(n);

function labelOf({ count, noun = { one: "result", other: "results" }, formatCount = defaultFormat, showLabel }: SharedProps) {
  return showLabel ? showLabel(count) : `Show ${formatCount(count)} ${count === 1 ? noun.one : noun.other}`;
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

/** Primary accent button whose label swaps with TextSwap as the count changes. */
export function ShowButton({ label, className, ...props }: Omit<HTMLAttributes<HTMLButtonElement>, "children"> & { label: string }) {
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
      <TextSwap>{label}</TextSwap>
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

/** "Filters" on the left; "Clear all" and "Show N results" on the right. The count is announced politely. */
export function FiltersHead({
  title = "Filters",
  headingLevel = 2,
  count,
  noun,
  formatCount,
  showLabel,
  onShow,
  onClearAll,
  canClear = true,
  clearAllLabel,
  actionsClassName,
  className,
  ...props
}: FiltersHeadProps) {
  const Heading = `h${headingLevel}` as const;
  const label = labelOf({ count, noun, formatCount, showLabel });
  return (
    <div className={cn("not-prose flex min-h-10 items-center gap-2", className)} {...props}>
      <Heading className="m-0 mr-auto text-[26px] font-semibold leading-8 text-[var(--fu-text,#F8F5F1)]">{title}</Heading>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {label.replace(/^Show /, "")}
      </span>
      <div className={cn("flex items-center gap-2", actionsClassName)}>
        {canClear && <ClearAllButton onClick={onClearAll}>{clearAllLabel ?? "Clear all"}</ClearAllButton>}
        <ShowButton label={label} onClick={onShow} />
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
  showLabel,
  onShow,
  onClearAll,
  canClear = true,
  clearAllLabel,
  className,
  ...props
}: FiltersBarProps) {
  const label = labelOf({ count, noun, formatCount, showLabel });
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
      <ShowButton label={label} onClick={onShow} />
    </div>
  );
}
