"use client";

import { useState } from "react";
import { RangeSelect } from "../filters/range-select";
import { FilterCard } from "../ui/filter-card";

type Bike = { name: string; year: number };

const BIKES: Bike[] = [
  { name: "City 3", year: 2017 },
  { name: "Gravel One", year: 2019 },
  { name: "Trail 2", year: 2020 },
  { name: "Commuter", year: 2020 },
  { name: "Road Pro", year: 2021 },
  { name: "Cargo Long", year: 2022 },
  { name: "Gravel Two", year: 2022 },
  { name: "Folding S", year: 2023 },
  { name: "City 5", year: 2023 },
  { name: "Trail 4", year: 2024 },
  { name: "Road Air", year: 2025 },
  { name: "Cargo Short", year: 2025 },
];

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

// One bar per year, in the order of YEARS.
const buckets = YEARS.map((year) => BIKES.filter((bike) => bike.year === year).length);

type YearRange = [number | null, number | null];

function summaryOf([from, to]: YearRange) {
  if (from !== null && from === to) return String(from);
  if (from !== null && to !== null) return `${from} to ${to}`;
  if (from !== null) return `${from} or newer`;
  if (to !== null) return `${to} or older`;
  return null;
}

export default function YearRangeExample() {
  const [years, setYears] = useState<YearRange>([null, null]);
  const [from, to] = years;
  const results = BIKES.filter((bike) => (from === null || bike.year >= from) && (to === null || bike.year <= to));

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Year"
        summary={summaryOf(years)}
        onClear={() => setYears([null, null])}
        defaultOpen
        bodyClassName="pb-[18px]"
      >
        <RangeSelect
          options={YEARS}
          value={years}
          onChange={setYears}
          buckets={buckets}
          pickerOrder="descending"
          barScale={0.5}
          labels={{ low: "From year", high: "To year" }}
        />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 text-[var(--fu-mute,#BDBDBD)] tabular-nums">
        {results.length === 1 ? "1 result" : `${results.length} results`}
      </p>
    </div>
  );
}
