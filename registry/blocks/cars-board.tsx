"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useSyncExternalStore, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { BodyIcon } from "../demo/body-icons";
import { BODIES, CARS, COLORS, COLOR_PAINTS, DRIVES, FUELS, type Car, type Condition, type Transmission } from "../demo/cars";
import {
  CAR_FACET_COLUMNS,
  CAR_FACET_TITLES,
  EMPTY_CAR_FILTERS,
  FACET_FIELDS,
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
  carFormats,
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
import { StatusFrame, StatusLine, useFocusKept, type StateProps } from "../ui/status-frame";

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

export type CarsBoardProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> &
  Omit<StateProps, "emptyText"> & {
  cars?: readonly Car[];
  defaultFilters?: CarFilters;
  defaultOpen?: CarFacet[];
  onShow?: (cars: Car[]) => void;
  headingLevel?: 1 | 2 | 3;
  /** Numbers, prices and distances follow it, e.g. "de-DE". Default "en-US". */
  locale?: string;
};

/** The board's error line, unless errorText says otherwise. */
const BOARD_ERROR = "Couldn't load the cars.";

/**
 * Every car filter on its own card: the head (Filters, Clear all, Show N cars), then the cards in
 * three columns, two from 640px and one below. On phones Clear all and Show move into a bar pinned
 * to the bottom. Tab order runs the head, then each column top to bottom.
 * status and disabled reach every card's filter through a frame of its own, quiet, as the head says the state once:
 * loading draws each filter's placeholders and the number in Show; an error shows its line in each open card and once
 * under the head, with the one Retry; disabled turns every filter off and leaves Clear and Clear all out.
 */
export function CarsBoard({
  cars = CARS,
  defaultFilters = EMPTY_CAR_FILTERS,
  defaultOpen = [],
  onShow,
  headingLevel = 2,
  locale,
  status = "ready",
  onRetry,
  errorText = BOARD_ERROR,
  disabled = false,
  className,
  ...props
}: CarsBoardProps) {
  const f = carFormats(locale);
  const loading = status === "loading";
  const [filters, setFilters] = useState(defaultFilters);
  const [open, setOpen] = useState<CarFacet[]>(defaultOpen);
  const [headSeen, setHeadSeen] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
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

  const bodyOf = (facet: CarFacet, filters: CarFilters): ReactNode => {
    switch (facet) {
      case "price":
        return (
          <RangeHistogram
            locale={locale}
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={[filters.priceMin, filters.priceMax]}
            onChange={([priceMin, priceMax]) => set({ priceMin, priceMax })}
            buckets={priceBuckets(filters, cars)}
            format={f.money}
            labels={{ low: "Lowest price", high: "Highest price" }}
          />
        );
      case "year":
        return (
          <RangeSelect
            locale={locale}
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
            locale={locale}
            min={0}
            max={KM_MAX}
            step={KM_STEP}
            value={filters.kmMax}
            onChange={(kmMax) => set({ kmMax })}
            buckets={kmBuckets(filters, cars)}
            format={f.km}
            label="Maximum kilometres"
          />
        );
      case "seats":
        return (
          <SegmentedChoice<number | null>
            locale={locale}
            label="Seats"
            options={seatOptions(filters, cars, locale)}
            value={filters.seatsMin}
            onChange={(seatsMin) => set({ seatsMin })}
            countLabel={f.carCount}
          />
        );
      case "body": {
        const counts = bodyCounts(filters, cars);
        return (
          <IconTiles
            locale={locale}
            label="Body style"
            options={BODIES.map((b) => ({ value: b, label: b, icon: <BodyIcon body={b} />, count: counts.get(b) ?? 0 }))}
            value={filters.bodies}
            onChange={(bodies) => set({ bodies })}
            countLabel={f.carCount}
          />
        );
      }
      case "color": {
        const counts = colorCounts(filters, cars);
        return (
          <ColorSwatches
            locale={locale}
            label="Colour"
            options={COLORS.map((c) => ({ value: c, label: c, color: COLOR_PAINTS[c], count: counts.get(c) ?? 0 }))}
            value={filters.colors}
            onChange={(colors) => set({ colors })}
            countLabel={f.carCount}
          />
        );
      }
      case "condition":
        return (
          <SegmentedChoice<Condition | null>
            locale={locale}
            label="New or used"
            options={conditionOptions(filters, cars)}
            value={filters.condition}
            onChange={(condition) => set({ condition })}
            countLabel={f.carCount}
          />
        );
      case "transmission":
        return (
          <SegmentedChoice<Transmission | null>
            locale={locale}
            label="Transmission"
            fit="content"
            options={transmissionOptions(filters, cars)}
            value={filters.transmission}
            onChange={(transmission) => set({ transmission })}
            countLabel={f.carCount}
          />
        );
      case "fuel": {
        const counts = fuelCounts(filters, cars);
        return (
          <ChipGroup
            locale={locale}
            label="Fuel"
            options={FUELS.map((v) => ({ value: v, label: v, count: counts.get(v) ?? 0 }))}
            value={filters.fuels}
            onChange={(fuels) => set({ fuels })}
            countLabel={f.carCount}
          />
        );
      }
      case "drive": {
        const counts = driveCounts(filters, cars);
        return (
          <ChipGroup
            locale={locale}
            label="Drivetrain"
            options={DRIVES.map((v) => ({ value: v, label: v, count: counts.get(v) ?? 0 }))}
            value={filters.drives}
            onChange={(drives) => set({ drives })}
            countLabel={f.carCount}
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
            options={makeOptions(filters, cars)}
            value={filters.makes.map((p) => ({ value: p.make, children: p.models }))}
            onChange={(picks) => set({ makes: picks.map((p) => ({ make: p.value, models: p.children })) })}
            countLabel={f.carCount}
          />
        );
    }
  };

  const framed = (facet: CarFacet, from: CarFilters) => (
    <StatusFrame status={status} errorText={errorText} disabled={disabled} announce={false}>
      {bodyOf(facet, from)}
    </StatusFrame>
  );
  // While a handle is dragged, a card whose own filter did not change draws from the deferred filters, so only the
  // dragged card renders at once and the others' counts follow when the main thread is free. Taps and keys update every card together.
  const dragging = dragged.current;
  const later = useDeferredValue(filters);
  const from = dragging ? later : filters;
  const settled = useMemo(() => new Map(CAR_FACET_COLUMNS.flat().map((facet) => [facet, framed(facet, from)])), [from, cars, locale, status, errorText, disabled]);
  const bodyFor = (facet: CarFacet) => (dragging && FACET_FIELDS[facet].some((key) => filters[key] !== later[key]) ? framed(facet, filters) : settled.get(facet));

  const layout = columns === 3 ? CAR_FACET_COLUMNS : columns === 2 ? TWO_COLUMNS : ONE_COLUMN;
  // Clear all leaves while disabled, and Retry once it reloads: focus that sat on either moves to the head.
  useFocusKept(root, `${status}|${disabled}`, head);

  return (
    // On phones the bottom padding keeps the last card clear of the floating bar.
    <div
      ref={root}
      className={cn("w-full", phone && "pb-24", className)}
      onPointerMoveCapture={(event) => (dragged.current = event.buttons !== 0)}
      onPointerUpCapture={() => (dragged.current = false)}
      onPointerCancelCapture={() => (dragged.current = false)}
      onClickCapture={() => (dragged.current = false)}
      onKeyDownCapture={() => (dragged.current = false)}
      {...props}
    >
      {/* Retry hands focus to the head, which stays while the board reloads. */}
      <div
        ref={head}
        tabIndex={-1}
        data-status-frame=""
        className="rounded-[12px] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]"
      >
        <FiltersHead
          locale={locale}
          count={matches.length}
          noun={NOUN}
          onClearAll={clearAll}
          canClear={!disabled}
          onShow={show}
          loading={loading}
          headingLevel={headingLevel}
          actionsClassName={phone ? "hidden" : undefined}
        />
        <StatusLine status={status} onRetry={onRetry} errorText={errorText} className="mt-4 justify-start gap-x-4" />
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
                  summary={summaryOf(filters, facet, locale)}
                  onClear={disabled ? undefined : () => setFilters((f) => clearFacet(f, facet))}
                  open={open.includes(facet)}
                  onOpenChange={(next) => setOpen((list) => (next ? [...list, facet] : list.filter((f) => f !== facet)))}
                  headingLevel={headingLevel === 1 ? 2 : 3}
                >
                  {bodyFor(facet)}
                </FilterCard>
            ))}
          </div>
        ))}
      </div>
      <FiltersBar
        locale={locale}
        visible={phone || !headSeen}
        count={matches.length}
        noun={NOUN}
        onClearAll={clearAll}
        canClear={!disabled}
        onShow={show}
        loading={loading}
      />
    </div>
  );
}
