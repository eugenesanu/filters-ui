"use client";

import { useState, type ReactNode } from "react";
import { CARS } from "@/registry/demo/cars";
import { EMPTY_CAR_FILTERS, formatCarCount, listedCounts, matchingCars, type CarFilters } from "@/registry/demo/cars-facets";
import { DateRange, daysBetween, formatDateRange, resolveDateRange, useToday, type DateRangeValue } from "@/registry/filters/date-range";
import { FilterCard } from "@/registry/ui/filter-card";
import { TextSwap } from "@/registry/ui/text-swap";

const count = new Intl.NumberFormat("en-US");

/** The stage opens as the tile shows it: the last 30 days, a band that fills the top of any month. */
export const LISTED_PRESET: DateRangeValue = { last: 30 };

/** The cars' Listed facet for a value. A fixed range needs today; until the browser knows it, it filters nothing. */
export function listedFilters(value: DateRangeValue, today: string | null): CarFilters {
  if (!value) return EMPTY_CAR_FILTERS;
  if ("last" in value) return { ...EMPTY_CAR_FILTERS, listedMin: 0, listedMax: value.last - 1 };
  const range = today ? resolveDateRange(value, today) : null;
  if (!range || !today) return EMPTY_CAR_FILTERS;
  return { ...EMPTY_CAR_FILTERS, listedMin: Math.max(0, daysBetween(range.end, today)), listedMax: daysBetween(range.start, today) };
}

/** The Listed card on the demo cars, with the result count and a Reset under it. */
export function ListedDemo({ reset, wide = false }: { reset: ReactNode; wide?: boolean }) {
  const today = useToday();
  const [value, setValue] = useState<DateRangeValue>(LISTED_PRESET);
  const [open, setOpen] = useState(true);
  const filters = listedFilters(value, today);
  const perDay = listedCounts(filters);
  const matches = matchingCars(filters).length;

  return (
    <div className={wide ? "flex w-full max-w-[600px] flex-col" : "flex w-full max-w-[320px] flex-col"}>
      <FilterCard
        title="Listed"
        summary={formatDateRange(value, undefined, today)}
        onClear={() => setValue(null)}
        open={open}
        onOpenChange={setOpen}
        headingLevel={2}
      >
        <DateRange
          label="Listed"
          value={value}
          onChange={setValue}
          countOf={(day) => (today ? (perDay.get(daysBetween(day, today)) ?? 0) : 0)}
          total={[...perDay.values()].reduce((n, k) => n + k, 0)}
          countLabel={formatCarCount}
        />
      </FilterCard>
      <div className="mt-3 flex items-center justify-between gap-3 pl-4">
        <p className="text-[14px] leading-5 text-dim tabular-nums">
          <TextSwap className="font-medium text-text">{count.format(matches)}</TextSwap> of {count.format(CARS.length)} cars
        </p>
        {reset}
      </div>
    </div>
  );
}
