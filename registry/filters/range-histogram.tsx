"use client";

import { useState, type HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { formatsFor } from "../lib/format";
import type { NumberDrag } from "../ui/drag-handle";
import { RangeChart, type RangeValue } from "../ui/range-chart";
import { StatusFrame, type StateProps } from "../ui/status-frame";
import { TextField } from "../ui/text-field";

export type RangeHistogramProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> &
  StateProps & {
  min: number;
  max: number;
  step: number;
  value: RangeValue;
  onChange: (value: RangeValue) => void;
  /** Item count per bar, spread evenly from min to max. */
  buckets?: readonly number[];
  /** Field, tooltip and screen-reader text for a value, e.g. "$45,000". Default: the number in the locale. */
  format?: (value: number) => string;
  /**
   * Reads a typed value. Default: the first number in the text, read with the locale's marks ("45.000" is 45000 in
   * de-DE), with an optional k or m suffix, or null when there is none.
   */
  parse?: (text: string) => number | null;
  /** Formats and reads numbers by default, e.g. "de-DE". Default "en-US". */
  locale?: string;
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
  /** Says loading and errors out loud. Off when the chart sits inside another filter that says them once, as in Budget. Default true. */
  announce?: boolean;
};

/** A range chart with typed Minimum and Maximum fields under it, kept in step both ways. */
export function RangeHistogram({
  min,
  max,
  step,
  value,
  onChange,
  buckets,
  format: formatProp,
  parse: parseProp,
  locale,
  openLabel,
  single = false,
  placeholders,
  labels,
  barScale,
  status = "ready",
  onRetry,
  errorText = "Couldn't load the counts.",
  emptyText = "No items to show",
  disabled = false,
  announce = true,
  className,
  ...props
}: RangeHistogramProps) {
  const formats = formatsFor(locale);
  const format = formatProp ?? formats.number;
  const parse = parseProp ?? formats.readNumber;
  const lowPlaceholder = placeholders?.low ?? "Minimum";
  const highPlaceholder = placeholders?.high ?? "Maximum";
  const lowLabel = labels?.low ?? lowPlaceholder;
  const highLabel = labels?.high ?? highPlaceholder;
  // The handle a field is dragging, and where: the chart moves it and raises its bars as in a drag of its own.
  const [held, setHeld] = useState<{ handle: "low" | "high"; value: number } | null>(null);
  const holding = (handle: "low" | "high") => (at: number | null) => setHeld(at === null ? null : { handle, value: at });

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

  // The frame dims and blocks everything while disabled, so the chart and fields are not dimmed a second time.
  return (
    <div className={cn("pt-1", className)} {...props}>
      <StatusFrame status={status} onRetry={onRetry} errorText={errorText} disabled={disabled} announce={announce}>
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
          held={held}
          locale={locale}
          emptyText={emptyText}
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
              scale={{ min, max, step, emptyAt: "min", ceiling: (value[1] ?? max) - step, onHold: holding("low") }}
            />
          )}
          <RangeField
            value={value[1]}
            format={format}
            parse={parse}
            label={highLabel}
            placeholder={highPlaceholder}
            onCommit={(typed) => commit(1, typed)}
            scale={{ min, max, step, emptyAt: "max", floor: (single ? min : (value[0] ?? min)) + step, onHold: holding("high") }}
          />
        </div>
      </StatusFrame>
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
  /** The scale the field's drag handle moves along. */
  scale: Omit<NumberDrag, "value" | "onChange">;
};

// Shows the formatted value; while focused it holds what the person types, and commits on Enter or blur. Dragging its
// handle commits each step.
function RangeField({ value, format, parse, label, placeholder, onCommit, scale }: RangeFieldProps) {
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
      onChange={setDraft}
      onClear={() => {
        setDraft(null);
        onCommit(null);
      }}
      onBlur={commit}
      drag={{
        ...scale,
        value,
        onChange: (dragged) => {
          setDraft(null);
          onCommit(dragged);
        },
      }}
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
