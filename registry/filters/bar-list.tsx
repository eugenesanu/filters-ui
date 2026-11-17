"use client";

import { useId, useState, type HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { formatsFor, resultsLabel } from "../lib/format";
import { CheckIcon, ChevronDownIcon } from "../ui/icons";
import { TextSwap } from "../ui/text-swap";

export type BarListOption<V extends string = string> = { value: V; label: string; count: number };

export type BarListProps<V extends string = string> = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
  /** The rows, in a steady order (e.g. by total count), so rows never jump while counts change. */
  options: readonly BarListOption<V>[];
  /** The values that are ticked. */
  value: readonly V[];
  /** Called with the new list, in the order of the options. */
  onChange: (value: V[]) => void;
  /** Accessible name of the list. */
  label: string;
  /** Plural word for the rows: "All 10 makes", "Fewer makes". Default "items". */
  noun?: string;
  /** How many rows show before "All N". Default 6. */
  collapsedCount?: number;
  formatCount?: (n: number) => string;
  /** Screen-reader words for a count: "6 results". */
  countLabel?: (n: number) => string;
  /** Formats the counts and their spoken words by default, e.g. "de-DE". Default "en-US". */
  locale?: string;
};

const SMOOTH = "ease-[cubic-bezier(0.22,1,0.36,1)]";

type RowProps = {
  label: string;
  count: number;
  share: number;
  checked: boolean;
  format: (n: number) => string;
  countLabel: (n: number) => string;
  onToggle: () => void;
};

// The whole row is the checkbox's label; the native box is hidden and drawn again. The bar behind the name is the row's
// count as a share of the largest one (a small share is a hairline), growing from the start edge, and eases to a new width over 480ms when other
// filters change the counts. A ticked row is tinted end to end under its bar.
function Row({ label, count, share, checked, format, countLabel, onToggle }: RowProps) {
  return (
    <label
      data-state={checked ? "on" : "off"}
      className={cn(
        "group/row relative isolate flex h-10 min-w-0 cursor-pointer items-center gap-3 rounded-[10px] pe-3 ps-3 text-[14px] leading-5 pointer-coarse:h-11",
        "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2 has-[input:focus-visible]:outline-solid has-[input:focus-visible]:outline-[var(--fu-accent-soft,#8FAAFF)]",
        "has-[input:disabled]:cursor-default transition-[opacity] duration-300 motion-reduce:transition-none",
        count === 0 && !checked && "opacity-40",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 inset-y-[2px] -z-20 rounded-[7px] bg-[var(--fu-selected,#1F2747)] transition-[opacity] duration-200 motion-reduce:transition-none",
          checked ? "opacity-100" : "opacity-0",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-[2px] inset-s-[40px] -z-10 rounded-[6px] transition-[width,background-color] duration-[480ms] motion-reduce:transition-none",
          SMOOTH,
          checked
            ? "bg-[var(--fu-accent-soft,#8FAAFF)]/15"
            : "bg-[var(--fu-share,rgb(255_255_255/0.05))] [@media(hover:hover)]:group-hover/row:bg-[var(--fu-share-hover,rgb(255_255_255/0.1))]",
        )}
        style={{ width: count > 0 ? `max(2px, calc((100% - 40px) * ${share}))` : 0 }}
      />
      <input
        type="checkbox"
        checked={checked}
        disabled={count === 0 && !checked}
        aria-label={`${label}, ${countLabel(count)}`}
        onChange={onToggle}
        className="peer absolute size-[18px] cursor-[inherit] opacity-0"
      />
      <span
        aria-hidden="true"
        className={cn(
          "grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-[var(--fu-control-border,#737373)] text-[var(--fu-accent-soft,#8FAAFF)]",
          "transition-[background-color,border-color] duration-200 motion-reduce:transition-none",
          SMOOTH,
          "[@media(hover:hover)]:group-hover/row:peer-enabled:border-[var(--fu-control-hover,#A3A3A3)]",
          "peer-checked:border-[var(--fu-accent-soft,#8FAAFF)] [@media(hover:hover)]:group-hover/row:peer-checked:border-[var(--fu-accent-soft,#8FAAFF)]",
        )}
      >
        <CheckIcon
          size={14}
          strokeWidth={3}
          className={cn(
            // The path is about 23 units long; a negative offset draws it from the short leg up.
            "[&_path]:[stroke-dasharray:23] [&_path]:[stroke-dashoffset:-23] [&_path]:transition-[stroke-dashoffset] [&_path]:duration-300 motion-reduce:[&_path]:transition-none",
            "[&_path]:ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[state=on]/row:[&_path]:[stroke-dashoffset:0]",
          )}
        />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "ms-1.5 min-w-0 flex-1 truncate transition-[color] duration-200",
          checked ? "font-medium text-[var(--fu-accent-pale,#D1DDFF)]" : "text-[var(--fu-text,#F8F5F1)]",
        )}
      >
        {label}
      </span>
      <TextSwap
        aria-hidden="true"
        className={cn(
          "shrink-0 justify-items-end text-[13px] tabular-nums transition-[color] duration-200",
          checked ? "font-medium text-[var(--fu-accent-soft,#8FAAFF)]" : "text-[var(--fu-mute,#BDBDBD)]",
        )}
      >
        {format(count)}
      </TextSwap>
    </label>
  );
}

/**
 * A checklist where a soft bar behind each row shows its count as a share of the largest, so the list reads as a
 * ranking at a glance. Bars and counts ease to their new values when other filters change them; ticked rows turn
 * accent. The first `collapsedCount` rows show; "All N" opens the rest.
 */
export function BarList<V extends string = string>({
  options,
  value,
  onChange,
  label,
  noun = "items",
  collapsedCount = 6,
  formatCount: formatCountProp,
  countLabel: countLabelProp,
  locale,
  className,
  ...props
}: BarListProps<V>) {
  const formatCount = formatCountProp ?? formatsFor(locale).number;
  const countLabel = countLabelProp ?? ((n: number) => resultsLabel(n, locale));
  const restId = useId();
  // Opens on its own when a ticked row would be hidden.
  const [all, setAll] = useState(() => options.slice(collapsedCount).some((option) => value.includes(option.value)));
  const most = Math.max(0, ...options.map((option) => option.count));

  const toggle = (v: V) => {
    const on = value.includes(v);
    onChange(options.flatMap((option) => ((option.value === v ? !on : value.includes(option.value)) ? [option.value] : [])));
  };

  const row = (option: BarListOption<V>) => (
    <li key={option.value} className="m-0 p-0">
      <Row
        label={option.label}
        count={option.count}
        share={most > 0 ? option.count / most : 0}
        checked={value.includes(option.value)}
        format={formatCount}
        countLabel={countLabel}
        onToggle={() => toggle(option.value)}
      />
    </li>
  );

  const rest = options.slice(collapsedCount);

  return (
    <div role="group" aria-label={label} className={cn("flex flex-col", className)} {...props}>
      <ul className="m-0 flex list-none flex-col p-0">{options.slice(0, collapsedCount).map(row)}</ul>
      {rest.length > 0 && (
        <>
          <div
            id={restId}
            inert={!all}
            className={cn("grid transition-[grid-template-rows] duration-[480ms] motion-reduce:transition-none", SMOOTH, all ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
          >
            <div className="min-h-0 overflow-hidden">
              <ul
                className={cn(
                  "m-0 flex list-none flex-col p-0 transition-[opacity,filter,translate] duration-[480ms] motion-reduce:transition-none",
                  SMOOTH,
                  all ? "translate-y-0 opacity-100 blur-none delay-[80ms]" : "-translate-y-1.5 opacity-0 blur-[6px]",
                )}
              >
                {rest.map(row)}
              </ul>
            </div>
          </div>
          <button
            type="button"
            aria-expanded={all}
            aria-controls={restId}
            onClick={() => setAll(!all)}
            className={cn(
              "relative mt-1 inline-flex h-9 cursor-pointer items-center gap-1 self-start rounded-[10px] px-3 text-[14px] leading-5 font-medium text-[var(--fu-accent-soft,#8FAAFF)]",
              "transition-[background-color] duration-200 motion-reduce:transition-none hover:bg-[var(--fu-wash,rgb(255_255_255/0.08))]",
              "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
              "pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1 pointer-coarse:after:content-['']",
            )}
          >
            <TextSwap>{all ? `Fewer ${noun}` : `All ${formatCount(options.length)} ${noun}`}</TextSwap>
            <ChevronDownIcon size={16} className={cn("transition-[rotate] duration-[480ms] motion-reduce:transition-none", SMOOTH, all && "rotate-180")} />
          </button>
        </>
      )}
    </div>
  );
}
