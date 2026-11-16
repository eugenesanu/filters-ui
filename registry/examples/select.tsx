"use client";

import { useState } from "react";
import { Select } from "../ui/select";

const CARS = [
  { name: "Honda Civic", year: 2017 },
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

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017];

// A year with no cars stays in the list but cannot be picked.
const OPTIONS = [
  { value: "", label: "Any" },
  ...YEARS.map((year) => ({ value: String(year), label: String(year), disabled: !CARS.some((car) => car.year === year) })),
];

export default function SelectExample() {
  const [from, setFrom] = useState("2020");
  const results = CARS.filter((car) => from === "" || car.year >= Number(from));

  return (
    <div className="w-full max-w-[240px]">
      <Select label="From year" prefix="From" value={from} onChange={setFrom} options={OPTIONS} />
      <p aria-live="polite" className="mt-3 px-[13px] text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
