"use client";

import { useState } from "react";
import { RangeHistogram } from "../filters/range-histogram";
import type { RangeValue } from "../ui/range-chart";
import { FilterCard } from "../ui/filter-card";

type Car = { name: string; price: number };

const CARS: Car[] = [
  { name: "Toyota Corolla", price: 21900 },
  { name: "Honda Civic", price: 24500 },
  { name: "Mazda CX-5", price: 27400 },
  { name: "Toyota RAV4", price: 29900 },
  { name: "Hyundai Tucson", price: 31200 },
  { name: "Subaru Outback", price: 33800 },
  { name: "Tesla Model 3", price: 38700 },
  { name: "Ford Mustang", price: 41500 },
  { name: "Kia Telluride", price: 46500 },
  { name: "Ford F-150", price: 52900 },
  { name: "BMW X3", price: 54800 },
  { name: "Chevrolet Corvette", price: 89900 },
];

const MIN = 0;
const MAX = 100000;
const STEP = 2500;
const BARS = 20;

const whole = new Intl.NumberFormat("en-US");
const tenths = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const money = (value: number) => `$${whole.format(value)}`;
const short = (value: number) => (value >= 1000 ? `$${tenths.format(value / 1000)}k` : money(value));

// How many cars fall in each bar; a dearer car counts in the last one.
const buckets = Array.from({ length: BARS }, () => 0);
for (const { price } of CARS) {
  buckets[Math.min(BARS - 1, Math.floor(((price - MIN) / (MAX - MIN)) * BARS))] += 1;
}

function summaryOf([low, high]: RangeValue) {
  if (low !== null && high !== null) return `${short(low)} to ${short(high)}`;
  if (high !== null) return `Under ${short(high)}`;
  if (low !== null) return `Over ${short(low)}`;
  return null;
}

export default function PriceExample() {
  const [price, setPrice] = useState<RangeValue>([null, null]);
  const [low, high] = price;
  const results = CARS.filter((car) => (low === null || car.price >= low) && (high === null || car.price <= high));

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Price"
        summary={summaryOf(price)}
        onClear={() => setPrice([null, null])}
        defaultOpen
        bodyClassName="pb-[18px]"
      >
        <RangeHistogram
          min={MIN}
          max={MAX}
          step={STEP}
          value={price}
          onChange={setPrice}
          buckets={buckets}
          format={money}
          labels={{ low: "Lowest price", high: "Highest price" }}
        />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
