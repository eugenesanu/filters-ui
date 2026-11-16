"use client";

import { useState } from "react";
import { Budget, budgetRange, type BudgetValue } from "../filters/budget";
import { FilterCard } from "../ui/filter-card";

const CARS = [
  { name: "Kia Rio", price: 12900 },
  { name: "Nissan Sentra", price: 17900 },
  { name: "Hyundai Elantra", price: 19400 },
  { name: "Toyota Corolla", price: 21900 },
  { name: "Mazda3", price: 22800 },
  { name: "Honda Civic", price: 24500 },
  { name: "Subaru Crosstrek", price: 26100 },
  { name: "Mazda CX-5", price: 27400 },
  { name: "Honda CR-V", price: 28600 },
  { name: "Toyota RAV4", price: 29900 },
  { name: "Hyundai Tucson", price: 31200 },
  { name: "Kia Sportage", price: 32400 },
  { name: "Subaru Outback", price: 33800 },
  { name: "Toyota Camry", price: 34900 },
  { name: "Volkswagen Tiguan", price: 36300 },
  { name: "Tesla Model 3", price: 38700 },
  { name: "Ford Mustang", price: 41500 },
  { name: "Jeep Wrangler", price: 43900 },
  { name: "Kia Telluride", price: 46500 },
  { name: "Ford F-150", price: 52900 },
  { name: "BMW X3", price: 54800 },
  { name: "Audi Q5", price: 58200 },
  { name: "Lexus RX", price: 66900 },
  { name: "Chevrolet Corvette", price: 89900 },
];

const MIN = 0;
const MAX = 100000;
const BARS = 20;
// An example rate for the estimate. Use the rate your lender quotes.
const RATE = 6.9;

const whole = new Intl.NumberFormat("en-US");
const money = (value: number) => `$${whole.format(value)}`;
const short = (value: number) => `$${Math.round(value / 1000)}k`;

const buckets = Array.from({ length: BARS }, () => 0);
for (const { price } of CARS) buckets[Math.min(BARS - 1, Math.floor(((price - MIN) / (MAX - MIN)) * BARS))] += 1;

function summaryOf(budget: BudgetValue) {
  if (budget.by === "monthly") return budget.monthly === null ? null : `${money(budget.monthly)} a month`;
  const [low, high] = budget.range;
  if (low !== null && high !== null) return `${short(low)} to ${short(high)}`;
  if (high !== null) return `Under ${short(high)}`;
  if (low !== null) return `Over ${short(low)}`;
  return null;
}

export default function BudgetExample() {
  const [budget, setBudget] = useState<BudgetValue>({ by: "monthly", monthly: 450, term: 60, down: 3000 });
  const [low, high] = budgetRange(budget, RATE);
  const results = CARS.filter((car) => (low === null || car.price >= low) && (high === null || car.price <= high));

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Budget"
        summary={summaryOf(budget)}
        onClear={() => setBudget(budget.by === "total" ? { by: "total", range: [null, null] } : { ...budget, monthly: null })}
        defaultOpen
      >
        <Budget value={budget} onChange={setBudget} min={MIN} max={MAX} step={2500} buckets={buckets} rate={RATE} format={money} />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
