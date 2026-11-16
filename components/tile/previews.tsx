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
import { BODY_FIT, CarFilterBody } from "@/components/stage/car-filter";
import { exampleOf } from "@/components/stage/example-of";
import { PRESETS } from "@/components/tile/presets";

// Previews are inert, so nothing ever calls these.
const still = () => {};

function PresetCard({ facet, filters, headingLevel = 3 }: { facet: CarFacet; filters: CarFilters; headingLevel?: 3 | 4 }) {
  return (
    <FilterCard
      title={CAR_FACET_TITLES[facet]}
      summary={summaryOf(filters, facet)}
      open
      headingLevel={headingLevel}
      bodyClassName={BODY_FIT[facet]}
    >
      <CarFilterBody facet={facet} filters={filters} set={still} />
    </FilterCard>
  );
}

export function TilePreview({ slug }: { slug: string }) {
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
