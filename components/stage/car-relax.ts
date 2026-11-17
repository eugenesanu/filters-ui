import {
  CAR_FACET_TITLES,
  KM_MAX,
  KM_STEP,
  PRICE_MAX,
  PRICE_STEP,
  SEAT_MINIMUMS,
  YEARS,
  carFacets,
  clearFacet,
  summaryOf,
  type CarFacet,
  type CarFilters,
} from "@/registry/demo/cars-facets";
import type { Car } from "@/registry/demo/cars";
import type { RelaxFacet, RelaxMap, RelaxStep } from "@/registry/lib/relax";

const between = (from: number, to: number, step: number) => {
  const out: number[] = [];
  for (let v = from; step > 0 ? v <= to : v >= to; v += step) out.push(v);
  return out;
};

// Each step is worded as the facet's own summary would read after it, so the fix and the card always agree.
const stepsOf = (f: CarFilters, facet: CarFacet, patches: Partial<CarFilters>[], locale?: string): RelaxStep<CarFilters>[] => [
  ...patches.map((patch) => ({ value: summaryOf({ ...f, ...patch }, facet, locale) ?? "Any", apply: (s: CarFilters) => ({ ...s, ...patch }) })),
  { value: "Any", apply: (s: CarFilters) => clearFacet(s, facet) },
];

/** How each car filter loosens: limits step outwards one notch at a time, lists go straight to Any. Values follow the locale. */
export function carRelax(locale?: string): RelaxMap<CarFilters> {
  const facet = (key: CarFacet, steps: (f: CarFilters) => Partial<CarFilters>[] = () => []): RelaxFacet<CarFilters> => ({
    label: CAR_FACET_TITLES[key],
    value: (f) => summaryOf(f, key, locale),
    steps: (f) => (summaryOf(f, key) === null ? [] : stepsOf(f, key, steps(f), locale)),
  });
  return {
    price: facet("price", (f) =>
      f.priceMax !== null
        ? between(f.priceMax + PRICE_STEP, PRICE_MAX - PRICE_STEP, PRICE_STEP).map((priceMax) => ({ priceMax }))
        : f.priceMin !== null
          ? between(f.priceMin - PRICE_STEP, PRICE_STEP, -PRICE_STEP).map((priceMin) => ({ priceMin }))
          : [],
    ),
    year: facet("year", (f) =>
      f.yearMin !== null ? between(f.yearMin - 1, YEARS[1], -1).map((yearMin) => ({ yearMin })) : [],
    ),
    km: facet("km", (f) => (f.kmMax !== null ? between(f.kmMax + KM_STEP, KM_MAX - KM_STEP, KM_STEP).map((kmMax) => ({ kmMax })) : [])),
    seats: facet("seats", (f) => (f.seatsMin !== null ? SEAT_MINIMUMS.filter((n) => n < f.seatsMin!).reverse().map((seatsMin) => ({ seatsMin })) : [])),
    condition: facet("condition"),
    make: facet("make"),
    body: facet("body"),
    fuel: facet("fuel"),
    drive: facet("drive"),
    transmission: facet("transmission"),
    color: facet("color"),
  };
}

export const carMatches = (car: Car, f: CarFilters) => carFacets.matches(car, f);
