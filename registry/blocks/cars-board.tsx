"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { BodyIcon } from "../demo/body-icons";
import { BODIES, CARS, COLORS, COLOR_PAINTS, type Car } from "../demo/cars";
import {
  CAR_FACET_COLUMNS,
  CAR_FACET_TITLES,
  EMPTY_CAR_FILTERS,
  PRICE_MAX,
  PRICE_MIN,
  PRICE_STEP,
  bodyCounts,
  clearFacet,
  colorCounts,
  formatCarCount,
  formatMoney,
  matchingCars,
  priceBuckets,
  seatOptions,
  summaryOf,
  type CarFacet,
  type CarFilters,
} from "../demo/cars-facets";
import { ColorSwatches } from "../filters/color-swatches";
import { IconTiles } from "../filters/icon-tiles";
import { RangeHistogram } from "../filters/range-histogram";
import { SegmentedChoice } from "../filters/segmented-choice";
import { FilterCard } from "../ui/filter-card";
import { FiltersBar, FiltersHead } from "../ui/filters-head";

const NOUN = { one: "car", other: "cars" };

// Two columns keep the open Price, Seats and Colour cards against Body style, so both run about as long.
const TWO_COLUMNS: CarFacet[][] = [
  ["price", "seats", "color", "year", "km", "condition"],
  ["body", "drive", "fuel", "make", "transmission"],
];
const ONE_COLUMN: CarFacet[][] = [CAR_FACET_COLUMNS.flat()];

// The design sets each open card's height by hand, so the space under the content varies per card.
const BODY_FIT: Partial<Record<CarFacet, string>> = {
  price: "pb-[18px]",
  seats: "pb-2.5",
  body: "pb-1.5",
  color: "pb-3.5",
};

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

  // A facet with no body yet renders as a closed, disabled card; add its case here to switch it on.
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
      default:
        return null;
    }
  };

  const layout = columns === 3 ? CAR_FACET_COLUMNS : columns === 2 ? TWO_COLUMNS : ONE_COLUMN;

  return (
    <div className={cn("w-full", className)} {...props}>
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
            {column.map((facet) => {
              const content = bodyOf(facet);
              return (
                <FilterCard
                  key={facet}
                  title={CAR_FACET_TITLES[facet]}
                  summary={summaryOf(filters, facet)}
                  onClear={() => setFilters((f) => clearFacet(f, facet))}
                  disabled={content === null}
                  open={open.includes(facet)}
                  onOpenChange={(next) => setOpen((list) => (next ? [...list, facet] : list.filter((f) => f !== facet)))}
                  headingLevel={headingLevel === 1 ? 2 : 3}
                  bodyClassName={BODY_FIT[facet]}
                >
                  {content}
                </FilterCard>
              );
            })}
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
