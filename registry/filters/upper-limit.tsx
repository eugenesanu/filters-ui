"use client";

import type { HTMLAttributes } from "react";
import type { StateProps } from "../ui/status-frame";
import { RangeHistogram } from "./range-histogram";

export type UpperLimitProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> &
  StateProps & {
  min: number;
  /** The top of the scale. A limit here, or null, means no limit. */
  max: number;
  step: number;
  /** The limit, or null for none. */
  value: number | null;
  onChange: (value: number | null) => void;
  /** Item count per bar, spread evenly from min to max. */
  buckets?: readonly number[];
  /** Field, tooltip and screen-reader text for a value, e.g. "50,000 km". Default: the number in the locale. */
  format?: (value: number) => string;
  /** Reads a typed value. Default: the first number in the text, read with the locale's marks, with an optional k or m suffix. */
  parse?: (text: string) => number | null;
  /** Formats and reads numbers by default, e.g. "de-DE". Default "en-US". */
  locale?: string;
  /** Tooltip text while there is no limit. Default "Any". */
  openLabel?: string;
  /** Field placeholder. Default "Maximum". */
  placeholder?: string;
  /** Accessible name of the handle and the field. Default: the placeholder. */
  label?: string;
  /** Bar width as a share of its slot, so a chart with few bars can keep the rhythm of a denser one. Default 1. */
  barScale?: number;
};

/**
 * One upper limit: a bar chart with a single handle and one typed field under it, kept in step both ways.
 * A typed value snaps to the step and stays at least one step above min; an empty field, or the top, is no limit.
 * The states (status, onRetry, errorText, emptyText, disabled) are the price range's: "Couldn't load the counts." and
 * "No items to show." by default.
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
