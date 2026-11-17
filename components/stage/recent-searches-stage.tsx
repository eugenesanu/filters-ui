"use client";

import { useState } from "react";
import { CARS, type Car } from "@/registry/demo/cars";
import { formatCarCount, matchingCars, type CarFilters } from "@/registry/demo/cars-facets";
import { carVocabulary } from "@/registry/demo/cars-vocabulary";
import { RecentSearches, remember, type SavedSearch } from "@/registry/filters/recent-searches";
import { readSentence } from "@/registry/lib/sentence";
import { TextSwap } from "@/registry/ui/text-swap";

const read = (sentence: string) => readSentence(carVocabulary, CARS, sentence).value;

export const SAVED: SavedSearch<CarFilters>[] = [
  { id: "family", name: "Family hybrid", value: read("hybrid 7 seats") },
  { id: "city", name: "City electric", value: read("electric under 40k") },
  { id: "weekend", name: "Weekend truck", value: read("4wd truck") },
];

export const RECENT: SavedSearch<CarFilters>[] = ["blue suv under 30k", "rav4 2020 or newer", "hatchback under 25k", "silver awd under 35k"].map(
  (sentence, i) => ({ id: `recent-${i}`, value: read(sentence) }),
);

const count = new Intl.NumberFormat("en-US");
let made = 0;

/** The search with Saved and Recent kept in memory for this visit; Reset puts the starting lists back. */
export function RecentSearchesStage() {
  const [round, setRound] = useState(0);
  const [filters, setFilters] = useState<CarFilters>(carVocabulary.empty);
  const [recent, setRecent] = useState(RECENT);
  const [saved, setSaved] = useState(SAVED);
  const matches = matchingCars(filters).length;

  const reset = () => {
    setFilters(carVocabulary.empty);
    setRecent(RECENT);
    setSaved(SAVED);
    setRound((n) => n + 1);
  };

  return (
    // From 640px the open list floats over the stage, so the stage keeps room for all of it.
    <section aria-label="Try it" className="relative flex h-full min-h-[360px] flex-col rounded-[24px] border border-card bg-panel sm:min-h-[616px]">
      <div className="flex min-h-12 items-center justify-end gap-3 px-3 pt-3">
        <button
          type="button"
          onClick={reset}
          className="h-9 shrink-0 cursor-pointer rounded-[10px] px-3 text-[14px] font-medium leading-5 text-dim transition-[color,background-color] duration-200 ease-smooth hover:bg-wash hover:text-text"
        >
          Reset
        </button>
      </div>
      <div className="flex-1 px-4 pb-10 pt-2 sm:px-8">
        {/* On phones the open list sits in the flow, so it grows the stage instead of covering the copy panel below. */}
        <div className="mx-auto flex w-full max-w-[600px] flex-col pt-2 max-sm:[&_[data-state=open]:has(>[role=listbox])]:static">
          <RecentSearches<Car, CarFilters>
            key={round}
            vocabulary={carVocabulary}
            items={CARS}
            value={filters}
            onChange={setFilters}
            recent={recent}
            saved={saved}
            onSearch={(value) => setRecent((list) => remember(carVocabulary, list, value))}
            onSave={(value, name) => setSaved((list) => [...list, { id: `saved-${(made += 1)}`, name, value }])}
            onForget={(id) => {
              setRecent((list) => list.filter((entry) => entry.id !== id));
              setSaved((list) => list.filter((entry) => entry.id !== id));
            }}
            label="Describe the car you want"
            countLabel={formatCarCount}
            defaultOpen
          />
          <p className="mt-3 pl-4 text-[14px] leading-5 text-dim tabular-nums">
            <TextSwap className="font-medium text-text">{count.format(matches)}</TextSwap> of {count.format(CARS.length)} cars
          </p>
        </div>
      </div>
    </section>
  );
}
