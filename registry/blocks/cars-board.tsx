"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { BodyIcon } from "../demo/body-icons";
import { BODIES, CARS, COLORS, COLOR_PAINTS, DRIVES, FUELS, type Car, type Condition, type Transmission } from "../demo/cars";
import {
  CAR_FACET_COLUMNS,
  CAR_FACET_TITLES,
  EMPTY_CAR_FILTERS,
  KM_MAX,
  KM_STEP,
  PRICE_MAX,
  PRICE_MIN,
  PRICE_STEP,
  bodyCounts,
  clearFacet,
  colorCounts,
  conditionOptions,
  driveCounts,
  fuelCounts,
  transmissionOptions,
  YEARS,
  formatCarCount,
  formatKm,
  formatMoney,
  kmBuckets,
  makeOptions,
  MAKES_UP_FRONT,
  matchingCars,
  priceBuckets,
  seatOptions,
  summaryOf,
  yearBuckets,
  type CarFacet,
  type CarFilters,
} from "../demo/cars-facets";
import { ChipGroup } from "../filters/chip-group";
import { ColorSwatches } from "../filters/color-swatches";
import { IconTiles } from "../filters/icon-tiles";
import { RangeHistogram } from "../filters/range-histogram";
import { RangeSelect } from "../filters/range-select";
import { SearchableList } from "../filters/searchable-list";
import { SegmentedChoice } from "../filters/segmented-choice";
import { UpperLimit } from "../filters/upper-limit";
import { FilterCard } from "../ui/filter-card";
import { FiltersBar, FiltersHead } from "../ui/filters-head";

const NOUN = { one: "car", other: "cars" };

// Balanced for both extremes: all open, the columns end within about 40px; all closed, six cards against five.
const TWO_COLUMNS: CarFacet[][] = [
  ["price", "seats", "color", "year", "km", "fuel"],
  ["body", "drive", "make", "condition", "transmission"],
];
// Phones read top to bottom, so the filters people reach for first come first.
const ONE_COLUMN: CarFacet[][] = [
  ["price", "body", "make", "year", "km", "condition", "seats", "fuel", "drive", "transmission", "color"],
];


const THREE_QUERY = "(min-width: 1000px)";
const TWO_QUERY = "(min-width: 640px)";

function subscribe(onChange: () => void) {
  const lists = [THREE_QUERY, TWO_QUERY].map((q) => window.matchMedia(q));
  lists.forEach((list) => list.addEventListener("change", onChange));
  return () => lists.forEach((list) => list.removeEventListener("change", onChange));
}
const columnCount = () => (window.matchMedia(THREE_QUERY).matches ? 3 : window.matchMedia(TWO_QUERY).matches ? 2 : 1);

export type CarsBoardProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  cars?: readonly Car[];
  defaultFilters?: CarFilters;
  defaultOpen?: CarFacet[];
  onShow?: (cars: Car[]) => void;
  headingLevel?: 1 | 2 | 3;
};

/**
 * Every car filter on its own card: the head (Filters, Clear all, Show N cars), then the cards in
 * three columns, two from 640px and one below. On phones Clear all and Show move into a bar pinned
 * to the bottom. Tab order runs the head, then each column top to bottom.
 */
export function CarsBoard({
  cars = CARS,
  defaultFilters = EMPTY_CAR_FILTERS,
  defaultOpen = [],
  onShow,
  headingLevel = 2,
  className,
  ...props
}: CarsBoardProps) {
  const [filters, setFilters] = useState(defaultFilters);
  const [open, setOpen] = useState<CarFacet[]>(defaultOpen);
  const [headSeen, setHeadSeen] = useState(true);
  const head = useRef<HTMLDivElement>(null);
  const columns = useSyncExternalStore(subscribe, columnCount, () => 3);
  const phone = columns === 1;
  const matches = matchingCars(filters, cars);

  useEffect(() => {
    const node = head.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setHeadSeen(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Clear all stays put when nothing is set, so pressing it never drops keyboard focus.
  const clearAll = () => setFilters(EMPTY_CAR_FILTERS);
  const show = onShow && (() => onShow(matches));
  const set = (patch: Partial<CarFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const bodyOf = (facet: CarFacet): ReactNode => {
    switch (facet) {
      case "price":
        return (
          <RangeHistogram
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={[filters.priceMin, filters.priceMax]}
            onChange={([priceMin, priceMax]) => set({ priceMin, priceMax })}
            buckets={priceBuckets(filters, cars)}
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
            buckets={yearBuckets(filters, cars)}
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
            buckets={kmBuckets(filters, cars)}
            format={formatKm}
            label="Maximum kilometres"
          />
        );
      case "seats":
        return (
          <SegmentedChoice<number | null>
            label="Seats"
            options={seatOptions(filters, cars)}
            value={filters.seatsMin}
            onChange={(seatsMin) => set({ seatsMin })}
            countLabel={formatCarCount}
          />
        );
      case "body": {
        const counts = bodyCounts(filters, cars);
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
        const counts = colorCounts(filters, cars);
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
      case "condition":
        return (
          <SegmentedChoice<Condition | null>
            label="New or used"
            options={conditionOptions(filters, cars)}
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
            options={transmissionOptions(filters, cars)}
            value={filters.transmission}
            onChange={(transmission) => set({ transmission })}
            countLabel={formatCarCount}
          />
        );
      case "fuel": {
        const counts = fuelCounts(filters, cars);
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
        const counts = driveCounts(filters, cars);
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
            options={makeOptions(filters, cars)}
            value={filters.makes.map((p) => ({ value: p.make, children: p.models }))}
            onChange={(picks) => set({ makes: picks.map((p) => ({ make: p.value, models: p.children })) })}
            countLabel={formatCarCount}
          />
        );
    }
  };

  const layout = columns === 3 ? CAR_FACET_COLUMNS : columns === 2 ? TWO_COLUMNS : ONE_COLUMN;

  return (
    // On phones the bottom padding keeps the last card clear of the floating bar.
    <div className={cn("w-full", phone && "pb-24", className)} {...props}>
      <div ref={head}>
        <FiltersHead
          count={matches.length}
          noun={NOUN}
          onClearAll={clearAll}
          onShow={show}
          headingLevel={headingLevel}
          actionsClassName={phone ? "hidden" : undefined}
        />
      </div>
      <div
        className="mt-6 grid items-start gap-4"
        style={{ gridTemplateColumns: `repeat(${layout.length}, minmax(0, 1fr))` }}
      >
        {layout.map((column, i) => (
          <div key={`${layout.length}-${i}`} className="flex min-w-0 flex-col gap-4">
            {column.map((facet) => (
                <FilterCard
                  key={facet}
                  data-facet={facet}
                  title={CAR_FACET_TITLES[facet]}
                  summary={summaryOf(filters, facet)}
                  onClear={() => setFilters((f) => clearFacet(f, facet))}
                  open={open.includes(facet)}
                  onOpenChange={(next) => setOpen((list) => (next ? [...list, facet] : list.filter((f) => f !== facet)))}
                  headingLevel={headingLevel === 1 ? 2 : 3}
                >
                  {bodyOf(facet)}
                </FilterCard>
            ))}
          </div>
        ))}
      </div>
      <FiltersBar
        visible={phone || !headSeen}
        count={matches.length}
        noun={NOUN}
        onClearAll={clearAll}
        onShow={show}
      />
    </div>
  );
}
