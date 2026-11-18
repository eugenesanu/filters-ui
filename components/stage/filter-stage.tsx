"use client";

import type { CarFacet } from "@/registry/demo/cars-facets";
import type { ItemState } from "@/registry/items";
import { StageControlsProvider } from "@/components/stage/stage-controls";
import {
  AllFiltersStage,
  AppliedFiltersStage,
  BoardStage,
  BudgetStage,
  CarFilterStage,
  ExampleStage,
  FilterPillsStage,
  ListedStage,
  NoResultsStage,
  PanelStage,
  RecentSearchesStage,
  RulesStage,
  SentenceStage,
} from "@/components/stage/lazy-stages";

/** Which car filters demonstrate each tile; several make a quiet switch at the stage top-left. A tile with none shows its example. */
const STAGE_FACETS: Record<string, CarFacet[]> = {
  "range-histogram": ["price"],
  "range-select": ["year"],
  "upper-limit": ["km"],
  "segmented-choice": ["seats", "condition", "transmission"],
  "chip-group": ["fuel", "drive"],
  "icon-tiles": ["body"],
  "color-swatches": ["color"],
  "searchable-list": ["make"],
};

export function FilterStage({ slug, states }: { slug: string; states: readonly ItemState[] }) {
  return (
    <StageControlsProvider slug={slug} states={states}>
      <StageFor slug={slug} />
    </StageControlsProvider>
  );
}

function StageFor({ slug }: { slug: string }) {
  if (slug === "cars-board") return <BoardStage />;
  if (slug === "sentence-search") return <SentenceStage />;
  if (slug === "filter-pills") return <FilterPillsStage />;
  if (slug === "all-filters") return <AllFiltersStage />;
  if (slug === "date-range") return <ListedStage />;
  if (slug === "budget") return <BudgetStage />;
  if (slug === "no-results") return <NoResultsStage />;
  if (slug === "applied-filters") return <AppliedFiltersStage />;
  if (slug === "recent-searches") return <RecentSearchesStage />;
  if (slug === "rules") return <RulesStage />;
  if (slug === "filter-panel") return <PanelStage />;
  const facets = STAGE_FACETS[slug];
  return facets ? <CarFilterStage slug={slug} facets={facets} /> : <ExampleStage slug={slug} />;
}
