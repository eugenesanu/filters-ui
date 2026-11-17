"use client";

import { useState } from "react";
import { StageControlRow, useStage, useStageFrame } from "@/components/stage/stage-controls";
import { formatsFor } from "@/registry/lib/format";
import { CARS, COLOR_PAINTS } from "@/registry/demo/cars";
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
import { AllFilters, type FilterGroup, type FilterValue } from "@/registry/filters/all-filters";
import { CarFilterBody } from "@/components/stage/car-filter";

const GROUPS: { label: string; facets: CarFacet[] }[] = [
  { label: "Price and age", facets: ["price", "year", "km", "condition"] },
  { label: "Model and body", facets: ["make", "body", "seats", "color"] },
  { label: "Engine", facets: ["fuel", "drive", "transmission"] },
];

// Listed is not in the groups, so it needs no hint or keywords.
const HINTS: Partial<Record<CarFacet, string>> = {
  price: "Drag the handles or type a price.",
  year: "The oldest and newest model year.",
  km: "The most kilometres you would take.",
  condition: "Pick one, or Any.",
  make: "Search, then tick makes and models.",
  body: "Pick one or more.",
  seats: "The fewest seats you need.",
  color: "Pick one or more.",
  fuel: "Pick one or more.",
  drive: "Pick one or more.",
  transmission: "Pick one, or Any.",
};

const KEYWORDS: Partial<Record<CarFacet, string[]>> = {
  price: ["cost", "budget", "money"],
  year: ["age", "model year", "old", "new"],
  km: ["mileage", "miles", "odometer", "distance"],
  condition: ["new", "used"],
  make: ["brand", "model"],
  body: ["shape", "type", "suv", "sedan", "truck", "van"],
  seats: ["people", "family", "seat"],
  color: ["color", "paint"],
  fuel: ["gas", "hybrid", "electric", "diesel", "ev"],
  drive: ["awd", "4wd", "fwd", "rwd", "wheel"],
  transmission: ["gearbox", "manual", "automatic"],
};

export const ALL_FILTERS_PRESET: CarFilters = {
  ...EMPTY_CAR_FILTERS,
  priceMin: 15000,
  priceMax: 45000,
  makes: [
    { make: "Toyota", models: [] },
    { make: "Honda", models: [] },
  ],
  bodies: ["SUV"],
};

/** Each set value as a chip; lists get one chip per value, ranges one chip for the range. */
function valuesOf(f: CarFilters, facet: CarFacet, set: (next: (f: CarFilters) => CarFilters) => void, locale?: string): FilterValue[] {
  const one = (): FilterValue[] => {
    const label = summaryOf(f, facet, locale);
    return label ? [{ key: facet, label: facet === "seats" ? `${label} seats` : label, onRemove: () => set((x) => clearFacet(x, facet)) }] : [];
  };
  switch (facet) {
    case "body":
      return f.bodies.map((b) => ({ key: b, label: b, onRemove: () => set((x) => ({ ...x, bodies: x.bodies.filter((v) => v !== b) })) }));
    case "fuel":
      return f.fuels.map((v) => ({ key: v, label: v, onRemove: () => set((x) => ({ ...x, fuels: x.fuels.filter((w) => w !== v) })) }));
    case "drive":
      return f.drives.map((v) => ({ key: v, label: v, onRemove: () => set((x) => ({ ...x, drives: x.drives.filter((w) => w !== v) })) }));
    case "color":
      return f.colors.map((c) => ({ key: c, label: c, color: COLOR_PAINTS[c], onRemove: () => set((x) => ({ ...x, colors: x.colors.filter((w) => w !== c) })) }));
    case "make":
      // A make narrowed to models shows each model; taking the last model off drops the make, never widens it.
      return f.makes.flatMap((pick) =>
        pick.models.length
          ? pick.models.map((model) => ({
              key: `${pick.make}/${model}`,
              label: model,
              onRemove: () =>
                set((x) => ({
                  ...x,
                  makes: x.makes.flatMap((p) => {
                    if (p.make !== pick.make) return [p];
                    const models = p.models.filter((m) => m !== model);
                    return models.length ? [{ ...p, models }] : [];
                  }),
                })),
            }))
          : [{ key: pick.make, label: pick.make, onRemove: () => set((x) => ({ ...x, makes: x.makes.filter((p) => p.make !== pick.make) })) }],
      );
    default:
      return one();
  }
}

export function AllFiltersStage() {
  const frame = useStageFrame();
  const { locale } = useStage();
  const f = carFormats(locale);
  const n = formatsFor(locale).number;
  const [filters, setFilters] = useState<CarFilters>(ALL_FILTERS_PRESET);
  const [round, setRound] = useState(0);
  const [shown, setShown] = useState<number | null>(null);
  const patch = (p: Partial<CarFilters>) => setFilters((f) => ({ ...f, ...p }));
  const matches = matchingCars(filters);

  const groups: FilterGroup[] = GROUPS.map(({ label, facets }) => ({
    label,
    filters: facets.map((facet) => ({
      id: facet,
      label: CAR_FACET_TITLES[facet],
      hint: HINTS[facet],
      keywords: KEYWORDS[facet],
      values: valuesOf(filters, facet, setFilters, locale),
      onClear: () => setFilters((f) => clearFacet(f, facet)),
      content: <CarFilterBody facet={facet} filters={filters} set={patch} locale={locale} />,
    })),
  }));

  return (
    <section aria-label="Try it" className="relative flex h-full min-h-[360px] flex-col rounded-[24px] border border-card bg-panel">
      <div className="flex min-h-12 items-center justify-end gap-3 px-3 pt-3">
        <button
          type="button"
          onClick={() => {
            setFilters(ALL_FILTERS_PRESET);
            setShown(null);
            setRound((n) => n + 1);
          }}
          className="h-9 shrink-0 cursor-pointer rounded-[10px] px-3 text-[14px] font-medium leading-5 text-dim transition-[color,background-color] duration-200 ease-smooth hover:bg-wash hover:text-text"
        >
          Reset
        </button>
      </div>
      <div {...frame} className="flex-1 px-4 pb-0 pt-1 sm:px-6">
        <AllFilters
          locale={locale}
          key={round}
          groups={groups}
          defaultPicked="body"
          height={500}
          showLabel={`Show ${f.carCount(matches.length)}`}
          onShow={() => setShown(matches.length)}
          onClearAll={() => setFilters(EMPTY_CAR_FILTERS)}
          className="bg-page"
        />
        <p aria-live="polite" className="mt-4 h-5 ps-1 text-[14px] leading-5 text-dim">
          {shown !== null && (
            <>
              {n(shown)} {shown === 1 ? "car" : "cars"} of {n(CARS.length)} sent to onShow
            </>
          )}
        </p>
      </div>
      <StageControlRow />
    </section>
  );
}
