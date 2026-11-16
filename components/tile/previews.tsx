"use client";

import { createElement } from "react";
import {
  CAR_FACET_COLUMNS,
  CAR_FACET_TITLES,
  EMPTY_CAR_FILTERS,
  matchingCars,
  summaryOf,
  type CarFacet,
  type CarFilters,
} from "@/registry/demo/cars-facets";
import { FilterCard } from "@/registry/ui/filter-card";
import { FiltersHead } from "@/registry/ui/filters-head";
import { CarFilterBody } from "@/components/stage/car-filter";
import { exampleOf } from "@/components/stage/example-of";
import { PRESETS, SENTENCE_PRESET } from "@/components/tile/presets";
import { CARS } from "@/registry/demo/cars";
import { carVocabulary } from "@/registry/demo/cars-vocabulary";
import { readSentence } from "@/registry/lib/sentence";
import { SentenceSearch } from "@/registry/filters/sentence-search";

// Previews are inert, so nothing ever calls these.
const still = () => {};

function PresetCard({ facet, filters, headingLevel = 3 }: { facet: CarFacet; filters: CarFilters; headingLevel?: 3 | 4 }) {
  return (
    <FilterCard
      title={CAR_FACET_TITLES[facet]}
      summary={summaryOf(filters, facet)}
      open
      headingLevel={headingLevel}
    >
      <CarFilterBody facet={facet} filters={filters} set={still} />
    </FilterCard>
  );
}

const SENTENCE_VALUE = readSentence(carVocabulary, CARS, SENTENCE_PRESET).value;

/** The box with three tokens and its suggestions open under it. */
function SentencePreview() {
  return (
    <SentenceSearch
      vocabulary={carVocabulary}
      items={CARS}
      value={SENTENCE_VALUE}
      onChange={still}
      label="Describe the car you want"
      defaultOpen
    />
  );
}

export function TilePreview({ slug }: { slug: string }) {
  if (slug === "sentence-search") return <SentencePreview />;
  const preset = PRESETS[slug];
  if (!preset) return createElement(exampleOf(slug));
  return <PresetCard facet={preset.facet} filters={{ ...EMPTY_CAR_FILTERS, ...preset.filters }} />;
}

const BOARD_FILTERS: CarFilters = { ...EMPTY_CAR_FILTERS, priceMin: 15000, priceMax: 60000, bodies: ["SUV", "Sedan"] };
const BOARD_OPEN: CarFacet[] = ["price", "seats", "year", "body", "color", "fuel"];
const BOARD_COUNT = matchingCars(BOARD_FILTERS).length;

/** The full board as drawn: head, then three columns. Laid out here rather than through CarsBoard, whose columns follow the window and whose bar floats over the page. */
export function BoardPreview() {
  return (
    <div className="w-[929px]">
      <FiltersHead count={BOARD_COUNT} noun={{ one: "car", other: "cars" }} headingLevel={3} onClearAll={still} onShow={still} />
      <div className="mt-6 grid grid-cols-3 items-start gap-4">
        {CAR_FACET_COLUMNS.map((column) => (
          <div key={column[0]} className="flex min-w-0 flex-col gap-4">
            {column.map((facet) =>
              BOARD_OPEN.includes(facet) ? (
                <PresetCard key={facet} facet={facet} filters={BOARD_FILTERS} headingLevel={4} />
              ) : (
                <FilterCard key={facet} title={CAR_FACET_TITLES[facet]} summary={summaryOf(BOARD_FILTERS, facet)} headingLevel={4} />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
