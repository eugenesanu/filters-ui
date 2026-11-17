import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { formatsFor } from "../lib/format";

export type CountPillProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  count: number;
  /** "default": 20px high, 6px radius. "square": 18px high, 5px radius, 11px text. */
  variant?: "default" | "square";
  /** Selected look: accent fill, --fu-on-accent text. */
  on?: boolean;
  format?: (n: number) => string;
  /** Formats the count when no format is given, e.g. "de-DE" prints 1.234. */
  locale?: string;
};

export function CountPill({ count, variant = "default", on = false, format, locale, className, ...props }: CountPillProps) {
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
      {(format ?? formatsFor(locale).number)(count)}
    </span>
  );
}
