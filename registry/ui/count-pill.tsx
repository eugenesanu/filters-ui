import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export type CountPillProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  count: number;
  /** "default": 20px high, 6px radius. "square": 18px high, 5px radius, 11px text. */
  variant?: "default" | "square";
  /** Selected look: accent fill, white text. */
  on?: boolean;
  format?: (n: number) => string;
};

const defaultFormat = (n: number) => new Intl.NumberFormat("en-US").format(n);

export function CountPill({ count, variant = "default", on = false, format = defaultFormat, className, ...props }: CountPillProps) {
  return (
    <span
      data-state={on ? "on" : "off"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-medium tabular-nums",
        "transition-[background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        variant === "square"
          ? "h-[18px] min-w-5 rounded-[5px] px-[5px] text-[11px] leading-4"
          : "h-5 min-w-[22px] rounded-[6px] px-1.5 text-[12px] leading-4",
        on
          ? "bg-[var(--fu-accent,#3B57E6)] text-[var(--fu-on-accent,#FFFFFF)]"
          : variant === "square"
            ? "bg-[var(--fu-hover,#333333)] text-[var(--fu-pill-text,#C8C8C8)]"
            : "bg-[var(--fu-pill,rgb(255_255_255/0.1))] text-[var(--fu-pill-text,#C8C8C8)]",
        className,
      )}
      {...props}
    >
      {format(count)}
    </span>
  );
}
