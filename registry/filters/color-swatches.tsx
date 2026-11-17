"use client";

import { useState, type HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { resultsLabel } from "../lib/format";

export type ColorSwatchOption<V extends string> = {
  value: V;
  label: string;
  /** Any CSS colour for the dot. */
  color: string;
  count: number;
};

export type ColorSwatchesProps<V extends string> = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
  options: readonly ColorSwatchOption<V>[];
  value: readonly V[];
  onChange: (value: V[]) => void;
  /** Accessible name of the group. */
  label: string;
  /** Screen-reader words for a count: "6 results". */
  countLabel?: (n: number) => string;
  /** Formats the counts and their spoken words by default, e.g. "de-DE". Default "en-US". */
  locale?: string;
};

/** A four-column grid of colour dots with their names. Several can be on. */
export function ColorSwatches<V extends string>({
  options,
  value,
  onChange,
  label,
  countLabel: countLabelProp,
  locale,
  className,
  ...props
}: ColorSwatchesProps<V>) {
  const countLabel = countLabelProp ?? ((n: number) => resultsLabel(n, locale));
  // An option turned off at 0 would become disabled under the pointer or keyboard and drop focus; it stays enabled until it loses focus.
  const [kept, setKept] = useState<V | null>(null);
  const toggle = (v: V, button: HTMLButtonElement) => {
    const on = value.includes(v);
    setKept(on && document.activeElement === button ? v : null);
    onChange(on ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div role="group" aria-label={label} className={cn("grid grid-cols-4 gap-2", className)} {...props}>
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
              "group/swatch flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-[12px] pt-3 pb-1 font-[inherit] text-[13px] leading-[18px] text-[var(--fu-swatch-text,#EDEAE6)]",
              "transition-[background-color,scale,opacity] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] active:duration-75 motion-reduce:transition-none",
              "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
              on ? "bg-[var(--fu-wash,rgb(255_255_255/0.08))]" : "enabled:hover:bg-[var(--fu-wash,rgb(255_255_255/0.08))]",
              "disabled:cursor-default disabled:opacity-40",
              option.count === 0 && !on && "opacity-40",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-7 shrink-0 rounded-full border-2",
                "transition-[border-color,box-shadow] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                on
                  ? "border-[var(--fu-text,#F8F5F1)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--fu-text,#F8F5F1)_18%,transparent)]"
                  : "border-[var(--fu-control-border,#737373)] shadow-[0_0_0_0_color-mix(in_srgb,var(--fu-text,#F8F5F1)_18%,transparent)] group-enabled/swatch:group-hover/swatch:border-[color-mix(in_srgb,var(--fu-control-border,#737373),var(--fu-text,#F8F5F1))]",
              )}
              style={{ backgroundColor: option.color }}
            />
            <span aria-hidden="true" className="max-w-full truncate px-1">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
