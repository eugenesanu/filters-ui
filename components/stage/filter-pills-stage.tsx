"use client";

import { useState } from "react";
import { StageControlRow, useStage, useStageFrame } from "@/components/stage/stage-controls";
import { formatsFor } from "@/registry/lib/format";
import { CARS } from "@/registry/demo/cars";
import {
  CAR_FACET_TITLES,
  EMPTY_CAR_FILTERS,
  clearFacet,
  carFormats,
  matchingCars,
  summaryOf,
  type CarFacet,
  type CarFilters,
} from "@/registry/demo/cars-facets";
import { FilterPills, type FilterPill } from "@/registry/filters/filter-pills";
import { SlidersIcon } from "@/registry/ui/icons";
import { TextSwap } from "@/registry/ui/text-swap";
import { CarFilterBody } from "@/components/stage/car-filter";

/** The pills in the bar, then the filters "More filters" holds. */
const BAR: { facet: CarFacet; width: number }[] = [
  { facet: "price", width: 360 },
  { facet: "make", width: 340 },
  { facet: "body", width: 320 },
  { facet: "year", width: 360 },
  { facet: "fuel", width: 320 },
];
const MORE: CarFacet[] = ["km", "seats", "condition", "drive", "transmission", "color"];

export const PILLS_PRESET: CarFilters = { ...EMPTY_CAR_FILTERS, priceMin: 15000, priceMax: 45000, bodies: ["SUV"] };

const RESET =
  "h-9 shrink-0 cursor-pointer rounded-[10px] px-3 text-[14px] font-medium leading-5 text-dim transition-[color,background-color] duration-200 ease-smooth hover:bg-wash hover:text-text";

/** One filter inside "More filters": its title and value, or Clear, over its body. */
function MoreSection({ facet, filters, set, onClear }: { facet: CarFacet; filters: CarFilters; set: (patch: Partial<CarFilters>) => void; onClear: () => void }) {
  const { locale } = useStage();
  const summary = summaryOf(filters, facet, locale);
  return (
    <section aria-label={CAR_FACET_TITLES[facet]} className="border-t border-card-border py-4 first:border-t-0 first:pt-0 last:pb-1">
      <div className="mb-3 flex h-6 items-center justify-between gap-3">
        <h3 className="m-0 text-[15px] font-semibold leading-5 text-text">{CAR_FACET_TITLES[facet]}</h3>
        {summary && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${CAR_FACET_TITLES[facet].toLowerCase()}`}
            className="group/clear relative -me-1 grid h-6 cursor-pointer justify-items-end rounded-[6px] px-1 text-[14px] leading-6 text-accent-soft"
          >
            <span className="[grid-area:1/1] transition-[opacity,filter,translate] duration-150 group-hover/clear:-translate-y-1 group-hover/clear:opacity-0 group-hover/clear:blur-[2px]">
              {summary}
            </span>
            <span className="[grid-area:1/1] translate-y-1 font-medium opacity-0 blur-[2px] transition-[opacity,filter,translate] duration-150 group-hover/clear:translate-y-0 group-hover/clear:opacity-100 group-hover/clear:blur-none">
              Clear
            </span>
          </button>
        )}
      </div>
      <CarFilterBody facet={facet} filters={filters} set={set} locale={locale} />
    </section>
  );
}

function ResultList({ filters }: { filters: CarFilters }) {
  const { locale } = useStage();
  const f = carFormats(locale);
  const year = formatsFor(locale).plain;
  const cars = [...matchingCars(filters)].sort((a, b) => b.year - a.year || a.price - b.price).slice(0, 4);
  return (
    <ul aria-label="Matching cars" className="mt-3 rounded-[24px] border border-card-border bg-card p-2 [mask-image:linear-gradient(to_bottom,#000_60%,transparent)]">
      {cars.map((car) => (
        <li key={car.id} className="flex h-14 items-center gap-3 px-3 tabular-nums">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium leading-5 text-text">
              {car.make} {car.model}
            </span>
            <span className="block text-[13px] leading-5 text-mute">
              {year(car.year)}
              {car.km !== null && <> · {f.km(car.km)}</>}
            </span>
          </span>
          <span className="shrink-0 text-[15px] font-medium leading-5 text-text">{f.money(car.price)}</span>
        </li>
      ))}
      {cars.length === 0 && <li className="flex h-14 items-center px-3 text-[15px] leading-5 text-mute">No cars match. Clear a filter to see more.</li>}
    </ul>
  );
}

export function FilterPillsStage() {
  const frame = useStageFrame();
  const { locale } = useStage();
  const f = carFormats(locale);
  const n = formatsFor(locale).number;
  const [filters, setFilters] = useState<CarFilters>(PILLS_PRESET);
  const [round, setRound] = useState(0);
  const set = (patch: Partial<CarFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const matches = matchingCars(filters).length;
  const moreSet = MORE.filter((facet) => summaryOf(filters, facet, locale) !== null).length;

  const pills: FilterPill[] = [
    ...BAR.map(({ facet, width }) => ({
      id: facet,
      label: CAR_FACET_TITLES[facet],
      summary: summaryOf(filters, facet, locale),
      onClear: () => setFilters((f) => clearFacet(f, facet)),
      width,
      content: <CarFilterBody facet={facet} filters={filters} set={set} locale={locale} />,
    })),
    {
      id: "more",
      label: "More filters",
      icon: <SlidersIcon size={16} />,
      count: moreSet,
      onClear: () => setFilters((f) => MORE.reduce(clearFacet, f)),
      width: 400,
      content: (
        <div>
          {MORE.map((facet) => (
            <MoreSection key={facet} facet={facet} filters={filters} set={set} onClear={() => setFilters((f) => clearFacet(f, facet))} />
          ))}
        </div>
      ),
    },
  ];

  return (
    <section aria-label="Try it" className="relative flex h-full min-h-[560px] flex-col rounded-[24px] border border-card bg-panel">
      <div {...frame} className="flex-1 px-4 pt-6 pb-0 sm:px-8 sm:pt-8">
        <FilterPills
          locale={locale}
          key={round}
          label="Car filters"
          pills={pills}
          defaultOpen="price"
          showLabel={`Show ${f.carCount(matches)}`}
          onClearAll={() => setFilters(EMPTY_CAR_FILTERS)}
        />
        <div className="mt-4 flex items-center justify-between gap-3 ps-1">
          <p aria-live="polite" className="text-[14px] leading-5 text-dim tabular-nums">
            <TextSwap className="font-medium text-text">{n(matches)}</TextSwap> of {n(CARS.length)} cars
          </p>
          <button
            type="button"
            onClick={() => {
              setFilters(PILLS_PRESET);
              setRound((n) => n + 1);
            }}
            className={`${RESET} -me-3`}
          >
            Reset
          </button>
        </div>
        <ResultList filters={filters} />
      </div>
      <StageControlRow />
    </section>
  );
}
