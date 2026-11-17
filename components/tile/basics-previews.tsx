"use client";

import { DropdownMenu } from "@/registry/ui/dropdown-menu";
import { Select } from "@/registry/ui/select";
import { AscendingGlyph, CalendarGlyph, ClockGlyph, DescendingGlyph, GaugeGlyph } from "@/registry/ui/sort-glyphs";

// Tile previews for the Dropdown and Select, in the look of their pages. Previews are inert, so nothing calls these.
const still = () => {};

const SORTS = [
  { value: "newest", label: "Newest listings", hint: "Today", icon: <ClockGlyph /> },
  { value: "price-low", label: "Price low to high", hint: "$17,900", icon: <AscendingGlyph /> },
  { value: "price-high", label: "Price high to low", hint: "$38,900", icon: <DescendingGlyph /> },
  { value: "km-low", label: "Lowest kilometres", hint: "9,000 km", icon: <GaugeGlyph /> },
  { value: "year-new", label: "Newest model year", hint: "2024", icon: <CalendarGlyph /> },
];

const SORTED_CARS = [
  { name: "Honda Civic", detail: "2019 · 64,000 km", price: "$17,900" },
  { name: "Ford Escape", detail: "2020 · 47,000 km", price: "$21,500" },
  { name: "Mazda CX-5", detail: "2021 · 35,000 km", price: "$26,200" },
  { name: "Toyota RAV4", detail: "2022 · 28,000 km", price: "$31,400" },
];

/** The Dropdown page's sorted list, with its sort menu open over it. */
export function DropdownTilePreview() {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 pe-[7px] ps-[21px]">
        <p className="text-[14px] leading-5 text-dim">5 cars</p>
        <DropdownMenu still variant="quiet" label="Sort by" prefix="Sort by" align="end" value="price-low" onChange={still} options={SORTS} />
      </div>
      <ul className="mt-2 rounded-[24px] border border-card-border bg-card p-2">
        {SORTED_CARS.map((car, i) => (
          <li key={car.name} className="flex h-14 items-center gap-3 px-3 tabular-nums">
            <span className="w-3 shrink-0 text-[13px] leading-5 text-dim">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium leading-5 text-text">{car.name}</span>
              <span className="block truncate text-[13px] leading-5 text-mute">{car.detail}</span>
            </span>
            <span className="shrink-0 text-[15px] font-medium leading-5 text-accent-soft">{car.price}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The Select page's cars per model year; each choice counts that year or newer.
const PER_YEAR: Record<number, number> = { 2017: 3, 2018: 4, 2019: 6, 2020: 5, 2021: 9, 2022: 7, 2023: 8, 2024: 6, 2025: 4, 2026: 0 };
const YEARS = Object.keys(PER_YEAR).map(Number).reverse();
const carsFrom = (from: number) => YEARS.reduce((n, year) => (year >= from ? n + PER_YEAR[year] : n), 0);
const YEAR_OPTIONS = [
  { value: "", label: "Any", count: carsFrom(0) },
  ...YEARS.map((year) => ({ value: String(year), label: String(year), count: carsFrom(year) })),
];

/** A year field with its list open on the chosen year, each year with its bar and count. */
export function SelectTilePreview() {
  return <Select still label="From year" prefix="From" value="2021" onChange={still} options={YEAR_OPTIONS} />;
}
