"use client";

import { useState } from "react";
import { AppliedFilters, type AppliedFilter } from "../filters/applied-filters";

type Car = { name: string; price: number; body: string; fuel: string; year: number };

const CARS: Car[] = [
  { name: "Toyota RAV4", price: 31900, body: "SUV", fuel: "Hybrid", year: 2021 },
  { name: "Honda CR-V", price: 33500, body: "SUV", fuel: "Hybrid", year: 2022 },
  { name: "Toyota Highlander", price: 44500, body: "SUV", fuel: "Hybrid", year: 2020 },
  { name: "Kia Sportage", price: 29400, body: "SUV", fuel: "Hybrid", year: 2019 },
  { name: "Lexus RX", price: 52900, body: "SUV", fuel: "Hybrid", year: 2022 },
  { name: "Mazda CX-5", price: 27400, body: "SUV", fuel: "Gas", year: 2021 },
  { name: "Ford Escape", price: 24800, body: "SUV", fuel: "Gas", year: 2020 },
  { name: "Tesla Model Y", price: 41900, body: "SUV", fuel: "Electric", year: 2023 },
  { name: "Toyota Camry", price: 26900, body: "Sedan", fuel: "Hybrid", year: 2021 },
  { name: "Honda Civic", price: 21900, body: "Sedan", fuel: "Gas", year: 2022 },
  { name: "Hyundai Elantra", price: 18900, body: "Sedan", fuel: "Hybrid", year: 2018 },
  { name: "Ford F-150", price: 38900, body: "Truck", fuel: "Gas", year: 2020 },
];

type Filters = { price: [number, number] | null; body: string | null; fuel: string | null };

const START: Filters = { price: [15000, 45000], body: "SUV", fuel: "Hybrid" };
const NONE: Filters = { price: null, body: null, fuel: null };

const short = (n: number) => `$${n / 1000}k`;
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// One chip per filter in use: its name, then its value in words.
function chipsOf(f: Filters): AppliedFilter[] {
  const chips: AppliedFilter[] = [];
  if (f.price) chips.push({ key: "price", label: "Price", value: `${short(f.price[0])} to ${short(f.price[1])}` });
  if (f.body) chips.push({ key: "body", label: "Body style", value: f.body });
  if (f.fuel) chips.push({ key: "fuel", label: "Fuel", value: f.fuel });
  return chips;
}

const matches = (car: Car, f: Filters) =>
  (!f.price || (car.price >= f.price[0] && car.price <= f.price[1])) &&
  (!f.body || car.body === f.body) &&
  (!f.fuel || car.fuel === f.fuel);

export default function AppliedFiltersExample() {
  const [filters, setFilters] = useState<Filters>(START);
  const results = CARS.filter((car) => matches(car, filters));

  return (
    <div className="w-full max-w-[400px]">
      <AppliedFilters
        filters={chipsOf(filters)}
        onRemove={(key) => setFilters((f) => ({ ...f, [key]: null }))}
        onClearAll={() => setFilters(NONE)}
      />
      <p aria-live="polite" className="mt-4 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#929292)]">of {CARS.length} cars</span>
      </p>
      <ul className="mt-2 rounded-[24px] border border-[var(--fu-card-border,#2A2A2A)] bg-[var(--fu-card,#1F1F1F)] p-2">
        {results.slice(0, 4).map((car) => (
          <li key={car.name} className="flex h-12 items-center justify-between gap-3 px-3 text-[15px] leading-5 tabular-nums">
            <span className="min-w-0 truncate">
              <span className="font-medium">{car.name}</span> <span className="text-[13px] text-[var(--fu-dim,#929292)]">{car.year}</span>
            </span>
            <span className="shrink-0 font-medium text-[var(--fu-accent-soft,#8FAAFF)]">{money.format(car.price)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
