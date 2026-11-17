"use client";

import { useState } from "react";
import { StageControlRow, useStage, useStageFrame, useStageStatus } from "@/components/stage/stage-controls";
import { StageCount } from "@/components/stage/stage-count";
import { longVocabulary } from "@/components/stage/long-names";
import { CARS, type Car } from "@/registry/demo/cars";
import { carFormats, matchingCars, type CarFilters } from "@/registry/demo/cars-facets";
import { carVocabulary, carVocabularyFor } from "@/registry/demo/cars-vocabulary";
import { RecentSearches, remember, type SavedSearch } from "@/registry/filters/recent-searches";
import { readSentence } from "@/registry/lib/sentence";
import type { ItemState } from "@/registry/items";

const read = (sentence: string) => readSentence(carVocabulary, CARS, sentence).value;

export const SAVED: SavedSearch<CarFilters>[] = [
  { id: "family", name: "Family hybrid", value: read("hybrid 7 seats") },
  { id: "city", name: "City electric", value: read("electric under 40k") },
  { id: "weekend", name: "Weekend truck", value: read("4wd truck") },
];

export const RECENT: SavedSearch<CarFilters>[] = ["blue suv under 30k", "rav4 2020 or newer", "hatchback under 25k", "silver awd under 35k"].map(
  (sentence, i) => ({ id: `recent-${i}`, value: read(sentence) }),
);

/** Long names on the saved searches for the long-labels state; the filters get theirs from longVocabulary. */
const LONG_SAVED: SavedSearch<CarFilters>[] = [
  { id: "family", name: "Family hybrid with room for the grandparents and the dog on long weekends away", value: read("hybrid 7 seats") },
  { id: "city", name: "City electric", value: read("white electric under 50k") },
  { id: "weekend", name: "Weekend truck", value: read("4wd truck") },
];

/** Twelve saved searches for the many-options state, so the list scrolls. */
const MANY_SAVED: SavedSearch<CarFilters>[] = [
  ...SAVED,
  ...[
    ["Commuter", "hybrid sedan under 25k"],
    ["Road trip", "awd suv 2022 or newer"],
    ["First car", "cheap hatchback"],
    ["Camping", "4wd suv"],
    ["Work van", "van"],
    ["Sunday drive", "convertible"],
    ["School run", "minivan 8 seats"],
    ["Snow days", "awd under 30k"],
    ["Quiet ride", "electric sedan"],
  ].map(([name, sentence], i) => ({ id: `many-${i}`, name, value: read(sentence) })),
];

/** The lists a state starts from: none for empty, long names, or twelve saved searches. */
function listsIn(state: ItemState): { saved: SavedSearch<CarFilters>[]; recent: SavedSearch<CarFilters>[] } {
  if (state === "empty") return { saved: [], recent: [] };
  if (state === "long-labels") return { saved: LONG_SAVED, recent: RECENT };
  if (state === "many-options") return { saved: MANY_SAVED, recent: RECENT };
  return { saved: SAVED, recent: RECENT };
}

/** The data states bring their own lists; the others keep the lists as they are. */
const listsOf = (state: ItemState) => (state === "empty" || state === "long-labels" || state === "many-options" ? state : "ready");

let made = 0;

/** The search with Saved and Recent kept in memory for this visit; Reset, or another data state, puts its starting lists back. */
export function RecentSearchesStage() {
  const frame = useStageFrame();
  const { locale } = useStage();
  const stage = useStageStatus();
  const { state, ...states } = stage;
  const f = carFormats(locale);
  const local = carVocabularyFor(locale);
  const vocabulary = state === "long-labels" ? longVocabulary(local) : local;
  const [round, setRound] = useState(0);
  const [filters, setFilters] = useState<CarFilters>(carVocabulary.empty);
  const [recent, setRecent] = useState(RECENT);
  const [saved, setSaved] = useState(SAVED);
  const [listed, setListed] = useState(listsOf(state));
  const matches = matchingCars(filters).length;

  if (listsOf(state) !== listed) {
    setListed(listsOf(state));
    setRecent(listsIn(state).recent);
    setSaved(listsIn(state).saved);
  }

  const reset = () => {
    setFilters(carVocabulary.empty);
    setRecent(listsIn(state).recent);
    setSaved(listsIn(state).saved);
    setRound((n) => n + 1);
  };

  return (
    // From 640px the open list floats over the stage, so the stage keeps room for all of it, 30px, and the two rows of
    // stage settings.
    <section aria-label="Try it" className="relative flex h-full min-h-[360px] flex-col rounded-[24px] border border-card bg-panel sm:min-h-[688px]">
      <div className="flex min-h-12 items-center justify-end gap-3 px-3 pt-3">
        <button
          type="button"
          onClick={reset}
          className="h-9 shrink-0 cursor-pointer rounded-[10px] px-3 text-[14px] font-medium leading-5 text-dim transition-[color,background-color] duration-200 ease-smooth hover:bg-wash hover:text-text"
        >
          Reset
        </button>
      </div>
      <div {...frame} className="flex-1 px-4 pb-0 pt-2 sm:px-8">
        {/* On phones the open list sits in the flow, so it grows the stage instead of covering the copy panel below.
            With long names or many searches the list would reach past that room: there it stops at Ready's height and
            scrolls. */}
        <div
          className={`mx-auto flex w-full max-w-[600px] flex-col pt-2 max-sm:[&_[data-state=open]:has(>[data-status-frame])]:static ${
            state === "long-labels" || state === "many-options" ? "sm:[&_[role=listbox]]:max-h-[min(56dvh,414px)]" : ""
          }`}
        >
          <RecentSearches<Car, CarFilters>
            locale={locale}
            key={round}
            vocabulary={vocabulary}
            items={CARS}
            value={filters}
            onChange={setFilters}
            recent={recent}
            saved={saved}
            onSearch={(value) => setRecent((list) => remember(vocabulary, list, value))}
            onSave={(value, name) => setSaved((list) => [...list, { id: `saved-${(made += 1)}`, name, value }])}
            onForget={(id) => {
              setRecent((list) => list.filter((entry) => entry.id !== id));
              setSaved((list) => list.filter((entry) => entry.id !== id));
            }}
            label="Describe the car you want"
            countLabel={f.carCount}
            defaultOpen
            {...states}
          />
          {/* No saved searches still leaves every car: the count reads as it does when ready. */}
          <div className="mt-3 ps-4">
            <StageCount matches={matches} total={CARS.length} stage={state === "empty" ? { ...stage, state: "ready" } : stage} live={false} />
          </div>
        </div>
      </div>
      <StageControlRow />
    </section>
  );
}
