"use client";

import { useLayoutEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { onDirChange, readingKey, startOffset } from "../lib/direction";
import { formatsFor, resultsLabel } from "../lib/format";
import { CountPill } from "./count-pill";
import { SkeletonText } from "./skeleton";

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
  /** Formats the counts by default, e.g. "de-DE". */
  locale?: string;
  disabled?: boolean;
  /** "equal": options with a count share the width equally. "content": the same, except an option whose words need more keeps its own width (a name of several words may wrap instead). An option without a count ("Any") hugs its words while the control is under 340px wide. */
  fit?: "equal" | "content";
};

/**
 * A segmented control: an option without a count ("Any") hugs its words while the control is under 340px wide (from 340px all share the width), the others share the rest equally, and one pill slides to the chosen one over 340ms.
 * It is a radiogroup with one tab stop; arrow keys, Home and End move and select. Right to left, the options run from
 * the right and Left and Right follow them. Long words wrap and the track grows. Inside a loading StatusFrame the
 * words and counts of options with a count draw as placeholders; "Any" and the pill on the choice stay.
 */
export function Segmented<V extends SegmentedValue>({
  options,
  value,
  onChange,
  label,
  formatCount,
  countLabel,
  locale,
  disabled = false,
  fit = "equal",
  className,
  style,
  ...props
}: SegmentedProps<V>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const words = countLabel ?? ((n: number) => resultsLabel(n, locale));
  const count = formatCount ?? formatsFor(locale).number;
  const index = options.findIndex((option) => Object.is(option.value, value));
  const usable = (i: number) => !disabled && !options[i].disabled;
  const [box, setBox] = useState<{ start: number; width: number; rtl: boolean } | null>(null);
  const [placed, setPlaced] = useState(false);
  // "Any" hugs its words only beside options that carry counts, and only while the track is narrow; a set without counts stays equal.
  const counted = options.some((option) => option.count !== undefined);
  const hugs = counted && options.some((option) => option.count === undefined);
  const measuring = fit === "content" || hugs;
  const tabStop = index >= 0 ? index : options.findIndex((_, i) => usable(i));

  // Widths differ per option, so the pill takes the chosen button's measured box instead of a share of the track.
  // Until it is measured, the chosen button paints its own pill, so the server render already shows the choice.
  useLayoutEffect(() => {
    const button = measuring && index >= 0 ? buttons.current[index] : null;
    if (!button) return;
    const measure = () => setBox({ start: startOffset(button), width: button.offsetWidth, rtl: getComputedStyle(button).direction === "rtl" });
    measure();
    const frame = requestAnimationFrame(() => setPlaced(true));
    const observer = new ResizeObserver(measure);
    buttons.current.forEach((b) => b && observer.observe(b));
    const stop = onDirChange(measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      stop();
    };
  }, [measuring, index, options.length]);
  const measured = measuring ? box : null;

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
    switch (readingKey(event.key, event.currentTarget)) {
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
      className={cn("@container relative flex min-h-10 rounded-[12px] bg-[var(--fu-segment-track,#2A2A2A)] p-1", disabled && "opacity-40", className)}
      style={style}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1 bottom-1 inset-s-1 rounded-[9px] bg-[var(--fu-thumb,#404040)] [--flip:1] rtl:[--flip:-1]",
          measuring ? placed && "transition-[left,right,width,opacity]" : "transition-[translate,opacity]",
          "duration-[340ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          (index < 0 || (measuring && !measured)) && "opacity-0",
        )}
        style={
          measuring
            ? // physical: the start offset is measured in script from the physical edge that is the start in this direction.
              { [measured?.rtl ? "right" : "left"]: measured?.start, width: measured?.width }
            : { width: `calc((100% - 8px) / ${options.length})`, translate: `calc(var(--flip,1) * ${Math.max(index, 0) * 100}%) 0` }
        }
      />
      {options.map((option, i) => {
        const on = i === index;
        const off = !usable(i);
        const hug = hugs && option.count === undefined;
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
              "group/seg relative flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] py-1.5 text-[14px] leading-5 font-medium",
              hug ? "flex-none px-2.5 @min-[340px]:flex-1 @min-[340px]:px-0.5" : "flex-1 px-0.5",
              // At least its longest word and its count, so a single word is never cut; a longer name wraps.
              fit === "content" && !hug && "min-w-min",
              on && measuring && !measured && "bg-[var(--fu-thumb,#404040)]",
              "transition-[color,background-color,scale,opacity] duration-[340ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] active:duration-75 motion-reduce:transition-none",
              "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
              // Hover and press fill with a faint thumb, so they preview the pick and still read on any track colour.
              on
                ? "text-[var(--fu-text,#F8F5F1)]"
                : cn(
                    "text-[var(--fu-mute,#BDBDBD)] enabled:hover:text-[var(--fu-text,#F8F5F1)]",
                    "enabled:hover:bg-[color-mix(in_srgb,var(--fu-thumb,#404040)_40%,transparent)] enabled:active:bg-[color-mix(in_srgb,var(--fu-thumb,#404040)_70%,transparent)]",
                  ),
              "disabled:cursor-default",
              off && !disabled && !on && "opacity-40",
            )}
          >
            {/* Words wrap at spaces and the track grows; a single word too long for its segment ends in an ellipsis. */}
            <span className="min-w-0 overflow-hidden text-center text-ellipsis">
              {option.count === undefined ? option.label : <SkeletonText>{option.label}</SkeletonText>}
            </span>
            {option.count !== undefined && (
              <>
                <CountPill
                  aria-hidden="true"
                  count={option.count}
                  format={count}
                  className="group-enabled/seg:group-hover/seg:bg-[var(--fu-pill-hover,rgb(255_255_255/0.16))] group-enabled/seg:group-hover/seg:text-[var(--fu-text,#F8F5F1)]"
                />
                <span className="sr-only">, {words(option.count)}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
