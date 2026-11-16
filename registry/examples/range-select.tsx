"use client";

import { useState } from "react";
import { RangeSelect } from "../filters/range-select";
import { FilterCard } from "../ui/filter-card";

type Car = { name: string; year: number };

const CARS: Car[] = [
  { name: "Honda Civic", year: 2017 },
  { name: "Ford Escape", year: 2018 },
  { name: "Toyota RAV4", year: 2019 },
  { name: "Mazda CX-5", year: 2019 },
  { name: "Subaru Outback", year: 2020 },
  { name: "Hyundai Tucson", year: 2021 },
  { name: "Toyota Camry", year: 2021 },
  { name: "Kia Sportage", year: 2022 },
  { name: "Tesla Model Y", year: 2023 },
  { name: "Honda CR-V", year: 2024 },
  { name: "Kia EV6", year: 2025 },
  { name: "Ford F-150", year: 2026 },
];

const YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

// One bar per year, in the order of YEARS.
const buckets = YEARS.map((year) => CARS.filter((car) => car.year === year).length);

type YearRange = [number | null, number | null];

function summaryOf([from, to]: YearRange) {
  if (from !== null && from === to) return String(from);
  if (from !== null && to !== null) return `${from} to ${to}`;
  if (from !== null) return `${from} or newer`;
  if (to !== null) return `${to} or older`;
  return null;
}

export default function YearExample() {
  const [years, setYears] = useState<YearRange>([null, null]);
  const [from, to] = years;
  const results = CARS.filter((car) => (from === null || car.year >= from) && (to === null || car.year <= to));

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Year"
        summary={summaryOf(years)}
        onClear={() => setYears([null, null])}
        defaultOpen
      >
        <RangeSelect
          options={YEARS}
          value={years}
          onChange={setYears}
          buckets={buckets}
          pickerOrder="descending"
          labels={{ low: "From year", high: "To year" }}
          countLabel={(n) => (n === 1 ? "1 car" : `${n} cars`)}
        />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
