"use client";

import { useState } from "react";
import { RangeHistogram } from "../filters/range-histogram";
import type { RangeValue } from "../ui/range-chart";
import { FilterCard } from "../ui/filter-card";

type Product = { name: string; price: number };

const PRODUCTS: Product[] = [
  { name: "Oak side table", price: 140 },
  { name: "Linen armchair", price: 620 },
  { name: "Wool rug", price: 380 },
  { name: "Floor lamp", price: 95 },
  { name: "Walnut desk", price: 840 },
  { name: "Cane chair", price: 210 },
  { name: "Bookshelf", price: 330 },
  { name: "Two-seat sofa", price: 960 },
  { name: "Bedside lamp", price: 60 },
  { name: "Dining bench", price: 270 },
  { name: "Wall mirror", price: 180 },
  { name: "Storage chest", price: 450 },
];

const MIN = 0;
const MAX = 1000;
const STEP = 25;
const BARS = 20;

const money = (value: number) => `$${value.toLocaleString("en-US")}`;

// How many products fall in each bar, from MIN to MAX.
const buckets = Array.from({ length: BARS }, () => 0);
for (const { price } of PRODUCTS) {
  buckets[Math.min(BARS - 1, Math.floor(((price - MIN) / (MAX - MIN)) * BARS))] += 1;
}

function summaryOf([low, high]: RangeValue) {
  if (low !== null && high !== null) return `${money(low)} to ${money(high)}`;
  if (high !== null) return `Under ${money(high)}`;
  if (low !== null) return `Over ${money(low)}`;
  return null;
}

export default function PriceRangeExample() {
  const [price, setPrice] = useState<RangeValue>([null, null]);
  const [low, high] = price;
  const results = PRODUCTS.filter((p) => (low === null || p.price >= low) && (high === null || p.price <= high));

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
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 text-[var(--fu-mute,#BDBDBD)] tabular-nums">
        {results.length === 1 ? "1 result" : `${results.length} results`}
      </p>
    </div>
  );
}
