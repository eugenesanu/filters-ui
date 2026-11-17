"use client";

import { useState } from "react";
import { CascadingDropdown, type CascadeOption } from "../filters/cascading-dropdown";
import { FilterCard } from "../ui/filter-card";

// Cars in stock per make and model.
const STOCK: Record<string, Record<string, number>> = {
  Toyota: { RAV4: 11, Corolla: 7, Camry: 5, Tacoma: 3 },
  Honda: { Civic: 9, "CR-V": 8, Accord: 4 },
  Ford: { "F-150": 10, Escape: 5, Mustang: 2 },
  Tesla: { "Model Y": 6, "Model 3": 5 },
  Hyundai: { Tucson: 6, "Ioniq 5": 3 },
  Kia: { Sportage: 5, EV6: 4 },
  Mazda: { "CX-5": 6, "MX-5": 1 },
  Subaru: { Outback: 4, Forester: 3 },
};

const sum = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);
const TOTAL = Object.values(STOCK).reduce((n, models) => n + sum(models), 0);

const OPTIONS: CascadeOption[] = Object.entries(STOCK).map(([make, models]) => ({
  value: make,
  label: make,
  count: sum(models),
  children: Object.entries(models).map(([model, count]) => ({ value: model, label: model, count })),
}));

const carCount = (n: number) => (n === 1 ? "1 car" : `${n} cars`);

type Pick = [string | null, string | null];

export default function MakeModelExample() {
  const [pick, setPick] = useState<Pick>(["Toyota", null]);
  const [make, model] = pick;
  const results = make === null ? TOTAL : model === null ? sum(STOCK[make]) : STOCK[make][model];

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Make and model"
        summary={make && (model ? `${make} ${model}` : make)}
        onClear={() => setPick([null, null])}
        defaultOpen
      >
        <CascadingDropdown
          options={OPTIONS}
          value={pick}
          onChange={setPick}
          labels={{ first: "Make", second: "Model" }}
          anyLabels={{ first: "Any make", second: "Any model" }}
          waitingText="Pick a make first"
          secondHeading={(first) => `${first.label} models`}
          popularLabel="Popular"
          countLabel={carCount}
        />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results}</span> <span className="text-[var(--fu-dim,#929292)]">{results === 1 ? "car" : "cars"}</span>
      </p>
    </div>
  );
}
