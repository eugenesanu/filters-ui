"use client";

import type { HTMLAttributes } from "react";
import { RangeHistogram } from "./range-histogram";

export type UpperLimitProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
  min: number;
  /** The top of the scale. A limit here, or null, means no limit. */
  max: number;
  step: number;
  /** The limit, or null for none. */
  value: number | null;
  onChange: (value: number | null) => void;
  /** Item count per bar, spread evenly from min to max. */
  buckets?: readonly number[];
  /** Field, tooltip and screen-reader text for a value, e.g. "50,000 km". */
  format?: (value: number) => string;
  /** Reads a typed value. Default: the first number in the text, with an optional k or m suffix. */
  parse?: (text: string) => number | null;
  /** Tooltip text while there is no limit. Default "Any". */
  openLabel?: string;
  /** Field placeholder. Default "Maximum". */
  placeholder?: string;
  /** Accessible name of the handle and the field. Default: the placeholder. */
  label?: string;
  /** Bar width as a share of its slot, so a chart with few bars can keep the rhythm of a denser one. Default 1. */
  barScale?: number;
  disabled?: boolean;
};

/**
 * One upper limit: a bar chart with a single handle and one typed field under it, kept in step both ways.
 * A typed value snaps to the step and stays at least one step above min; an empty field, or the top, is no limit.
 */
export function UpperLimit({
  value,
  onChange,
  openLabel = "Any",
  placeholder = "Maximum",
  label,
  ...props
}: UpperLimitProps) {
  return (
    <RangeHistogram
      single
      value={[null, value]}
      onChange={([, high]) => onChange(high)}
      openLabel={openLabel}
      placeholders={{ high: placeholder }}
      labels={{ high: label ?? placeholder }}
      {...props}
    />
  );
}
