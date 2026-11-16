"use client";

import { useState } from "react";
import { SearchableList, type SearchableListOption, type SearchableListPick } from "../filters/searchable-list";
import { FilterCard } from "../ui/filter-card";

type Trip = { name: string; country: string; city: string };

const TRIPS: Trip[] = [
  { name: "Old town walk", country: "Portugal", city: "Lisbon" },
  { name: "River boat", country: "Portugal", city: "Porto" },
  { name: "Tile workshop", country: "Portugal", city: "Lisbon" },
  { name: "Tapas night", country: "Spain", city: "Seville" },
  { name: "Museum morning", country: "Spain", city: "Madrid" },
  { name: "Pasta class", country: "Italy", city: "Rome" },
  { name: "Design tour", country: "Italy", city: "Milan" },
  { name: "Bike the canals", country: "Netherlands", city: "Amsterdam" },
  { name: "Island day", country: "Greece", city: "Athens" },
  { name: "Concert hall", country: "Austria", city: "Vienna" },
  { name: "Fjord cruise", country: "Norway", city: "Oslo" },
  { name: "Street art walk", country: "Germany", city: "Berlin" },
];

const SHORT_LIST = 5;

// Countries with the most trips first, each with its cities. Counts are trips.
function optionsOf(trips: Trip[]): SearchableListOption[] {
  const countries = [...new Set(trips.map((t) => t.country))];
  const count = (country: string) => trips.filter((t) => t.country === country).length;
  return countries
    .sort((a, b) => count(b) - count(a) || a.localeCompare(b))
    .map((country) => ({
      value: country,
      label: country,
      count: count(country),
      children: [...new Set(trips.filter((t) => t.country === country).map((t) => t.city))].map((city) => ({
        value: city,
        label: city,
        count: trips.filter((t) => t.city === city).length,
      })),
    }));
}

const options = optionsOf(TRIPS);

// A pick with cities keeps only those cities; a pick with none keeps the whole country.
const matches = (trip: Trip, picks: SearchableListPick[]) =>
  picks.length === 0 ||
  picks.some((p) => p.value === trip.country && (p.children.length === 0 || p.children.includes(trip.city)));

function summaryOf(picks: SearchableListPick[]) {
  const names = picks.flatMap((p) => (p.children.length ? p.children : [p.value]));
  if (names.length === 0) return null;
  return names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

export default function SearchableListExample() {
  const [places, setPlaces] = useState<SearchableListPick[]>([]);
  const results = TRIPS.filter((trip) => matches(trip, places));

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Destination"
        summary={summaryOf(places)}
        onClear={() => setPlaces([])}
        defaultOpen
        bodyClassName="pb-3.5"
      >
        <SearchableList
          label="Destination"
          noun="countries"
          collapsedCount={SHORT_LIST}
          options={options}
          value={places}
          onChange={setPlaces}
        />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 text-[var(--fu-mute,#BDBDBD)] tabular-nums">
        {results.length === 1 ? "1 result" : `${results.length} results`}
      </p>
    </div>
  );
}
