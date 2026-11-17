"use client";

import { FilterPanel } from "../blocks/filter-panel";
import { EMPTY_CAR_FILTERS } from "../demo/cars-facets";

// The panel keeps its own filters and counts; onShow gets the cars that match.
// Give it a height or a max height, as a sidebar would, and the rows scroll between the head and Show.
export default function FilterPanelExample() {
  return (
    <FilterPanel
      className="mx-auto h-[600px] max-w-[400px]"
      defaultFilters={{ ...EMPTY_CAR_FILTERS, priceMax: 45000, makes: [{ make: "Toyota", models: ["RAV4"] }] }}
      defaultOpen={["make"]}
      onShow={(cars) => console.log(`Show ${cars.length} cars`)}
    />
  );
}
