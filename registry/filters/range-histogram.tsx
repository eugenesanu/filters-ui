"use client";

import { useState, type HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { RangeChart, type RangeValue } from "../ui/range-chart";
import { TextField } from "../ui/text-field";

export type RangeHistogramProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
  min: number;
  max: number;
  step: number;
  value: RangeValue;
  onChange: (value: RangeValue) => void;
  /** Item count per bar, spread evenly from min to max. */
  buckets?: readonly number[];
  /** Field, tooltip and screen-reader text for a value, e.g. "$45,000". */
  format?: (value: number) => string;
  /** Reads a typed value. Default: the first number in the text, with an optional k or m suffix, or null when there is none. */
  parse?: (text: string) => number | null;
  /** Tooltip text while the high end is open. Default: the top value and a plus. */
  openLabel?: string;
  /** One handle and one field, for an upper limit only. */
  single?: boolean;
  /** Field placeholders. Default "Minimum" and "Maximum". */
  placeholders?: { low?: string; high?: string };
  /** Accessible names of the handles and fields, e.g. "Lowest price". Default: the placeholders. */
  labels?: { low?: string; high?: string };
  /** Bar width as a share of its slot, so a chart with few bars can keep the rhythm of a denser one. Default 1. */
  barScale?: number;
  disabled?: boolean;
};

const defaultFormat = (value: number) => new Intl.NumberFormat("en-US").format(value);
// "45000", "45,000", "$45k", "45.5k" and "1.2m" all read as numbers; a unit such as "km" or "miles" is not a suffix.
const defaultParse = (text: string) => {
  const match = text.replace(/[\s,]/g, "").match(/(\d*\.?\d+)([km](?![a-z]))?/i);
  if (!match) return null;
  const scale = match[2] ? (match[2].toLowerCase() === "k" ? 1e3 : 1e6) : 1;
  return Number(match[1]) * scale;
};

/** A range chart with typed Minimum and Maximum fields under it, kept in step both ways. */
export function RangeHistogram({
  min,
  max,
  step,
  value,
  onChange,
  buckets,
  format = defaultFormat,
  parse = defaultParse,
  openLabel,
  single = false,
  placeholders,
  labels,
  barScale,
  disabled,
  className,
  ...props
}: RangeHistogramProps) {
  const lowPlaceholder = placeholders?.low ?? "Minimum";
  const highPlaceholder = placeholders?.high ?? "Maximum";
  const lowLabel = labels?.low ?? lowPlaceholder;
  const highLabel = labels?.high ?? highPlaceholder;

  // A typed number snaps outwards to the step, so nothing typed is left out, and stays inside the range, one step clear of the other end.
  // An empty field, or a value at the very end, leaves that end open.
  const commit = (end: 0 | 1, typed: number | null) => {
    const next: RangeValue = [single ? null : value[0], value[1]];
    if (typed === null) next[end] = null;
    else {
      const round = end === 0 ? Math.floor : Math.ceil;
      const snapped = Math.min(max, Math.max(min, min + round((typed - min) / step) * step));
      if (end === 0) {
        const ceiling = (value[1] ?? max) - step;
        next[0] = snapped <= min ? null : Math.min(snapped, ceiling);
      } else {
        const floor = (single ? min : (value[0] ?? min)) + step;
        next[1] = snapped >= max ? null : Math.max(snapped, floor);
      }
    }
    if (next[0] !== value[0] || next[1] !== value[1]) onChange(next);
  };

  return (
    <div className={cn("pt-1", className)} {...props}>
      <RangeChart
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        buckets={buckets}
        format={format}
        openLabel={openLabel}
        single={single}
        labels={{ low: lowLabel, high: highLabel }}
        barScale={barScale}
        disabled={disabled}
      />
      <div className={cn("mt-3 grid gap-2", single ? "grid-cols-1" : "grid-cols-2")}>
        {!single && (
          <RangeField
            value={value[0]}
            format={format}
            parse={parse}
            label={lowLabel}
            placeholder={lowPlaceholder}
            onCommit={(typed) => commit(0, typed)}
            disabled={disabled}
          />
        )}
        <RangeField
          value={value[1]}
          format={format}
          parse={parse}
          label={highLabel}
          placeholder={highPlaceholder}
          onCommit={(typed) => commit(1, typed)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

type RangeFieldProps = {
  value: number | null;
  format: (value: number) => string;
  parse: (text: string) => number | null;
  label: string;
  placeholder: string;
  onCommit: (value: number | null) => void;
  disabled?: boolean;
};

// Shows the formatted value; while focused it holds what the person types, and commits on Enter or blur.
function RangeField({ value, format, parse, label, placeholder, onCommit, disabled }: RangeFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = value === null ? "" : format(value);

  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    const typed = draft.trim() ? parse(draft) : null;
    // Text that reads as no number puts the field back rather than dropping the limit.
    if (draft.trim() && (typed === null || !Number.isFinite(typed))) return;
    onCommit(typed);
  };

  return (
    <TextField
      label={label}
      placeholder={placeholder}
      inputMode="numeric"
      autoComplete="off"
      enterKeyHint="done"
      value={draft ?? shown}
      disabled={disabled}
      onChange={setDraft}
      onClear={() => {
        setDraft(null);
        onCommit(null);
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        } else if (event.key === "Escape" && draft !== null) {
          event.stopPropagation();
          setDraft(null);
        }
      }}
      inputClassName="tabular-nums"
    />
  );
}
