"use client";

import { useState } from "react";
import { useStage, useStageStatus } from "@/components/stage/stage-controls";
import { formatsFor, type Formats } from "@/registry/lib/format";
import { DropdownMenu, type MenuOption } from "@/registry/ui/dropdown-menu";
import { Select, type SelectOption } from "@/registry/ui/select";
import { Skeleton, SKELETON_FILL } from "@/registry/ui/skeleton";
import { AscendingGlyph, CalendarGlyph, ClockGlyph, DescendingGlyph, GaugeGlyph } from "@/registry/ui/sort-glyphs";
import { TextSwap } from "@/registry/ui/text-swap";
import type { ItemState } from "@/registry/items";

// The State switch's other states for the Dropdown and Select pages. Each draws the real component with the example's
// kind of data in the stage's state, laid out as the example is, so the control stays where it was in Ready.

const SMOOTH = "ease-[cubic-bezier(0.22,1,0.36,1)]";

// ---- Dropdown: the sort menu over five cars.

type Car = { id: string; name: string; year: number; price: number; km: number; days: number };

const CARS: Car[] = [
  { id: "rav4", name: "Toyota RAV4", year: 2022, price: 31400, km: 28000, days: 0 },
  { id: "civic", name: "Honda Civic", year: 2019, price: 17900, km: 64000, days: 1 },
  { id: "ev6", name: "Kia EV6", year: 2024, price: 38900, km: 9000, days: 3 },
  { id: "escape", name: "Ford Escape", year: 2020, price: 21500, km: 47000, days: 5 },
  { id: "cx5", name: "Mazda CX-5", year: 2021, price: 26200, km: 35000, days: 8 },
];

const SORTS = [
  { value: "newest", label: "Newest listings", long: "Newest listings first, then the closest to you", by: (a: Car, b: Car) => a.days - b.days, icon: <ClockGlyph /> },
  { value: "price-low", label: "Price low to high", long: "Price from the lowest to the highest, taxes and fees included", by: (a: Car, b: Car) => a.price - b.price, icon: <AscendingGlyph /> },
  { value: "price-high", label: "Price high to low", long: "Price from the highest to the lowest, taxes and fees included", by: (a: Car, b: Car) => b.price - a.price, icon: <DescendingGlyph /> },
  { value: "km-low", label: "Lowest kilometres", long: "Fewest kilometres on the odometer first", by: (a: Car, b: Car) => a.km - b.km, icon: <GaugeGlyph /> },
  { value: "year-new", label: "Newest model year", long: "Newest model year first, then the lowest price", by: (a: Car, b: Car) => b.year - a.year, icon: <CalendarGlyph /> },
];

/** More orders for the many-options state: every column of a car listing, both ways. */
const MORE_SORTS = [
  "Oldest listings",
  "Highest kilometres",
  "Oldest model year",
  ...[
    ["Make", "A to Z", "Z to A"],
    ["Model", "A to Z", "Z to A"],
    ["Seats", "fewest first", "most first"],
    ["Fuel economy", "best first", "worst first"],
    ["Engine power", "highest first", "lowest first"],
    ["Electric range", "longest first", "shortest first"],
    ["Distance", "nearest first", "farthest first"],
    ["Boot space", "largest first", "smallest first"],
    ["Towing", "heaviest first", "lightest first"],
    ["Doors", "most first", "fewest first"],
    ["Weight", "lightest first", "heaviest first"],
    ["Length", "shortest first", "longest first"],
    ["Warranty left", "longest first", "shortest first"],
    ["Owners", "fewest first", "most first"],
    ["Price drop", "biggest first", "smallest first"],
    ["Insurance group", "lowest first", "highest first"],
  ].flatMap(([field, one, other]) => [`${field}, ${one}`, `${field}, ${other}`]),
];

// Each order's hint is what would come first: "$31,400", "28,000 km", "3 days ago".
const firstOf = (f: Formats, value: string) => {
  const order = SORTS.find((sort) => sort.value === value);
  if (!order) return undefined;
  const car = [...CARS].sort(order.by)[0];
  if (value === "newest") return car.days === 0 ? "Today" : car.days === 1 ? "Yesterday" : `${f.number(car.days)} days ago`;
  if (value === "km-low") return f.distance(car.km);
  if (value === "year-new") return f.plain(car.year);
  return f.price(car.price);
};

function sortsIn(state: ItemState, f: Formats): MenuOption[] {
  if (state === "empty") return [];
  const own = SORTS.map(({ value, label, long, icon }) => ({ value, label: state === "long-labels" ? long : label, icon, hint: firstOf(f, value) }));
  if (state !== "many-options") return own;
  return [...own, ...MORE_SORTS.map((label, i) => ({ value: `more-${i}`, label }))];
}

export function DropdownStateStage() {
  const { locale } = useStage();
  const { state, disabled } = useStageStatus();
  const f = formatsFor(locale);
  const [sort, setSort] = useState("newest");
  const order = SORTS.find((s) => s.value === sort);
  const cars = order ? [...CARS].sort(order.by) : CARS;

  return (
    <div className="w-full max-w-[400px]">
      <div className="flex items-center justify-between gap-3 pe-[7px] ps-[21px]">
        <p className="shrink-0 text-[14px] leading-5 text-[var(--fu-dim,#929292)]">{f.number(CARS.length)} cars</p>
        <DropdownMenu label="Sort by" prefix="Sort by" variant="quiet" align="end" value={sort} onChange={setSort} options={sortsIn(state, f)} disabled={disabled} className="min-w-0" />
      </div>
      <div className="relative mt-2 flex rounded-[24px] border border-[var(--fu-card-border,#2A2A2A)] bg-[var(--fu-card,#1F1F1F)] p-2">
        <ol aria-hidden="true" className="w-6 shrink-0 ps-2">
          {cars.map((car, i) => (
            <li key={i} className="flex h-14 items-center text-[13px] leading-5 tabular-nums text-[var(--fu-dim,#929292)]">
              {f.plain(i + 1)}
            </li>
          ))}
        </ol>
        <ul className="min-w-0 flex-1">
          {cars.map((car) => (
            <li key={car.id} className="flex h-14 items-center gap-3 rounded-[16px] px-3 tabular-nums">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] leading-5 font-medium text-[var(--fu-text,#F8F5F1)]">{car.name}</span>
                <span className="block text-[13px] leading-5 text-[var(--fu-mute,#BDBDBD)]">
                  {f.plain(car.year)}
                  {" · "}
                  {f.distance(car.km)}
                </span>
              </span>
              <span className="shrink-0 text-end">
                <span className="block text-[15px] leading-5 font-medium text-[var(--fu-text,#F8F5F1)]">{f.price(car.price)}</span>
                <span className="block text-[13px] leading-5 text-[var(--fu-dim,#929292)]">
                  {car.days === 0 ? "Today" : car.days === 1 ? "Yesterday" : `${f.number(car.days)} days ago`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---- Select: the From year field over a timeline of cars by model year.

const PER_YEAR: Record<number, number> = { 2017: 3, 2018: 4, 2019: 6, 2020: 5, 2021: 9, 2022: 7, 2023: 8, 2024: 6, 2025: 4, 2026: 0 };
const TIMELINE = Object.keys(PER_YEAR).map(Number);
const TALLEST = Math.max(...Object.values(PER_YEAR));
/** For the many-options state: forty model years, the older ones with a car or two each. */
const MANY_YEARS = Array.from({ length: 40 }, (_, i) => 2026 - i);
const perYearIn = (state: ItemState, year: number) => (state === "zero-results" ? 0 : (PER_YEAR[year] ?? (state === "many-options" ? 1 + (year % 3 === 0 ? 1 : 0) : 0)));

function yearsIn(state: ItemState, f: Formats): SelectOption[] {
  if (state === "empty") return [];
  const years = state === "many-options" ? MANY_YEARS : [...TIMELINE].reverse();
  const from = (year: number | null) => (state === "many-options" ? MANY_YEARS : TIMELINE).reduce((n, y) => (year === null || y >= year ? n + perYearIn(state, y) : n), 0);
  const long = state === "long-labels";
  return [
    { value: "", label: long ? "Any model year, new or used" : "Any", count: from(null) },
    ...years.map((year) => ({ value: String(year), label: long ? `${f.plain(year)} or newer, certified pre-owned included` : f.plain(year), count: from(year) })),
  ];
}

export function SelectStateStage() {
  const { locale } = useStage();
  const { state, status, disabled, onRetry } = useStageStatus();
  const f = formatsFor(locale);
  const carCount = (n: number) => (n === 1 ? "1 car" : `${f.number(n)} cars`);
  const options = yearsIn(state, f);
  const [from, setFrom] = useState("2021");
  const picked = from !== "" && options.some((option) => option.value === from) ? Number(from) : null;
  const cut = picked === null ? 0 : Math.max(0, TIMELINE.indexOf(picked));
  const shown = TIMELINE.reduce((n, year) => (picked === null || year >= picked ? n + perYearIn(state, year) : n), 0);
  const loading = status === "loading";

  return (
    <div className="w-full max-w-[320px]">
      <Select label="From year" prefix="From" value={from} onChange={setFrom} options={options} countLabel={carCount} locale={locale} status={status} onRetry={onRetry} disabled={disabled} />
      <div className="mt-2 rounded-[24px] border border-[var(--fu-card-border,#2A2A2A)] bg-[var(--fu-card,#1F1F1F)] px-5 pt-4 pb-5">
        <p className="flex items-baseline gap-1 text-[14px] leading-5 tabular-nums">
          {loading ? <Skeleton className="inline-block h-3 w-5 self-center rounded-[4px]" /> : <TextSwap className="font-medium text-[var(--fu-text,#F8F5F1)]">{f.number(shown)}</TextSwap>}
          <span className="text-[var(--fu-dim,#929292)]">cars</span>
        </p>
        <div aria-hidden="true" className="relative mt-5">
          {!loading && (
            <span
              className={`absolute -inset-y-2 -inset-e-[5px] rounded-[12px] bg-[var(--fu-selected,#1F2747)] transition-[left,right] duration-[480ms] motion-reduce:transition-none ${SMOOTH}`}
              style={{ insetInlineStart: `calc(${cut} * (100% + 10px) / ${TIMELINE.length} - 5px)` }}
            />
          )}
          <div className="relative grid grid-cols-10 items-end gap-2.5" style={{ height: TALLEST * 8 - 2 }}>
            {TIMELINE.map((year, i) => (
              <div key={year} className="flex flex-col-reverse gap-[2px]">
                {Array.from({ length: loading ? PER_YEAR[year] : perYearIn(state, year) }, (_, j) => (
                  <span
                    key={j}
                    className={`h-1.5 rounded-[2px] ${
                      loading ? SKELETON_FILL : i >= cut ? "bg-[var(--fu-accent-soft,#8FAAFF)]" : "bg-[var(--fu-line,#404040)]"
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="relative mt-2.5 grid grid-cols-10 gap-2.5 text-center text-[12px] leading-4 tabular-nums">
            {TIMELINE.map((year, i) => (
              <span key={year} className={!loading && i >= cut ? "text-[var(--fu-accent-pale,#D1DDFF)]" : "text-[var(--fu-dim,#929292)]"}>
                ’{f.plain(year).slice(2)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
