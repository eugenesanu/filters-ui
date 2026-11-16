"use client";

import { useEffect, useRef, useState } from "react";
import { NoResults } from "../filters/no-results";
import { loosen, type RelaxMap } from "../lib/relax";

type Fuel = "Gas" | "Hybrid" | "Electric";
type Car = { name: string; price: number; fuel: Fuel; seats: number };

const CARS: Car[] = [
  { name: "Hyundai Elantra", price: 16900, fuel: "Hybrid", seats: 5 },
  { name: "Toyota Corolla", price: 18400, fuel: "Hybrid", seats: 5 },
  { name: "Kia Niro", price: 19500, fuel: "Hybrid", seats: 5 },
  { name: "Honda Civic", price: 17900, fuel: "Gas", seats: 5 },
  { name: "Kia Carnival", price: 19400, fuel: "Gas", seats: 8 },
  { name: "Honda Odyssey", price: 19800, fuel: "Gas", seats: 8 },
  { name: "Mazda CX-5", price: 21900, fuel: "Gas", seats: 5 },
  { name: "Ford Explorer", price: 23800, fuel: "Gas", seats: 7 },
  { name: "Toyota Highlander", price: 24500, fuel: "Hybrid", seats: 8 },
  { name: "Toyota RAV4", price: 26900, fuel: "Hybrid", seats: 5 },
  { name: "Toyota Sienna", price: 28900, fuel: "Hybrid", seats: 8 },
  { name: "Tesla Model Y", price: 34900, fuel: "Electric", seats: 7 },
];

type Filters = { maxPrice: number | null; fuel: Fuel | null; minSeats: number | null };

const matches = (car: Car, f: Filters) =>
  (f.maxPrice === null || car.price <= f.maxPrice) &&
  (f.fuel === null || car.fuel === f.fuel) &&
  (f.minSeats === null || car.seats >= f.minSeats);

const short = (n: number) => `$${n / 1000}k`;
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const PRICES = [20000, 25000, 30000, 40000];
const SEATS = [8, 7, 6];

// How each filter loosens, nearest first; "Any" always comes last.
const relax: RelaxMap<Filters> = {
  price: {
    label: "Price",
    value: (f) => (f.maxPrice === null ? null : `Under ${short(f.maxPrice)}`),
    steps: (f) =>
      loosen(f.maxPrice, PRICES.filter((p) => p > (f.maxPrice ?? 0)), (s: Filters, maxPrice) => ({ ...s, maxPrice }), (p) => `Under ${short(p)}`),
  },
  seats: {
    label: "Seats",
    value: (f) => (f.minSeats === null ? null : `${f.minSeats}+`),
    steps: (f) =>
      loosen(f.minSeats, SEATS.filter((n) => n < (f.minSeats ?? 0)), (s: Filters, minSeats) => ({ ...s, minSeats }), (n) => `${n}+`),
  },
  fuel: {
    label: "Fuel",
    value: (f) => f.fuel,
    steps: (f) => loosen(f.fuel, [], (s: Filters, fuel) => ({ ...s, fuel })),
  },
};

export default function NoResultsExample() {
  const [filters, setFilters] = useState<Filters>({ maxPrice: 20000, fuel: "Hybrid", minSeats: 7 });
  const results = CARS.filter((car) => matches(car, filters));
  const list = useRef<HTMLUListElement>(null);

  // Once a fix brings cars back, focus moves to them.
  const found = results.length > 0;
  useEffect(() => {
    if (found) list.current?.focus();
  }, [found]);

  return (
    <div className="w-full max-w-[400px]">
      {found ? (
        <ul
          ref={list}
          tabIndex={-1}
          aria-label="Results"
          className="rounded-[24px] border border-[var(--fu-card-border,#2A2A2A)] bg-[var(--fu-card,#1F1F1F)] p-2 outline-none"
        >
          {results.map((car) => (
            <li key={car.name} className="flex h-12 items-center justify-between gap-3 px-3 text-[15px] leading-5 tabular-nums">
              <span className="min-w-0 truncate">
                <span className="font-medium">{car.name}</span>{" "}
                <span className="text-[13px] text-[var(--fu-dim,#8C8C8C)]">
                  {car.fuel}, {car.seats} seats
                </span>
              </span>
              <span className="shrink-0 font-medium text-[var(--fu-accent-soft,#8FAAFF)]">{money.format(car.price)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <NoResults
          items={CARS}
          value={filters}
          onChange={setFilters}
          matches={matches}
          relax={relax}
          title="No cars match"
          noun={{ one: "car", other: "cars" }}
        />
      )}
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
