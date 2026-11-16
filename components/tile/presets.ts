import { THIS_YEAR } from "@/registry/demo/cars";
import { EMPTY_CAR_FILTERS, type CarFacet, type CarFilters } from "@/registry/demo/cars-facets";

type Preset = { facet: CarFacet; filters: Partial<CarFilters> };

/** The state each tile is shown in. A slug with none shows its own example, untouched. */
export const PRESETS: Record<string, Preset> = {
  "range-histogram": { facet: "price", filters: { priceMin: 15000, priceMax: 45000 } },
  "range-select": { facet: "year", filters: { yearMin: THIS_YEAR - 6, yearMax: THIS_YEAR - 2 } },
  "upper-limit": { facet: "km", filters: { kmMax: 60000 } },
  "segmented-choice": { facet: "seats", filters: { seatsMin: 7 } },
  "chip-group": { facet: "fuel", filters: { fuels: ["Hybrid", "Electric"] } },
  "icon-tiles": { facet: "body", filters: { bodies: ["SUV"] } },
  "color-swatches": { facet: "color", filters: { colors: ["Blue", "White"] } },
  "searchable-list": { facet: "make", filters: { makes: [{ make: "Toyota", models: [] }] } },
};

/** The filters a tile shows for one facet, so a stage can open in the same state. */
export function presetFilters(slug: string, facet: CarFacet): CarFilters {
  const preset = PRESETS[slug];
  return preset?.facet === facet ? { ...EMPTY_CAR_FILTERS, ...preset.filters } : EMPTY_CAR_FILTERS;
}

