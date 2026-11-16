"use client";

import { useState } from "react";
import { UpperLimit } from "../filters/upper-limit";
import { FilterCard } from "../ui/filter-card";

type Flat = { street: string; commute: number };

const FLATS: Flat[] = [
  { street: "Mill Lane", commute: 8 },
  { street: "Harbour Road", commute: 12 },
  { street: "Elm Street", commute: 15 },
  { street: "Park Row", commute: 18 },
  { street: "Station Hill", commute: 21 },
  { street: "Canal Walk", commute: 24 },
  { street: "Orchard Close", commute: 27 },
  { street: "King Street", commute: 31 },
  { street: "Bridge End", commute: 35 },
  { street: "Meadow View", commute: 42 },
  { street: "Church Lane", commute: 48 },
  { street: "Forest Road", commute: 55 },
];

const MAX = 60;
const STEP = 5;
const BARS = 20;

const minutes = (value: number) => `${value} min`;

// How many flats fall in each bar, from 0 to MAX minutes.
const buckets = Array.from({ length: BARS }, () => 0);
for (const { commute } of FLATS) {
  buckets[Math.min(BARS - 1, Math.floor((commute / MAX) * BARS))] += 1;
}

export default function UpperLimitExample() {
  const [limit, setLimit] = useState<number | null>(null);
  const results = FLATS.filter((flat) => limit === null || flat.commute <= limit);

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Commute"
        summary={limit === null ? null : `Under ${minutes(limit)}`}
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
          format={minutes}
          label="Longest commute"
        />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 text-[var(--fu-mute,#BDBDBD)] tabular-nums">
        {results.length === 1 ? "1 result" : `${results.length} results`}
      </p>
    </div>
  );
}
