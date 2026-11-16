"use client";

import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { Select } from "../ui/select";

export type CascadeChild = { value: string; label: string; count: number };
export type CascadeOption = { value: string; label: string; count: number; children: readonly CascadeChild[] };

export type CascadingDropdownProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
  /** The first choices, each with its own second choices, e.g. makes and their models. In display order. */
  options: readonly CascadeOption[];
  /** [first, second], e.g. [make, model]. null is "any". */
  value: [string | null, string | null];
  /** Called with the new pair. A new first choice always clears the second. */
  onChange: (value: [string | null, string | null]) => void;
  /** Visible prefixes and accessible names of the two fields. Default "First" and "Second". */
  labels?: { first?: string; second?: string };
  /** The open choice at the top of each list. Default "Any". */
  anyLabels?: { first?: string; second?: string };
  /** What the second field reads until a first choice is set. Default "Pick one above first". */
  waitingText?: string;
  /** The line over the second list. Default: the first choice's label. */
  secondHeading?: (first: CascadeOption) => ReactNode;
  /** How many of the most common second choices show as quick picks under the fields. Default 3; 0 for none. */
  popular?: number;
  /** The quick picks' name, shown dim before them and read out. Default "Popular". */
  popularLabel?: string;
  formatCount?: (n: number) => string;
  /** Screen-reader words for a count: "6 cars". */
  countLabel?: (n: number) => string;
};

const ANY = "";
const SMOOTH = "cubic-bezier(0.22, 1, 0.36, 1)";
const defaultFormat = (n: number) => new Intl.NumberFormat("en-US").format(n);
const defaultCountLabel = (n: number) => (n === 1 ? "1 result" : `${defaultFormat(n)} results`);

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Two linked selects, such as Make then Model. The second waits, quiet, until the first is set; a hairline elbow joins
 * it to the first and draws itself in accent as a first choice is made, and again when it changes. A new first choice
 * clears the second, whose old value blurs out. Under them, the most common second choices sit as quick picks, each
 * with a thin accent bar along its foot for its share; they rise in one after another for each new first choice.
 */
export function CascadingDropdown({
  options,
  value,
  onChange,
  labels,
  anyLabels,
  waitingText = "Pick one above first",
  secondHeading = (first) => first.label,
  popular = 3,
  popularLabel = "Popular",
  formatCount = defaultFormat,
  countLabel = defaultCountLabel,
  className,
  ...props
}: CascadingDropdownProps) {
  const firstLabel = labels?.first ?? "First";
  const secondLabel = labels?.second ?? "Second";
  const [first, second] = value;
  const parent = options.find((option) => option.value === first) ?? null;
  const total = options.reduce((sum, option) => sum + option.count, 0);

  const firstChoices = [{ value: ANY, label: anyLabels?.first ?? "Any", count: total }, ...options];
  const secondChoices = parent ? [{ value: ANY, label: anyLabels?.second ?? "Any", count: parent.count }, ...parent.children] : [];

  const picks = parent ? [...parent.children].filter((child) => child.count > 0).sort((a, b) => b.count - a.count).slice(0, popular) : [];
  const most = Math.max(0, ...picks.map((child) => child.count));

  // Whenever the first choice changes to a value, the accent elbow draws from the first field down into the second and
  // the quick picks rise in, one after another.
  const elbow = useRef<SVGPathElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const drawn = useRef(parent?.value ?? null);
  useLayoutEffect(() => {
    const path = elbow.current;
    const was = drawn.current;
    drawn.current = parent?.value ?? null;
    if (!path || !parent || was === parent.value || reducedMotion()) return;
    const moves = [path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 560, delay: 60, easing: SMOOTH, fill: "backwards" })];
    [...(chips.current?.children ?? [])].forEach((chip, i) => {
      moves.push(
        chip.animate(
          [
            { opacity: 0, translate: "0 6px", filter: "blur(6px)" },
            { opacity: 1, translate: "0 0", filter: "blur(0)" },
          ],
          { duration: 480, delay: 220 + i * 60, easing: SMOOTH, fill: "backwards" },
        ),
      );
    });
    return () => moves.forEach((move) => move.cancel());
  }, [parent]);

  return (
    <div className={cn("relative", className)} {...props}>
      <Select
        label={firstLabel}
        prefix={firstLabel}
        options={firstChoices}
        value={first ?? ANY}
        onChange={(next) => onChange([next === ANY ? null : next, null])}
        formatCount={formatCount}
        countLabel={countLabel}
      />
      <div className="relative mt-2 pl-7">
        <svg
          aria-hidden="true"
          width="28"
          height="30"
          viewBox="0 0 28 30"
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="pointer-events-none absolute -top-2 left-0 overflow-visible"
        >
          <path d="M14 0v22a8 8 0 0 0 8 8h6" className="stroke-[var(--fu-line,#404040)]" />
          <path
            ref={elbow}
            d="M14 0v22a8 8 0 0 0 8 8h6"
            pathLength={1}
            strokeDasharray="1"
            className={cn(
              "stroke-[var(--fu-accent-soft,#8FAAFF)] transition-[opacity] duration-300 motion-reduce:transition-none",
              parent ? "opacity-100" : "opacity-0",
            )}
          />
        </svg>
        <Select
          label={secondLabel}
          prefix={secondLabel}
          options={secondChoices}
          value={second ?? ANY}
          onChange={(next) => onChange([first, next === ANY ? null : next])}
          placeholder={parent ? undefined : waitingText}
          waiting={!parent}
          emptyText={waitingText}
          heading={parent ? secondHeading(parent) : undefined}
          formatCount={formatCount}
          countLabel={countLabel}
        />
      </div>
      {picks.length > 0 && (
        <div ref={chips} role="group" aria-label={popularLabel} className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-7">
          <span aria-hidden="true" className="mr-1 text-[12px] leading-4 font-medium text-[var(--fu-dim,#8C8C8C)]">
            {popularLabel}
          </span>
          {picks.map((child) => {
            const on = child.value === second;
            return (
              <button
                key={child.value}
                type="button"
                aria-pressed={on}
                aria-label={`${child.label}, ${countLabel(child.count)}`}
                onClick={() => onChange([first, on ? null : child.value])}
                className={cn(
                  "relative isolate inline-flex h-8 min-w-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-[9px] border px-2.5 text-[13px] leading-5 font-medium",
                  "transition-[border-color,color] duration-200 motion-reduce:transition-none",
                  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
                  "pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1.5 pointer-coarse:after:content-['']",
                  on
                    ? "border-[var(--fu-accent-soft,#8FAAFF)] text-[var(--fu-accent-pale,#D1DDFF)]"
                    : "border-[var(--fu-line,#404040)] text-[var(--fu-text,#F8F5F1)] hover:border-[var(--fu-control-border,#737373)]",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-0 -z-10 bg-[var(--fu-selected,#1F2747)] transition-[opacity] duration-200 motion-reduce:transition-none",
                    on ? "opacity-100" : "opacity-0",
                  )}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute bottom-0 left-0 h-[2px] transition-[width,background-color] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                    on ? "bg-[var(--fu-accent-soft,#8FAAFF)]" : "bg-[var(--fu-accent-soft,#8FAAFF)]/45",
                  )}
                  style={{ width: `${most > 0 ? (child.count / most) * 100 : 0}%` }}
                />
                <span className="truncate">{child.label}</span>
                <span className={cn("tabular-nums font-normal", on ? "text-[var(--fu-accent-soft,#8FAAFF)]" : "text-[var(--fu-dim,#8C8C8C)]")}>
                  {formatCount(child.count)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
