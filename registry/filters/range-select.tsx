"use client";

import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { RangeChart, type RangeValue } from "../ui/range-chart";
import { Select } from "../ui/select";

export type RangeSelectProps<V extends number> = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
  /** The values to pick from, in ascending order, e.g. model years. One bar each. */
  options: readonly V[];
  /** [from, to], both inclusive. null is an open end. */
  value: [V | null, V | null];
  onChange: (value: [V | null, V | null]) => void;
  /** Item count per option, in the order of `options`. */
  buckets?: readonly number[];
  /** Picker, tooltip and screen-reader text for a value. Default String. */
  format?: (value: V) => string;
  /** Picker order. Default "ascending"; "descending" puts the newest year first. */
  pickerOrder?: "ascending" | "descending";
  /** The open-end choice in both pickers. Default "Any". */
  anyLabel?: string;
  /** Visible picker prefixes. Default "From" and "To". */
  prefixes?: { low?: string; high?: string };
  /** Accessible names of the handles and pickers. Default: the prefixes. Keep the prefix word in them. */
  labels?: { low?: string; high?: string };
  /** Screen-reader words for a count in the pickers, e.g. "6 cars". Default "6 results". */
  countLabel?: (n: number) => string;
  /** Bar width as a share of its slot, so a chart with few bars can keep the rhythm of a denser one. Default 1. */
  barScale?: number;
  disabled?: boolean;
};

const ANY = "";

/**
 * A range over a few discrete values: a bar chart with two handles and From and To pickers under it, kept in step
 * both ways. With buckets, each picker choice shows how many items picking it would give. Handles sit between bars, so the two may hold a single value. Picking From past To moves To along
 * to the same value, and picking To before From moves From back: the pick always wins.
 */
export function RangeSelect<V extends number>({
  options,
  value,
  onChange,
  buckets,
  format = String,
  pickerOrder = "ascending",
  anyLabel = "Any",
  prefixes,
  labels,
  countLabel,
  barScale,
  disabled,
  className,
  ...props
}: RangeSelectProps<V>) {
  const n = options.length;
  const lowPrefix = prefixes?.low ?? "From";
  const highPrefix = prefixes?.high ?? "To";
  const lowLabel = labels?.low ?? lowPrefix;
  const highLabel = labels?.high ?? highPrefix;

  // The chart runs over bar edges 0..n: From at edge i is options[i]; To at edge j is options[j - 1].
  const indexOf = (v: V) => {
    const at = options.findIndex((option) => option >= v);
    return at < 0 ? n - 1 : at;
  };
  const edges: RangeValue = [value[0] === null ? null : indexOf(value[0]), value[1] === null ? null : indexOf(value[1]) + 1];

  // The oldest From and the newest To exclude nothing, so they are the open ends.
  const emit = ([low, high]: [V | null, V | null]) => {
    const next: [V | null, V | null] = [low === options[0] ? null : low, high === options[n - 1] ? null : high];
    if (next[0] !== value[0] || next[1] !== value[1]) onChange(next);
  };

  const fromEdges = ([low, high]: RangeValue) =>
    emit([low === null ? null : options[low], high === null ? null : options[high - 1]]);

  // With buckets, each choice counts what picking it would give, the other end included; a choice past the other end
  // moves it along, as the pick does.
  const within = (low: V | null, high: V | null) =>
    buckets ? options.reduce((sum, option, i) => ((low === null || option >= low) && (high === null || option <= high) ? sum + (buckets[i] ?? 0) : sum), 0) : undefined;
  const choicesFor = (end: "low" | "high") => [
    { value: ANY, label: anyLabel, count: end === "low" ? within(null, value[1]) : within(value[0], null) },
    ...(pickerOrder === "descending" ? [...options].reverse() : options).map((option) => ({
      value: String(option),
      label: format(option),
      count:
        end === "low"
          ? within(option, value[1] !== null && value[1] < option ? option : value[1])
          : within(value[0] !== null && value[0] > option ? option : value[0], option),
    })),
  ];
  const read = (text: string) => (text === ANY ? null : (options.find((option) => String(option) === text) ?? null));

  return (
    <div className={cn("pt-1", className)} {...props}>
      <RangeChart
        min={0}
        max={n}
        step={1}
        value={edges}
        onChange={fromEdges}
        buckets={buckets}
        format={(edge, handle) => format(options[Math.max(0, Math.min(n - 1, handle === "low" ? edge : edge - 1))])}
        openLabel={format(options[n - 1])}
        labels={{ low: lowLabel, high: highLabel }}
        barScale={barScale}
        disabled={disabled}
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Select
          label={lowLabel}
          prefix={lowPrefix}
          options={choicesFor("low")}
          countLabel={countLabel}
          value={value[0] === null ? ANY : String(value[0])}
          disabled={disabled}
          onChange={(text) => {
            const low = read(text);
            emit([low, low !== null && value[1] !== null && value[1] < low ? low : value[1]]);
          }}
        />
        <Select
          label={highLabel}
          prefix={highPrefix}
          options={choicesFor("high")}
          countLabel={countLabel}
          value={value[1] === null ? ANY : String(value[1])}
          disabled={disabled}
          onChange={(text) => {
            const high = read(text);
            emit([high !== null && value[0] !== null && value[0] > high ? high : value[0], high]);
          }}
        />
      </div>
    </div>
  );
}
