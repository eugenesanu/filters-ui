"use client";

import { useRef, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { CountPill } from "./count-pill";

export type SegmentedValue = string | number | null;

export type SegmentedOption<V extends SegmentedValue> = {
  value: V;
  label: ReactNode;
  /** Shown in a count pill and read out with the label. Leave out for no pill ("Any"). */
  count?: number;
  disabled?: boolean;
};

export type SegmentedProps<V extends SegmentedValue> = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
  options: readonly SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Accessible name of the group. */
  label: string;
  formatCount?: (n: number) => string;
  /** Screen-reader words for a count: "6 results". */
  countLabel?: (n: number) => string;
  disabled?: boolean;
};

const defaultCountLabel = (n: number) => (n === 1 ? "1 result" : `${new Intl.NumberFormat("en-US").format(n)} results`);

/**
 * A segmented control: options share the width equally and one pill slides to the chosen one over 340ms.
 * It is a radiogroup with one tab stop; arrow keys, Home and End move and select.
 */
export function Segmented<V extends SegmentedValue>({
  options,
  value,
  onChange,
  label,
  formatCount,
  countLabel = defaultCountLabel,
  disabled = false,
  className,
  style,
  ...props
}: SegmentedProps<V>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const index = options.findIndex((option) => Object.is(option.value, value));
  const usable = (i: number) => !disabled && !options[i].disabled;
  const tabStop = index >= 0 ? index : options.findIndex((_, i) => usable(i));

  const pick = (i: number) => {
    buttons.current[i]?.focus();
    if (i !== index) onChange(options[i].value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = Math.max(0, buttons.current.findIndex((b) => b === document.activeElement));
    const n = options.length;
    const walk = (start: number, step: number) => {
      for (let k = 0, i = start; k < n; k++, i = (i + step + n) % n) if (usable(i)) return i;
      return -1;
    };
    let next = -1;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = walk((from + 1) % n, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = walk((from - 1 + n) % n, -1);
        break;
      case "Home":
        next = walk(0, 1);
        break;
      case "End":
        next = walk(n - 1, -1);
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next >= 0) pick(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onKeyDown={onKeyDown}
      className={cn("relative flex h-10 rounded-[12px] bg-[var(--fu-surface-3,#2A2A2A)] p-1", disabled && "opacity-40", className)}
      style={style}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1 bottom-1 left-1 rounded-[9px] bg-[var(--fu-line,#404040)]",
          "transition-[translate,opacity] duration-[340ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          index < 0 && "opacity-0",
        )}
        style={{ width: `calc((100% - 8px) / ${options.length})`, translate: `${Math.max(index, 0) * 100}% 0` }}
      />
      {options.map((option, i) => {
        const on = i === index;
        const off = !usable(i);
        return (
          <button
            key={String(option.value)}
            ref={(node) => {
              buttons.current[i] = node;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === tabStop ? 0 : -1}
            disabled={off}
            onClick={() => pick(i)}
            className={cn(
              "relative flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] px-1 text-sm leading-5 font-medium",
              "transition-[color,scale,opacity] duration-[340ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] active:duration-75 motion-reduce:transition-none",
              "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
              on ? "text-[var(--fu-text,#F8F5F1)]" : "text-[var(--fu-mute,#BDBDBD)] enabled:hover:text-[var(--fu-text,#F8F5F1)]",
              "disabled:cursor-default",
              off && !disabled && !on && "opacity-40",
            )}
          >
            <span className="truncate">{option.label}</span>
            {option.count !== undefined && (
              <>
                <CountPill aria-hidden="true" count={option.count} format={formatCount} />
                <span className="sr-only">, {countLabel(option.count)}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
