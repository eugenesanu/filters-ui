"use client";

import { useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { CountPill } from "../ui/count-pill";

export type IconTileOption<V extends string> = {
  value: V;
  label: string;
  /** Any SVG. It draws in currentColor; `var(--tile-bg)` is the tile's own background, for cut-outs. */
  icon: ReactNode;
  count: number;
};

export type IconTilesProps<V extends string> = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
  options: readonly IconTileOption<V>[];
  value: readonly V[];
  onChange: (value: V[]) => void;
  /** Accessible name of the group. */
  label: string;
  formatCount?: (n: number) => string;
  /** Screen-reader words for a count: "6 results". */
  countLabel?: (n: number) => string;
};

const defaultCountLabel = (n: number) => (n === 1 ? "1 result" : `${new Intl.NumberFormat("en-US").format(n)} results`);

/** A two-column grid of toggle tiles, each an icon over a name and a count. Several can be on. */
export function IconTiles<V extends string>({
  options,
  value,
  onChange,
  label,
  formatCount,
  countLabel = defaultCountLabel,
  className,
  ...props
}: IconTilesProps<V>) {
  // An option turned off at 0 would become disabled under the pointer or keyboard and drop focus; it stays enabled until it loses focus.
  const [kept, setKept] = useState<V | null>(null);
  const toggle = (v: V, button: HTMLButtonElement) => {
    const on = value.includes(v);
    setKept(on && document.activeElement === button ? v : null);
    onChange(on ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div role="group" aria-label={label} className={cn("grid grid-cols-2 gap-2", className)} {...props}>
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
              "group/tile flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-[16px] border px-3 py-2.5 text-left font-[inherit]",
              "bg-[var(--tile-bg)] [--tile-bg:var(--fu-card,#1F1F1F)]",
              "transition-[background-color,border-color,color,scale,opacity] duration-200 ease-[cubic-bezier(0.42,0,0.58,1)] active:scale-[0.97] active:duration-75 motion-reduce:transition-none",
              "[&_svg_*]:transition-[fill,stroke] [&_svg_*]:duration-200 motion-reduce:[&_svg_*]:transition-none",
              "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
              on
                ? "border-[var(--fu-accent-soft,#8FAAFF)] text-[var(--fu-accent-soft,#8FAAFF)] [--tile-bg:var(--fu-selected,#1F2747)]"
                : "border-[var(--fu-control-border,#737373)] text-[var(--fu-mute,#BDBDBD)] enabled:hover:border-[var(--fu-control-hover,#A3A3A3)] enabled:hover:text-[var(--fu-accent-soft,#8FAAFF)] enabled:hover:[--tile-bg:var(--fu-surface-3,#2A2A2A)]",
              "disabled:cursor-default disabled:opacity-40",
              option.count === 0 && !on && "opacity-40",
            )}
          >
            <span aria-hidden="true" className="flex h-7 justify-center [&>svg]:h-7 [&>svg]:w-auto">
              {option.icon}
            </span>
            <span aria-hidden="true" className="flex min-w-0 items-center justify-between gap-1">
              <span className="truncate text-sm leading-5 text-[var(--fu-text,#F8F5F1)]">{option.label}</span>
              <CountPill variant="square" on={on} count={option.count} format={formatCount} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
