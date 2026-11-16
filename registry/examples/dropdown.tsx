"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { DropdownMenu } from "../ui/dropdown-menu";

type Car = { id: string; year: number; name: string; price: number; km: number; listed: number };

// listed: 1 is the newest listing.
const CARS: Car[] = [
  { id: "rav4", year: 2022, name: "Toyota RAV4", price: 31400, km: 28000, listed: 1 },
  { id: "civic", year: 2019, name: "Honda Civic", price: 17900, km: 64000, listed: 2 },
  { id: "ev6", year: 2024, name: "Kia EV6", price: 38900, km: 9000, listed: 3 },
  { id: "escape", year: 2020, name: "Ford Escape", price: 21500, km: 47000, listed: 4 },
  { id: "cx5", year: 2021, name: "Mazda CX-5", price: 26200, km: 35000, listed: 5 },
];

const SORTS = [
  { value: "newest", label: "Newest listings" },
  { value: "price-low", label: "Price low to high" },
  { value: "price-high", label: "Price high to low" },
  { value: "km-low", label: "Lowest kilometres" },
  { value: "year-new", label: "Newest model year" },
] as const;

type Sort = (typeof SORTS)[number]["value"];

const ORDER: Record<Sort, (a: Car, b: Car) => number> = {
  newest: (a, b) => a.listed - b.listed,
  "price-low": (a, b) => a.price - b.price,
  "price-high": (a, b) => b.price - a.price,
  "km-low": (a, b) => a.km - b.km,
  "year-new": (a, b) => b.year - a.year,
};

const number = new Intl.NumberFormat("en-US");

export default function SortExample() {
  const [sort, setSort] = useState<Sort>("newest");
  const cars = [...CARS].sort(ORDER[sort]);

  // Each row glides from where it was to its new place.
  const rows = useRef(new Map<string, HTMLLIElement>());
  const tops = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const [id, row] of rows.current) {
      const top = row.offsetTop;
      const was = tops.current.get(id);
      tops.current.set(id, top);
      if (still || was === undefined || was === top) continue;
      row.animate([{ translate: `0 ${was - top}px` }, { translate: "0 0" }], { duration: 480, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    }
  }, [sort]);

  // The field the list is sorted by takes the accent.
  const lit = (key: "year" | "price" | "km", rest: string) =>
    (key === "price" && sort.startsWith("price")) || (key === "km" && sort === "km-low") || (key === "year" && sort === "year-new")
      ? "text-[var(--fu-accent-soft,#8FAAFF)]"
      : rest;

  return (
    <div className="w-full max-w-[400px]">
      {/* The count starts on the rows' text edge; the chevron ends on the prices' edge. */}
      <div className="flex items-center justify-between gap-3 pr-[7px] pl-[21px]">
        <p className="text-[14px] leading-5 text-[var(--fu-dim,#8C8C8C)]">{CARS.length} cars</p>
        <DropdownMenu label="Sort by" prefix="Sort by" variant="quiet" align="end" value={sort} onChange={setSort} options={SORTS} />
      </div>
      <ul className="relative mt-2 rounded-[24px] border border-[var(--fu-card-border,#2A2A2A)] bg-[var(--fu-card,#1F1F1F)] p-2">
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
                <span className={`transition-[color] duration-200 ${lit("year", "")}`}>{car.year}</span>
                {" · "}
                <span className={`transition-[color] duration-200 ${lit("km", "")}`}>{number.format(car.km)} km</span>
              </span>
            </span>
            <span className={`shrink-0 text-[15px] leading-5 font-medium transition-[color] duration-200 ${lit("price", "text-[var(--fu-text,#F8F5F1)]")}`}>
              ${number.format(car.price)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
