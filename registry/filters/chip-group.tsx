"use client";

import { useState, type HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { CountPill } from "../ui/count-pill";

export type ChipOption<V extends string> = {
  value: V;
  label: string;
  count: number;
};

export type ChipGroupProps<V extends string> = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
  options: readonly ChipOption<V>[];
  value: readonly V[];
  onChange: (value: V[]) => void;
  /** Accessible name of the group. */
  label: string;
  formatCount?: (n: number) => string;
  /** Screen-reader words for a count: "6 results". */
  countLabel?: (n: number) => string;
};

const defaultCountLabel = (n: number) => (n === 1 ? "1 result" : `${new Intl.NumberFormat("en-US").format(n)} results`);

/** Rounded toggle chips that wrap onto rows, each a name and a count. Several can be on. */
export function ChipGroup<V extends string>({
  options,
  value,
  onChange,
  label,
  formatCount,
  countLabel = defaultCountLabel,
  className,
  ...props
}: ChipGroupProps<V>) {
  // An option turned off at 0 would become disabled under the pointer or keyboard and drop focus; it stays enabled until it loses focus.
  const [kept, setKept] = useState<V | null>(null);
  const toggle = (v: V, button: HTMLButtonElement) => {
    const on = value.includes(v);
    setKept(on && document.activeElement === button ? v : null);
    onChange(on ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2 pt-0.5", className)} {...props}>
      {options.map((option) => {
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
              "inline-flex h-8 min-w-0 cursor-pointer items-center gap-1.5 rounded-full border pr-1.5 pl-3 font-[inherit] text-sm leading-5 whitespace-nowrap",
              "transition-[background-color,border-color,color,scale,opacity] duration-200 ease-[cubic-bezier(0.42,0,0.58,1)] active:scale-[0.97] active:duration-75 motion-reduce:transition-none",
              "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
              on
                ? "border-[var(--fu-accent-soft,#8FAAFF)] bg-[var(--fu-selected,#1F2747)]"
                : "border-[var(--fu-control-border,#737373)] enabled:hover:border-[var(--fu-control-hover,#A3A3A3)] enabled:hover:bg-[var(--fu-surface-3,#2A2A2A)]",
              "disabled:cursor-default disabled:opacity-40",
              option.count === 0 && !on && "opacity-40",
            )}
          >
            <span aria-hidden="true" className="text-[var(--fu-text,#F8F5F1)]">
              {option.label}
            </span>
            <CountPill aria-hidden="true" on={on} count={option.count} format={formatCount} className="rounded-full" />
          </button>
        );
      })}
    </div>
  );
}
