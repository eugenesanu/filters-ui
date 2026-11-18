"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { formatsFor, type Formats } from "../lib/format";
import { DropdownMenu } from "../ui/dropdown-menu";
import { AscendingGlyph, CalendarGlyph, ClockGlyph, DescendingGlyph, GaugeGlyph } from "../ui/sort-glyphs";

// days: how long ago it was listed.
type Car = { id: string; name: string; year: number; price: number; km: number; days: number };

const CARS: Car[] = [
  { id: "rav4", name: "Toyota RAV4", year: 2022, price: 31400, km: 28000, days: 0 },
  { id: "civic", name: "Honda Civic", year: 2019, price: 17900, km: 64000, days: 1 },
  { id: "ev6", name: "Kia EV6", year: 2024, price: 38900, km: 9000, days: 3 },
  { id: "escape", name: "Ford Escape", year: 2020, price: 21500, km: 47000, days: 5 },
  { id: "cx5", name: "Mazda CX-5", year: 2021, price: 26200, km: 35000, days: 8 },
];


type Field = "days" | "price" | "km" | "year";

const SORTS = [
  { value: "newest", label: "Newest listings", field: "days", by: (a: Car, b: Car) => a.days - b.days, icon: <ClockGlyph /> },
  { value: "price-low", label: "Price low to high", field: "price", by: (a: Car, b: Car) => a.price - b.price, icon: <AscendingGlyph /> },
  { value: "price-high", label: "Price high to low", field: "price", by: (a: Car, b: Car) => b.price - a.price, icon: <DescendingGlyph /> },
  { value: "km-low", label: "Lowest kilometres", field: "km", by: (a: Car, b: Car) => a.km - b.km, icon: <GaugeGlyph /> },
  { value: "year-new", label: "Newest model year", field: "year", by: (a: Car, b: Car) => b.year - a.year, icon: <CalendarGlyph /> },
] as const;

type Sort = (typeof SORTS)[number]["value"];

// Each field in words, with the locale's numbers: "$31,400", "28,000 km", "3 days ago".
const showIn = (f: Formats): Record<Field, (car: Car) => string> => ({
  days: (car) => (car.days === 0 ? "Today" : car.days === 1 ? "Yesterday" : `${f.number(car.days)} days ago`),
  price: (car) => f.price(car.price),
  km: (car) => f.distance(car.km),
  year: (car) => f.plain(car.year),
});

export default function SortExample({ locale = "en-US" }: { locale?: string }) {
  const f = formatsFor(locale);
  const show = showIn(f);
  // Each order's hint is what would come first.
  const options = SORTS.map(({ value, label, icon, field, by }) => ({ value, label, icon, hint: show[field]([...CARS].sort(by)[0]) }));
  const [sort, setSort] = useState<Sort>("newest");
  const order = SORTS.find((s) => s.value === sort)!;
  const cars = [...CARS].sort(order.by);

  // Each row glides from where it is on screen to its new place; the rank numbers stay. A glide still running when the
  // order changes again is taken over from its current offset, so a quick second pick does not snap rows back.
  const rows = useRef(new Map<string, HTMLLIElement>());
  const tops = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const [id, row] of rows.current) {
      const shift = Number.parseFloat(getComputedStyle(row).translate.split(" ")[1] ?? "0") || 0;
      for (const glide of row.getAnimations()) glide.cancel();
      const top = row.offsetTop;
      const was = tops.current.get(id);
      tops.current.set(id, top);
      if (still || was === undefined) continue;
      const from = was + shift - top;
      if (Math.abs(from) < 0.5) continue;
      row.animate([{ translate: `0 ${from}px` }, { translate: "0 0" }], { duration: 560, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    }
  }, [sort]);

  // The field the list is sorted by takes the accent.
  const lit = (field: Field, rest = "") =>
    `transition-[color] duration-300 ${order.field === field ? "text-[var(--fu-accent-soft,#8FAAFF)]" : rest}`;

  return (
    <div className="w-full max-w-[400px]">
      <div className="flex items-center justify-between gap-3 pe-[7px] ps-[21px]">
        <p className="text-[14px] leading-5 text-[var(--fu-dim,#929292)]">{f.number(CARS.length)} cars</p>
        <DropdownMenu label="Sort by" prefix="Sort by" variant="quiet" align="end" value={sort} onChange={setSort} options={options} />
      </div>
      <div className="relative mt-2 flex rounded-[24px] border border-[var(--fu-card-border,#2A2A2A)] bg-[var(--fu-card,#1F1F1F)] p-2">
        <ol aria-hidden="true" className="w-6 shrink-0 ps-2">
          {cars.map((_car, i) => (
            <li key={i} className="flex h-14 items-center text-[13px] leading-5 tabular-nums text-[var(--fu-dim,#929292)]">
              {f.plain(i + 1)}
            </li>
          ))}
        </ol>
        <ul className="min-w-0 flex-1">
          {cars.map((car) => (
            <li
              key={car.id}
              ref={(node) => {
                if (node) rows.current.set(car.id, node);
                else rows.current.delete(car.id);
              }}
              className="flex h-14 items-center gap-3 rounded-[16px] px-3 tabular-nums"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] leading-5 font-medium text-[var(--fu-text,#F8F5F1)]">{car.name}</span>
                <span className="block text-[13px] leading-5 text-[var(--fu-mute,#BDBDBD)]">
                  <span className={lit("year")}>{show.year(car)}</span>
                  {" · "}
                  <span className={lit("km")}>{show.km(car)}</span>
                </span>
              </span>
              <span className="shrink-0 text-end">
                <span className={`block text-[15px] leading-5 font-medium ${lit("price", "text-[var(--fu-text,#F8F5F1)]")}`}>{show.price(car)}</span>
                <span className={`block text-[13px] leading-5 ${lit("days", "text-[var(--fu-dim,#929292)]")}`}>{show.days(car)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
