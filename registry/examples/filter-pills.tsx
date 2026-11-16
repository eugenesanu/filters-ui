"use client";

import { useState } from "react";
import { ChipGroup } from "../filters/chip-group";
import { FilterPills } from "../filters/filter-pills";
import { RangeHistogram } from "../filters/range-histogram";
import { SegmentedChoice } from "../filters/segmented-choice";
import type { RangeValue } from "../ui/range-chart";

type Car = { name: string; price: number; body: string; fuel: string; seats: number };

const CARS: Car[] = [
  { name: "Toyota Corolla", price: 22900, body: "Sedan", fuel: "Gas", seats: 5 },
  { name: "Honda Civic", price: 26500, body: "Sedan", fuel: "Gas", seats: 5 },
  { name: "Mazda CX-5", price: 28400, body: "SUV", fuel: "Gas", seats: 5 },
  { name: "Toyota RAV4", price: 31900, body: "SUV", fuel: "Hybrid", seats: 5 },
  { name: "Hyundai Tucson", price: 32700, body: "SUV", fuel: "Plug-in hybrid", seats: 5 },
  { name: "Subaru Outback", price: 34800, body: "SUV", fuel: "Gas", seats: 5 },
  { name: "Tesla Model 3", price: 36900, body: "Sedan", fuel: "Electric", seats: 5 },
  { name: "Honda Odyssey", price: 38400, body: "Minivan", fuel: "Gas", seats: 8 },
  { name: "Kia Sorento", price: 39500, body: "SUV", fuel: "Hybrid", seats: 7 },
  { name: "Kia Telluride", price: 42500, body: "SUV", fuel: "Gas", seats: 8 },
  { name: "Toyota Sienna", price: 44900, body: "Minivan", fuel: "Hybrid", seats: 8 },
  { name: "Tesla Model Y", price: 46900, body: "SUV", fuel: "Electric", seats: 7 },
  { name: "Toyota Highlander", price: 48700, body: "SUV", fuel: "Hybrid", seats: 8 },
  { name: "Ford F-150", price: 52900, body: "Truck", fuel: "Gas", seats: 6 },
  { name: "BMW X3", price: 58800, body: "SUV", fuel: "Plug-in hybrid", seats: 5 },
  { name: "Ford Mustang Mach-E", price: 66500, body: "SUV", fuel: "Electric", seats: 5 },
];

type Filters = { price: RangeValue; bodies: string[]; fuels: string[]; seats: number | null };
type Key = keyof Filters;

const EMPTY: Filters = { price: [null, null], bodies: [], fuels: [], seats: null };

const TESTS: Record<Key, (car: Car, f: Filters) => boolean> = {
  price: (car, { price: [low, high] }) => (low === null || car.price >= low) && (high === null || car.price <= high),
  bodies: (car, f) => !f.bodies.length || f.bodies.includes(car.body),
  fuels: (car, f) => !f.fuels.length || f.fuels.includes(car.fuel),
  seats: (car, f) => f.seats === null || car.seats >= f.seats,
};

// Each count leaves its own filter out, so it says how many cars picking that option would give.
const matching = (f: Filters, skip?: Key) =>
  CARS.filter((car) => (Object.keys(TESTS) as Key[]).every((key) => key === skip || TESTS[key](car, f)));
const countBy = (f: Filters, skip: Key, value: (car: Car) => string | number) => {
  const counts = new Map<string | number, number>();
  for (const car of matching(f, skip)) counts.set(value(car), (counts.get(value(car)) ?? 0) + 1);
  return counts;
};

const MIN = 0;
const MAX = 100000;
const STEP = 2500;
const BARS = 20;

const whole = new Intl.NumberFormat("en-US");
const tenths = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const money = (value: number) => `$${whole.format(value)}`;
const short = (value: number) => (value >= 1000 ? `$${tenths.format(value / 1000)}k` : money(value));
const carCount = (n: number) => (n === 1 ? "1 car" : `${n} cars`);

function priceSummary([low, high]: RangeValue) {
  if (low !== null && high !== null) return `${short(low)} to ${short(high)}`;
  if (high !== null) return `Under ${short(high)}`;
  if (low !== null) return `Over ${short(low)}`;
  return null;
}

const list = (values: string[]) => (values.length <= 2 ? values.join(", ") : `${values.slice(0, 2).join(", ")} +${values.length - 2}`);

export default function FilterPillsExample() {
  const [filters, setFilters] = useState<Filters>({ ...EMPTY, price: [15000, 45000] });
  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const results = matching(filters);

  const buckets = Array.from({ length: BARS }, () => 0);
  for (const car of matching(filters, "price")) buckets[Math.min(BARS - 1, Math.floor((car.price / MAX) * BARS))] += 1;
  const bodies = countBy(filters, "bodies", (car) => car.body);
  const fuels = countBy(filters, "fuels", (car) => car.fuel);
  const seats = matching(filters, "seats");

  return (
    <div className="w-full max-w-[560px]">
      <FilterPills
        label="Filters"
        // Price starts open here, to show its panel.
        defaultOpen="price"
        showLabel={`Show ${carCount(results.length)}`}
        onClearAll={() => setFilters(EMPTY)}
        pills={[
          {
            id: "price",
            label: "Price",
            summary: priceSummary(filters.price),
            onClear: () => set({ price: [null, null] }),
            width: 360,
            content: (
              <RangeHistogram
                min={MIN}
                max={MAX}
                step={STEP}
                value={filters.price}
                onChange={(price) => set({ price })}
                buckets={buckets}
                format={money}
                labels={{ low: "Lowest price", high: "Highest price" }}
              />
            ),
          },
          {
            id: "body",
            label: "Body style",
            summary: filters.bodies.length ? list(filters.bodies) : null,
            onClear: () => set({ bodies: [] }),
            content: (
              <ChipGroup
                label="Body style"
                options={["SUV", "Sedan", "Minivan", "Truck"].map((body) => ({ value: body, label: body, count: bodies.get(body) ?? 0 }))}
                value={filters.bodies}
                onChange={(next) => set({ bodies: next })}
                countLabel={carCount}
              />
            ),
          },
          {
            id: "fuel",
            label: "Fuel",
            summary: filters.fuels.length ? list(filters.fuels) : null,
            onClear: () => set({ fuels: [] }),
            content: (
              <ChipGroup
                label="Fuel"
                options={["Gas", "Hybrid", "Plug-in hybrid", "Electric"].map((fuel) => ({ value: fuel, label: fuel, count: fuels.get(fuel) ?? 0 }))}
                value={filters.fuels}
                onChange={(next) => set({ fuels: next })}
                countLabel={carCount}
              />
            ),
          },
          {
            id: "seats",
            label: "Seats",
            summary: filters.seats === null ? null : `${filters.seats}+`,
            onClear: () => set({ seats: null }),
            content: (
              <SegmentedChoice<number | null>
                label="Seats"
                options={[
                  { value: null, label: "Any" },
                  ...[6, 7, 8].map((min) => ({ value: min, label: `${min}+`, count: seats.filter((car) => car.seats >= min).length })),
                ]}
                value={filters.seats}
                onChange={(next) => set({ seats: next })}
                countLabel={carCount}
              />
            ),
          },
        ]}
      />
      <p aria-live="polite" className="mt-4 px-1 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
