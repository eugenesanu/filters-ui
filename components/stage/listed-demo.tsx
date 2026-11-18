"use client";

import { useState, type ReactNode } from "react";
import { useStage, useStageStatus, useUnpickedAtZero } from "@/components/stage/stage-controls";
import { StageCount } from "@/components/stage/stage-count";
import { ResetButton, StagePanel } from "@/components/stage/stage-panel";
import { CARS } from "@/registry/demo/cars";
import { EMPTY_CAR_FILTERS, carFormats, listedCounts, matchingCars, type CarFilters } from "@/registry/demo/cars-facets";
import { DateRange, daysBetween, formatDateRange, resolveDateRange, useToday, type DateRangeValue } from "@/registry/filters/date-range";
import { FilterCard } from "@/registry/ui/filter-card";

/** The stage opens as the tile shows it: the last 30 days, a band that fills the top of any month. */
export const LISTED_PRESET: DateRangeValue = { last: 30 };

/** The cars' Listed facet for a value. A fixed range needs today; until the browser knows it, it filters nothing. */
const countNone = () => 0;

export function listedFilters(value: DateRangeValue, today: string | null): CarFilters {
  if (!value) return EMPTY_CAR_FILTERS;
  if ("last" in value) return { ...EMPTY_CAR_FILTERS, listedMin: 0, listedMax: value.last - 1 };
  const range = today ? resolveDateRange(value, today) : null;
  if (!range || !today) return EMPTY_CAR_FILTERS;
  return { ...EMPTY_CAR_FILTERS, listedMin: Math.max(0, daysBetween(range.end, today)), listedMax: daysBetween(range.start, today) };
}

/** Preset words for the long-labels state. */
const LONG_PRESETS = [
  { label: "Listed today, since midnight", last: 1 },
  { label: "In the last three days", last: 3 },
  { label: "Over the past full week", last: 7 },
  { label: "Within the last thirty days", last: 30 },
];

/** The Listed card on the demo cars, with the result count and a Reset under it. */
export function ListedDemo({ reset, wide = false }: { reset: ReactNode; wide?: boolean }) {
  const { locale } = useStage();
  const { state, ...stage } = useStageStatus();
  const f = carFormats(locale);
  const long = state === "long-labels";
  const zero = state === "zero-results";
  const today = useToday();
  const [value, setValue] = useState<DateRangeValue>(LISTED_PRESET);
  const [open, setOpen] = useState(true);
  useUnpickedAtZero<DateRangeValue>(state, value, setValue, () => null);
  const filters = listedFilters(value, today);
  const perDay = listedCounts(filters);
  const matches = matchingCars(filters).length;

  return (
    <div className={wide ? "flex w-full max-w-[600px] flex-col" : "flex w-full max-w-[320px] flex-col"}>
      <FilterCard
        title="Listed"
        summary={formatDateRange(value, long ? LONG_PRESETS : undefined, today, locale)}
        onClear={stage.disabled ? undefined : () => setValue(null)}
        open={open}
        onOpenChange={setOpen}
        headingLevel={2}
      >
        <DateRange
          locale={locale}
          label="Listed"
          value={value}
          onChange={setValue}
          countOf={zero ? countNone : (day) => (today ? (perDay.get(daysBetween(day, today)) ?? 0) : 0)}
          total={zero ? 0 : [...perDay.values()].reduce((n, k) => n + k, 0)}
          countLabel={f.carCount}
          presets={long ? LONG_PRESETS : undefined}
          anyLabel={long ? "Listed at any time" : undefined}
          customLabel={long ? "Pick your own first and last day" : undefined}
          {...stage}
        />
      </FilterCard>
      <div className="mt-3 flex items-center justify-between gap-3 ps-4">
        <StageCount matches={matches} total={CARS.length} stage={{ state, ...stage }} live={false} />
        {reset}
      </div>
    </div>
  );
}

export function ListedStage() {
  const [round, setRound] = useState(0);
  return (
    <StagePanel>
      <ListedDemo key={round} wide reset={<ResetButton onReset={() => setRound((n) => n + 1)} className="-me-3" />} />
    </StagePanel>
  );
}
