"use client";

import { useState } from "react";
import { SearchableList, type SearchableListOption, type SearchableListPick } from "../filters/searchable-list";
import { FilterCard } from "../ui/filter-card";

type Car = { make: string; model: string };

const CARS: Car[] = [
  { make: "Toyota", model: "RAV4" },
  { make: "Toyota", model: "RAV4" },
  { make: "Toyota", model: "Corolla" },
  { make: "Toyota", model: "Camry" },
  { make: "Honda", model: "CR-V" },
  { make: "Honda", model: "Civic" },
  { make: "Honda", model: "Civic" },
  { make: "Ford", model: "F-150" },
  { make: "Ford", model: "Mustang" },
  { make: "Mazda", model: "CX-5" },
  { make: "Mazda", model: "MX-5" },
  { make: "Hyundai", model: "Tucson" },
  { make: "Kia", model: "Telluride" },
  { make: "Subaru", model: "Outback" },
  { make: "Tesla", model: "Model 3" },
];

const SHORT_LIST = 5;

const carCount = (n: number) => (n === 1 ? "1 car" : `${n} cars`);

// Makes with the most cars first, each with its models.
function optionsOf(cars: Car[]): SearchableListOption[] {
  const makes = [...new Set(cars.map((c) => c.make))];
  const count = (make: string) => cars.filter((c) => c.make === make).length;
  return makes
    .sort((a, b) => count(b) - count(a) || a.localeCompare(b))
    .map((make) => ({
      value: make,
      label: make,
      count: count(make),
      children: [...new Set(cars.filter((c) => c.make === make).map((c) => c.model))].map((model) => ({
        value: model,
        label: model,
        count: cars.filter((c) => c.make === make && c.model === model).length,
      })),
    }));
}

const options = optionsOf(CARS);

// A make with models ticked keeps only those models; a make with none keeps all of them.
const matches = (car: Car, picks: SearchableListPick[]) =>
  picks.length === 0 ||
  picks.some((p) => p.value === car.make && (p.children.length === 0 || p.children.includes(car.model)));

function summaryOf(picks: SearchableListPick[]) {
  const names = picks.flatMap((p) => (p.children.length ? p.children : [p.value]));
  if (names.length === 0) return null;
  return names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

export default function MakeAndModelExample() {
  const [makes, setMakes] = useState<SearchableListPick[]>([]);
  const results = CARS.filter((car) => matches(car, makes));

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Make and model"
        summary={summaryOf(makes)}
        onClear={() => setMakes([])}
        defaultOpen
        bodyClassName="pb-3.5"
      >
        <SearchableList
          label="Make and model"
          noun="makes"
          collapsedCount={SHORT_LIST}
          options={options}
          value={makes}
          onChange={setMakes}
          countLabel={carCount}
        />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
