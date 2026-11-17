"use client";

import { useState, type ReactNode } from "react";
import { useStage } from "@/components/stage/stage-controls";
import { formatsFor } from "@/registry/lib/format";
import { CARS } from "@/registry/demo/cars";
import { EMPTY_CAR_FILTERS, carFormats, listedCounts, matchingCars, type CarFilters } from "@/registry/demo/cars-facets";
import { DateRange, daysBetween, formatDateRange, resolveDateRange, useToday, type DateRangeValue } from "@/registry/filters/date-range";
import { FilterCard } from "@/registry/ui/filter-card";
import { TextSwap } from "@/registry/ui/text-swap";

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
  const { locale } = useStage();
  const f = carFormats(locale);
  const n = formatsFor(locale).number;
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
        summary={formatDateRange(value, undefined, today, locale)}
        onClear={() => setValue(null)}
        open={open}
        onOpenChange={setOpen}
        headingLevel={2}
      >
        <DateRange
          locale={locale}
          label="Listed"
          value={value}
          onChange={setValue}
          countOf={(day) => (today ? (perDay.get(daysBetween(day, today)) ?? 0) : 0)}
          total={[...perDay.values()].reduce((n, k) => n + k, 0)}
          countLabel={f.carCount}
        />
      </FilterCard>
      <div className="mt-3 flex items-center justify-between gap-3 ps-4">
        <p className="text-[14px] leading-5 text-dim tabular-nums">
          <TextSwap className="font-medium text-text">{n(matches)}</TextSwap> of {n(CARS.length)} cars
        </p>
        {reset}
      </div>
    </div>
  );
}
