"use client";

import { useState } from "react";
import { SegmentedChoice } from "../filters/segmented-choice";
import { FilterCard } from "../ui/filter-card";

type Car = { name: string; seats: number };

const CARS: Car[] = [
  { name: "Mazda MX-5", seats: 2 },
  { name: "Chevrolet Corvette", seats: 2 },
  { name: "Ford Mustang", seats: 4 },
  { name: "Honda Civic", seats: 5 },
  { name: "Toyota RAV4", seats: 5 },
  { name: "Tesla Model Y", seats: 5 },
  { name: "Ford F-150", seats: 6 },
  { name: "Volkswagen Tiguan", seats: 7 },
  { name: "Chrysler Pacifica", seats: 7 },
  { name: "Toyota Highlander", seats: 8 },
  { name: "Kia Telluride", seats: 8 },
  { name: "Toyota Sienna", seats: 8 },
];

const MINIMUMS = [6, 7, 8];

const carCount = (n: number) => (n === 1 ? "1 car" : `${n} cars`);

// "Any" has no count; each "at least" option counts the cars it would show.
const options = [
  { value: null, label: "Any" },
  ...MINIMUMS.map((min) => ({
    value: min,
    label: `${min}+`,
    count: CARS.filter((car) => car.seats >= min).length,
  })),
];

export default function SeatsExample() {
  const [seats, setSeats] = useState<number | null>(null);
  const results = CARS.filter((car) => seats === null || car.seats >= seats);

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Seats"
        summary={seats === null ? null : `${seats}+`}
        onClear={() => setSeats(null)}
        defaultOpen
      >
        <SegmentedChoice<number | null> label="Seats" options={options} value={seats} onChange={setSeats} countLabel={carCount} />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
