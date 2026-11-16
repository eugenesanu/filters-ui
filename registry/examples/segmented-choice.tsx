"use client";

import { useState } from "react";
import { SegmentedChoice } from "../filters/segmented-choice";
import { FilterCard } from "../ui/filter-card";

type Home = { street: string; bedrooms: number };

const HOMES: Home[] = [
  { street: "Mill Lane", bedrooms: 1 },
  { street: "Harbour Road", bedrooms: 2 },
  { street: "Elm Street", bedrooms: 3 },
  { street: "Park Row", bedrooms: 1 },
  { street: "Station Hill", bedrooms: 2 },
  { street: "Canal Walk", bedrooms: 4 },
  { street: "Orchard Close", bedrooms: 2 },
  { street: "King Street", bedrooms: 1 },
  { street: "Bridge End", bedrooms: 3 },
  { street: "Meadow View", bedrooms: 2 },
  { street: "Church Lane", bedrooms: 5 },
  { street: "Forest Road", bedrooms: 3 },
];

const MINIMUMS = [2, 3, 4];

// "Any" has no count; each "at least" option counts the homes it would show.
const options = [
  { value: null, label: "Any" },
  ...MINIMUMS.map((min) => ({
    value: min,
    label: `${min}+`,
    count: HOMES.filter((home) => home.bedrooms >= min).length,
  })),
];

export default function SegmentedChoiceExample() {
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const results = HOMES.filter((home) => bedrooms === null || home.bedrooms >= bedrooms);

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Bedrooms"
        summary={bedrooms === null ? null : `${bedrooms}+`}
        onClear={() => setBedrooms(null)}
        defaultOpen
        bodyClassName="pb-2.5"
      >
        <SegmentedChoice<number | null> label="Bedrooms" options={options} value={bedrooms} onChange={setBedrooms} />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 text-[var(--fu-mute,#BDBDBD)] tabular-nums">
        {results.length === 1 ? "1 result" : `${results.length} results`}
      </p>
    </div>
  );
}
