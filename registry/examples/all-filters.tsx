"use client";

import { useState } from "react";
import { AllFilters } from "../filters/all-filters";
import { ChipGroup } from "../filters/chip-group";
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
const countBy = (f: Filters, skip: Key, value: (car: Car) => string) => {
  const counts = new Map<string, number>();
  for (const car of matching(f, skip)) counts.set(value(car), (counts.get(value(car)) ?? 0) + 1);
  return counts;
};

const MAX = 100000;
const BARS = 20;
const whole = new Intl.NumberFormat("en-US");
const tenths = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const money = (value: number) => `$${whole.format(value)}`;
const short = (value: number) => (value >= 1000 ? `$${tenths.format(value / 1000)}k` : money(value));
const carCount = (n: number) => (n === 1 ? "1 car" : `${n} cars`);

function priceLabel([low, high]: RangeValue) {
  if (low !== null && high !== null) return `${short(low)} to ${short(high)}`;
  if (high !== null) return `Under ${short(high)}`;
  if (low !== null) return `Over ${short(low)}`;
  return null;
}

export default function AllFiltersExample() {
  const [filters, setFilters] = useState<Filters>({ ...EMPTY, price: [15000, 45000], bodies: ["SUV", "Sedan"] });
  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const results = matching(filters);

  const buckets = Array.from({ length: BARS }, () => 0);
  for (const car of matching(filters, "price")) buckets[Math.min(BARS - 1, Math.floor((car.price / MAX) * BARS))] += 1;
  const bodies = countBy(filters, "bodies", (car) => car.body);
  const fuels = countBy(filters, "fuels", (car) => car.fuel);
  const price = priceLabel(filters.price);
  const removeFrom = (key: "bodies" | "fuels", value: string) => () => setFilters((f) => ({ ...f, [key]: f[key].filter((v) => v !== value) }));

  return (
    <AllFilters
      className="w-full max-w-[720px]"
      defaultPicked="body"
      showLabel={`Show ${carCount(results.length)}`}
      onShow={() => console.log(`Show ${results.length} cars`)}
      onClearAll={() => setFilters(EMPTY)}
      groups={[
        {
          label: "Body and engine",
          filters: [
            {
              id: "body",
              label: "Body style",
              hint: "Pick one or more.",
              keywords: ["shape", "type"],
              values: filters.bodies.map((body) => ({ key: body, label: body, onRemove: removeFrom("bodies", body) })),
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
              hint: "Pick one or more.",
              keywords: ["electric", "hybrid", "gas"],
              values: filters.fuels.map((fuel) => ({ key: fuel, label: fuel, onRemove: removeFrom("fuels", fuel) })),
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
          ],
        },
        {
          label: "Price and size",
          filters: [
            {
              id: "price",
              label: "Price",
              hint: "Drag the handles or type a price.",
              keywords: ["cost", "budget"],
              values: price ? [{ key: "price", label: price, onRemove: () => set({ price: [null, null] }) }] : [],
              onClear: () => set({ price: [null, null] }),
              content: (
                <RangeHistogram
                  min={0}
                  max={MAX}
                  step={2500}
                  value={filters.price}
                  onChange={(next) => set({ price: next })}
                  buckets={buckets}
                  format={money}
                  labels={{ low: "Lowest price", high: "Highest price" }}
                />
              ),
            },
            {
              id: "seats",
              label: "Seats",
              hint: "The fewest seats you need.",
              values: filters.seats === null ? [] : [{ key: "seats", label: `${filters.seats}+ seats`, onRemove: () => set({ seats: null }) }],
              onClear: () => set({ seats: null }),
              content: (
                <SegmentedChoice<number | null>
                  label="Seats"
                  options={[
                    { value: null, label: "Any" },
                    ...[6, 7, 8].map((min) => ({ value: min, label: `${min}+`, count: matching(filters, "seats").filter((car) => car.seats >= min).length })),
                  ]}
                  value={filters.seats}
                  onChange={(next) => set({ seats: next })}
                  countLabel={carCount}
                />
              ),
            },
          ],
        },
      ]}
    />
  );
}
