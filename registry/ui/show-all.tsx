"use client";

import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { formatsFor } from "../lib/format";

/**
 * What a long list shows while folded: its first `collapsedCount` options and any that are on. Two hidden options are
 * not worth a button, so the list folds only when it would hide three or more, and never while it is loading.
 */
export function foldOptions<T>(
  options: readonly T[],
  { collapsedCount, expanded, isOn, loading = false }: { collapsedCount: number; expanded: boolean; isOn: (option: T) => boolean; loading?: boolean },
): { folds: boolean; shown: readonly T[] } {
  const folds = !loading && options.length > collapsedCount + 2;
  return { folds, shown: folds && !expanded ? options.filter((option, i) => i < collapsedCount || isOn(option)) : options };
}

export type ShowAllButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick" | "type"> & {
  /** How many options the whole list holds: "Show all 24". */
  total: number;
  /** The whole list shows; the button then reads "Show fewer". */
  expanded: boolean;
  onToggle: () => void;
  /** Formats the number, e.g. "de-DE". Default "en-US". */
  locale?: string;
};

/**
 * The text button that opens a folded list, in the accent colour: "Show all N", then "Show fewer". A 1px line draws in
 * under the words from the start edge while it is hovered or focused. It carries aria-expanded.
 */
export function ShowAllButton({ total, expanded, onToggle, locale, className, ...props }: ShowAllButtonProps) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className={cn(
        "group/more relative inline-flex h-8 cursor-pointer items-center rounded-[6px] px-1 text-[14px] leading-5 font-medium text-[var(--fu-accent-soft,#8FAAFF)]",
        "transition-[color,scale] duration-200 hover:text-[var(--fu-accent-pale,#D1DDFF)] active:scale-[0.97] active:duration-75 motion-reduce:transition-none",
        "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] rtl:bg-[position:100%_100%] bg-no-repeat pb-px",
          "transition-[background-size] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          "[@media(hover:hover)]:group-hover/more:bg-[length:100%_1px] group-focus-visible/more:bg-[length:100%_1px]",
        )}
      >
        {expanded ? "Show fewer" : `Show all ${formatsFor(locale).number(total)}`}
      </span>
    </button>
  );
}
