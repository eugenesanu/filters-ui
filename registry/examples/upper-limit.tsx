"use client";

import { useState } from "react";
import { UpperLimit } from "../filters/upper-limit";
import { FilterCard } from "../ui/filter-card";

type Car = { name: string; km: number };

const CARS: Car[] = [
  { name: "Kia EV6", km: 4200 },
  { name: "Honda CR-V", km: 12800 },
  { name: "Tesla Model Y", km: 23500 },
  { name: "Kia Sportage", km: 31900 },
  { name: "Hyundai Tucson", km: 44100 },
  { name: "Toyota Camry", km: 52600 },
  { name: "Toyota RAV4", km: 58200 },
  { name: "Subaru Outback", km: 67400 },
  { name: "Mazda CX-5", km: 81300 },
  { name: "Ford Escape", km: 96700 },
  { name: "Honda Civic", km: 118400 },
  { name: "Ford F-150", km: 164000 },
];

const MAX = 150000;
const STEP = 5000;
const BARS = 15;

const whole = new Intl.NumberFormat("en-US");
const km = (value: number) => `${whole.format(value)} km`;

// How many cars fall in each bar; one past MAX counts in the last.
const buckets = Array.from({ length: BARS }, () => 0);
for (const car of CARS) {
  buckets[Math.min(BARS - 1, Math.floor((car.km / MAX) * BARS))] += 1;
}

export default function KilometresExample() {
  const [limit, setLimit] = useState<number | null>(null);
  const results = CARS.filter((car) => limit === null || car.km <= limit);

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Kilometres"
        summary={limit === null ? null : `Under ${km(limit)}`}
        onClear={() => setLimit(null)}
        defaultOpen
        bodyClassName="pb-[18px]"
      >
        <UpperLimit
          min={0}
          max={MAX}
          step={STEP}
          value={limit}
          onChange={setLimit}
          buckets={buckets}
          barScale={0.75}
          format={km}
          label="Maximum kilometres"
        />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
