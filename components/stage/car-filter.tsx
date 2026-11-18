"use client";

import type { ReactNode } from "react";
import { BodyIcon } from "@/registry/demo/body-icons";
import { BODIES, COLORS, DRIVES, FUELS, type Condition, type Transmission } from "@/registry/demo/cars";
import {
  KM_MAX,
  KM_STEP,
  MAKES_UP_FRONT,
  PRICE_MAX,
  PRICE_MIN,
  PRICE_STEP,
  YEARS,
  bodyCounts,
  colorCounts,
  conditionOptions,
  driveCounts,
  carFormats,
  fuelCounts,
  kmBuckets,
  makeOptions,
  priceBuckets,
  seatOptions,
  transmissionOptions,
  yearBuckets,
  type CarFacet,
  type CarFilters,
} from "@/registry/demo/cars-facets";
import { ChipGroup } from "@/registry/filters/chip-group";
import { ColorSwatches } from "@/registry/filters/color-swatches";
import { IconTiles } from "@/registry/filters/icon-tiles";
import { RangeHistogram } from "@/registry/filters/range-histogram";
import { RangeSelect } from "@/registry/filters/range-select";
import { SearchableList } from "@/registry/filters/searchable-list";
import { SegmentedChoice } from "@/registry/filters/segmented-choice";
import { UpperLimit } from "@/registry/filters/upper-limit";
import type { StageStatus } from "@/components/stage/stage-controls";
import {
  BODY_STATES,
  bodyIconFor,
  bucketsInState,
  COLOR_STATES,
  DRIVE_STATES,
  FUEL_STATES,
  MAKE_STATES,
  MANY_YEARS,
  manyKmBuckets,
  manyPriceBuckets,
  manyYearBuckets,
  optionsInState,
  paintFor,
  segmentsInState,
} from "@/components/stage/state-data";

type Props = {
  facet: CarFacet;
  filters: CarFilters;
  set: (patch: Partial<CarFilters>) => void;
  /** Numbers, prices and distances follow it. Default en-US. */
  locale?: string;
  /** The stage's State switch. Left out, the filter is ready. */
  stage?: StageStatus;
};

const READY: StageStatus = { state: "ready", status: "ready", disabled: false, onRetry: () => {} };

/** One car filter's body, wired to the demo cars the way the full board wires it. */
export function CarFilterBody({ facet, filters, set, locale, stage = READY }: Props): ReactNode {
  const f = carFormats(locale);
  const { state, ...states } = stage;
  switch (facet) {
    case "price":
      return (
        <RangeHistogram
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={[filters.priceMin, filters.priceMax]}
          onChange={([priceMin, priceMax]) => set({ priceMin, priceMax })}
          buckets={bucketsInState(state, priceBuckets(filters), () => manyPriceBuckets(filters))}
          format={f.money}
          locale={locale}
          labels={{ low: "Lowest price", high: "Highest price" }}
          emptyText="No prices to show"
          {...states}
        />
      );
    case "year":
      return (
        <RangeSelect
          locale={locale}
          options={state === "many-options" ? MANY_YEARS : YEARS}
          value={[filters.yearMin, filters.yearMax]}
          onChange={([yearMin, yearMax]) => set({ yearMin, yearMax })}
          buckets={bucketsInState(state, yearBuckets(filters), () => manyYearBuckets(filters))}
          pickerOrder="descending"
          labels={{ low: "From year", high: "To year" }}
          countLabel={f.carCount}
          {...states}
        />
      );
    case "km":
      return (
        <UpperLimit
          min={0}
          max={KM_MAX}
          step={KM_STEP}
          value={filters.kmMax}
          onChange={(kmMax) => set({ kmMax })}
          buckets={bucketsInState(state, kmBuckets(filters), () => manyKmBuckets(filters))}
          format={f.km}
          locale={locale}
          label="Maximum kilometres"
          emptyText="No distances to show"
          {...states}
        />
      );
    case "seats":
      return (
        <SegmentedChoice<number | null>
          locale={locale}
          label="Seats"
          options={segmentsInState(state, seatOptions(filters, undefined, locale))}
          value={filters.seatsMin}
          onChange={(seatsMin) => set({ seatsMin })}
          countLabel={f.carCount}
          {...states}
        />
      );
    case "condition":
      return (
        <SegmentedChoice<Condition | null>
          locale={locale}
          label="New or used"
          options={segmentsInState(state, conditionOptions(filters))}
          value={filters.condition}
          onChange={(condition) => set({ condition })}
          countLabel={f.carCount}
          {...states}
        />
      );
    case "transmission":
      return (
        <SegmentedChoice<Transmission | null>
          locale={locale}
          label="Transmission"
          fit="content"
          options={segmentsInState(state, transmissionOptions(filters))}
          value={filters.transmission}
          onChange={(transmission) => set({ transmission })}
          countLabel={f.carCount}
          {...states}
        />
      );
    case "body": {
      const counts = bodyCounts(filters);
      // Many-options adds body styles the demo cars do not have, drawn with the nearest icon; picking one finds no cars.
      const options = optionsInState(state, BODIES.map((b) => ({ value: b, label: b, count: counts.get(b) ?? 0 })), BODY_STATES);
      return (
        <IconTiles<string>
          locale={locale}
          label="Body style"
          options={options.map((o) => ({ ...o, icon: <BodyIcon body={bodyIconFor(o.value)} /> }))}
          value={filters.bodies}
          onChange={(bodies) => set({ bodies: bodies as CarFilters["bodies"] })}
          countLabel={f.carCount}
          {...states}
        />
      );
    }
    case "color": {
      const counts = colorCounts(filters);
      // Many-options adds colours the demo cars do not have; picking one finds no cars.
      const options = optionsInState(state, COLORS.map((c) => ({ value: c, label: c, count: counts.get(c) ?? 0 })), COLOR_STATES);
      return (
        <ColorSwatches<string>
          locale={locale}
          label="Colour"
          options={options.map((o) => ({ ...o, color: paintFor(o.value) }))}
          value={filters.colors}
          onChange={(colors) => set({ colors: colors as CarFilters["colors"] })}
          countLabel={f.carCount}
          {...states}
        />
      );
    }
    case "fuel": {
      const counts = fuelCounts(filters);
      // Many-options adds fuels the demo cars do not have; picking one just finds no cars.
      return (
        <ChipGroup<string>
          locale={locale}
          label="Fuel"
          options={optionsInState(state, FUELS.map((v) => ({ value: v, label: v, count: counts.get(v) ?? 0 })), FUEL_STATES)}
          value={filters.fuels}
          onChange={(fuels) => set({ fuels: fuels as CarFilters["fuels"] })}
          countLabel={f.carCount}
          {...states}
        />
      );
    }
    case "drive": {
      const counts = driveCounts(filters);
      return (
        <ChipGroup<string>
          locale={locale}
          label="Drivetrain"
          options={optionsInState(state, DRIVES.map((v) => ({ value: v, label: v, count: counts.get(v) ?? 0 })), DRIVE_STATES)}
          value={filters.drives}
          onChange={(drives) => set({ drives: drives as CarFilters["drives"] })}
          countLabel={f.carCount}
          {...states}
        />
      );
    }
    case "make":
      return (
        <SearchableList
          locale={locale}
          label="Make and model"
          noun="makes"
          collapsedCount={MAKES_UP_FRONT}
          options={optionsInState(state, makeOptions(filters), MAKE_STATES)}
          value={filters.makes.map((p) => ({ value: p.make, children: p.models }))}
          onChange={(picks) => set({ makes: picks.map((p) => ({ make: p.value, models: p.children })) })}
          countLabel={f.carCount}
          {...states}
        />
      );
  }
}
