"use client";

import type { ReactNode } from "react";
import { BodyIcon } from "@/registry/demo/body-icons";
import { BODIES, COLORS, COLOR_PAINTS, DRIVES, FUELS, type Condition, type Transmission } from "@/registry/demo/cars";
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
  formatCarCount,
  formatKm,
  formatMoney,
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


type Props = {
  facet: CarFacet;
  filters: CarFilters;
  set: (patch: Partial<CarFilters>) => void;
};

/** One car filter's body, wired to the demo cars the way the full board wires it. */
export function CarFilterBody({ facet, filters, set }: Props): ReactNode {
  switch (facet) {
    case "price":
      return (
        <RangeHistogram
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={[filters.priceMin, filters.priceMax]}
          onChange={([priceMin, priceMax]) => set({ priceMin, priceMax })}
          buckets={priceBuckets(filters)}
          format={formatMoney}
          labels={{ low: "Lowest price", high: "Highest price" }}
        />
      );
    case "year":
      return (
        <RangeSelect
          options={YEARS}
          value={[filters.yearMin, filters.yearMax]}
          onChange={([yearMin, yearMax]) => set({ yearMin, yearMax })}
          buckets={yearBuckets(filters)}
          pickerOrder="descending"
          labels={{ low: "From year", high: "To year" }}
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
          buckets={kmBuckets(filters)}
          format={formatKm}
          label="Maximum kilometres"
        />
      );
    case "seats":
      return (
        <SegmentedChoice<number | null>
          label="Seats"
          options={seatOptions(filters)}
          value={filters.seatsMin}
          onChange={(seatsMin) => set({ seatsMin })}
          countLabel={formatCarCount}
        />
      );
    case "condition":
      return (
        <SegmentedChoice<Condition | null>
          label="New or used"
          options={conditionOptions(filters)}
          value={filters.condition}
          onChange={(condition) => set({ condition })}
          countLabel={formatCarCount}
        />
      );
    case "transmission":
      return (
        <SegmentedChoice<Transmission | null>
          label="Transmission"
          fit="content"
          options={transmissionOptions(filters)}
          value={filters.transmission}
          onChange={(transmission) => set({ transmission })}
          countLabel={formatCarCount}
        />
      );
    case "body": {
      const counts = bodyCounts(filters);
      return (
        <IconTiles
          label="Body style"
          options={BODIES.map((b) => ({ value: b, label: b, icon: <BodyIcon body={b} />, count: counts.get(b) ?? 0 }))}
          value={filters.bodies}
          onChange={(bodies) => set({ bodies })}
          countLabel={formatCarCount}
        />
      );
    }
    case "color": {
      const counts = colorCounts(filters);
      return (
        <ColorSwatches
          label="Colour"
          options={COLORS.map((c) => ({ value: c, label: c, color: COLOR_PAINTS[c], count: counts.get(c) ?? 0 }))}
          value={filters.colors}
          onChange={(colors) => set({ colors })}
          countLabel={formatCarCount}
        />
      );
    }
    case "fuel": {
      const counts = fuelCounts(filters);
      return (
        <ChipGroup
          label="Fuel"
          options={FUELS.map((v) => ({ value: v, label: v, count: counts.get(v) ?? 0 }))}
          value={filters.fuels}
          onChange={(fuels) => set({ fuels })}
          countLabel={formatCarCount}
        />
      );
    }
    case "drive": {
      const counts = driveCounts(filters);
      return (
        <ChipGroup
          label="Drivetrain"
          options={DRIVES.map((v) => ({ value: v, label: v, count: counts.get(v) ?? 0 }))}
          value={filters.drives}
          onChange={(drives) => set({ drives })}
          countLabel={formatCarCount}
        />
      );
    }
    case "make":
      return (
        <SearchableList
          label="Make and model"
          noun="makes"
          collapsedCount={MAKES_UP_FRONT}
          options={makeOptions(filters)}
          value={filters.makes.map((p) => ({ value: p.make, children: p.models }))}
          onChange={(picks) => set({ makes: picks.map((p) => ({ make: p.value, models: p.children })) })}
          countLabel={formatCarCount}
        />
      );
  }
}
