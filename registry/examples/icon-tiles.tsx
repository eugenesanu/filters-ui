"use client";

import { useState, type ReactNode } from "react";
import { IconTiles } from "../filters/icon-tiles";
import { FilterCard } from "../ui/filter-card";

type Place = "House" | "Apartment" | "Cabin" | "Tent";

type Stay = { name: string; place: Place };

const STAYS: Stay[] = [
  { name: "Harbour view", place: "Apartment" },
  { name: "Pine hideaway", place: "Cabin" },
  { name: "Garden house", place: "House" },
  { name: "River camp", place: "Tent" },
  { name: "Old town loft", place: "Apartment" },
  { name: "Lake cabin", place: "Cabin" },
  { name: "Family house", place: "House" },
  { name: "Top floor flat", place: "Apartment" },
  { name: "Beach house", place: "House" },
  { name: "Hill cabin", place: "Cabin" },
  { name: "Studio by the park", place: "Apartment" },
  { name: "Meadow tent", place: "Tent" },
];

// Filled shapes in currentColor. Doors and windows use var(--tile-bg), the tile's own background, to read as cut out.
const CUT = "var(--tile-bg, #1F1F1F)";
const ICONS: Record<Place, ReactNode> = {
  House: (
    <svg viewBox="0 0 32 28" aria-hidden="true">
      <path d="M16 2 30 13v13H2V13z" fill="currentColor" />
      <rect x="13" y="17" width="6" height="9" rx="1" fill={CUT} />
    </svg>
  ),
  Apartment: (
    <svg viewBox="0 0 32 28" aria-hidden="true">
      <rect x="7" y="1" width="18" height="26" rx="2" fill="currentColor" />
      {[5, 11, 17].map((y) => (
        <g key={y} fill={CUT}>
          <rect x="10.5" y={y} width="4" height="3.5" rx="0.75" />
          <rect x="17.5" y={y} width="4" height="3.5" rx="0.75" />
        </g>
      ))}
    </svg>
  ),
  Cabin: (
    <svg viewBox="0 0 32 28" aria-hidden="true">
      <path d="M16 1 31 27H1z" fill="currentColor" />
      <rect x="13" y="18" width="6" height="9" rx="1" fill={CUT} />
    </svg>
  ),
  Tent: (
    <svg viewBox="0 0 32 28" aria-hidden="true">
      <path d="M16 3 30 27H2z" fill="currentColor" />
      <path d="M16 13 21 27H11z" fill={CUT} />
    </svg>
  ),
};

const PLACES: Place[] = ["House", "Apartment", "Cabin", "Tent"];

const options = PLACES.map((place) => ({
  value: place,
  label: place,
  icon: ICONS[place],
  count: STAYS.filter((stay) => stay.place === place).length,
}));

const summaryOf = (picked: Place[]) =>
  picked.length === 0 ? null : picked.length <= 2 ? picked.join(", ") : `${picked.slice(0, 2).join(", ")} +${picked.length - 2}`;

export default function IconTilesExample() {
  const [places, setPlaces] = useState<Place[]>([]);
  const results = STAYS.filter((stay) => places.length === 0 || places.includes(stay.place));

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Type of place"
        summary={summaryOf(places)}
        onClear={() => setPlaces([])}
        defaultOpen
        bodyClassName="pb-1.5"
      >
        <IconTiles label="Type of place" options={options} value={places} onChange={setPlaces} />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 text-[var(--fu-mute,#BDBDBD)] tabular-nums">
        {results.length === 1 ? "1 result" : `${results.length} results`}
      </p>
    </div>
  );
}
