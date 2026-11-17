"use client";

import { useState, type HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { formatsFor, resultsLabel } from "../lib/format";
import { CountPill } from "../ui/count-pill";
import { placeholderLabels, SkeletonText } from "../ui/skeleton";
import { StatusFrame, type StateProps } from "../ui/status-frame";

export type ChipOption<V extends string> = {
  value: V;
  label: string;
  count: number;
};

export type ChipGroupProps<V extends string> = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> &
  StateProps & {
    options: readonly ChipOption<V>[];
    value: readonly V[];
    onChange: (value: V[]) => void;
    /** Accessible name of the group. */
    label: string;
    formatCount?: (n: number) => string;
    /** Screen-reader words for a count: "6 results". */
    countLabel?: (n: number) => string;
    /** Formats the counts and their spoken words by default, e.g. "de-DE". Default "en-US". */
    locale?: string;
    /** How many chips show before "Show all N". Chips that are on always show. Default 12. */
    collapsedCount?: number;
  };

// 32px high: a 20px line, 5px above and below and a 1px border. A name longer than the whole row wraps inside its chip.
const CHIP =
  "inline-flex min-h-8 max-w-full min-w-0 items-center gap-1.5 rounded-[16px] border py-[5px] pe-1.5 ps-3 font-[inherit] text-start text-[14px] leading-5";

/** Placeholder chips while the options are on their way. */
const LOADING_CHIPS = 5;

/**
 * Rounded toggle chips that wrap onto rows, each a name and a count. Several can be on. A long list shows its first
 * collapsedCount chips, the ones that are on, and "Show all N" for the rest.
 */
export function ChipGroup<V extends string>({
  options,
  value,
  onChange,
  label,
  formatCount,
  countLabel: countLabelProp,
  locale,
  collapsedCount = 12,
  status = "ready",
  onRetry,
  errorText,
  emptyText,
  disabled = false,
  className,
  ...props
}: ChipGroupProps<V>) {
  const countLabel = countLabelProp ?? ((n: number) => resultsLabel(n, locale));
  // An option turned off at 0 would become disabled under the pointer or keyboard and drop focus; it stays enabled until it loses focus.
  const [kept, setKept] = useState<V | null>(null);
  const [all, setAll] = useState(false);
  const toggle = (v: V, button: HTMLButtonElement) => {
    const on = value.includes(v);
    setKept(on && document.activeElement === button ? v : null);
    onChange(on ? value.filter((x) => x !== v) : [...value, v]);
  };

  const loading = status === "loading";
  // Two hidden chips are not worth a button: the list folds only when it hides three or more.
  const folds = !loading && options.length > collapsedCount + 2;
  const shown = folds && !all ? options.filter((o, i) => i < collapsedCount || value.includes(o.value)) : options;

  return (
    <div role="group" aria-label={label} aria-disabled={disabled || undefined} className={cn("pt-0.5", className)} {...props}>
      <StatusFrame status={status} onRetry={onRetry} errorText={errorText} empty={options.length === 0} emptyText={emptyText} disabled={disabled}>
        <div className="flex flex-wrap gap-2">
          {loading && options.length === 0
            ? placeholderLabels(LOADING_CHIPS).map((name, i) => (
                <span key={i} className={cn(CHIP, "border-[var(--fu-line,#404040)]")}>
                  <SkeletonText>{name}</SkeletonText> <CountPill count={0} className="rounded-full" />
                </span>
              ))
            : shown.map((option) => {
                const on = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${option.label}, ${countLabel(option.count)}`}
                    disabled={option.count === 0 && !on && kept !== option.value}
                    onBlur={() => kept === option.value && setKept(null)}
                    onClick={(event) => toggle(option.value, event.currentTarget)}
                    data-state={on ? "on" : "off"}
                    className={cn(
                      CHIP,
                      "cursor-pointer",
                      "transition-[background-color,border-color,color,scale,opacity] duration-200 ease-[cubic-bezier(0.42,0,0.58,1)] active:scale-[0.97] active:duration-75 motion-reduce:transition-none",
                      "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
                      // While loading, a chip that is on stays on; the others take a quieter edge.
                      on
                        ? "border-[var(--fu-accent-soft,#8FAAFF)] bg-[var(--fu-selected,#1F2747)]"
                        : loading
                          ? "border-[var(--fu-line,#404040)]"
                          : "border-[var(--fu-control-border,#737373)] enabled:hover:border-[var(--fu-control-hover,#A3A3A3)] enabled:hover:bg-[var(--fu-item-hover,#2A2A2A)]",
                      "disabled:cursor-default",
                      option.count === 0 && !on && !loading && "opacity-40",
                    )}
                  >
                    <span aria-hidden="true" className="min-w-0 [overflow-wrap:anywhere] text-[var(--fu-text,#F8F5F1)]">
                      <SkeletonText>{option.label}</SkeletonText>
                    </span>{" "}
                    <CountPill aria-hidden="true" on={on} count={option.count} format={formatCount} locale={locale} className="rounded-full" />
                  </button>
                );
              })}
          {folds && (
            <button
              type="button"
              aria-expanded={all}
              onClick={() => setAll(!all)}
              className={cn(
                "group/more relative inline-flex h-8 cursor-pointer items-center rounded-[6px] px-1 text-[14px] leading-5 font-medium text-[var(--fu-accent-soft,#8FAAFF)]",
                "transition-[color,scale] duration-200 hover:text-[var(--fu-accent-pale,#D1DDFF)] active:scale-[0.97] active:duration-75 motion-reduce:transition-none",
                "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
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
                {all ? "Show fewer" : `Show all ${formatsFor(locale).number(options.length)}`}
              </span>
            </button>
          )}
        </div>
      </StatusFrame>
    </div>
  );
}
