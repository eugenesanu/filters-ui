"use client";

import { Activity, createElement } from "react";
import {
  CAR_FACET_COLUMNS,
  CAR_FACET_TITLES,
  EMPTY_CAR_FILTERS,
  formatCarCount,
  matchingCars,
  summaryOf,
  type CarFacet,
  type CarFilters,
} from "@/registry/demo/cars-facets";
import { FilterCard } from "@/registry/ui/filter-card";
import { FiltersHead } from "@/registry/ui/filters-head";
import { CarFilterBody } from "@/components/stage/car-filter";
import { CAR_RULE_FIELDS } from "@/components/stage/rules-stage";
import { recentSearches, savedSearches } from "@/components/stage/recent-searches-stage";
import { exampleOf } from "@/components/stage/example-of";
import { DropdownTilePreview, SelectTilePreview } from "@/components/tile/basics-previews";
import { PANEL_PRESET, PRESETS, SENTENCE_PRESET } from "@/components/tile/presets";
import { CARS, type Car } from "@/registry/demo/cars";
import { FilterPanel } from "@/registry/blocks/filter-panel";
import { carVocabulary } from "@/registry/demo/cars-vocabulary";
import { readSentence } from "@/registry/lib/sentence";
import { RecentSearches } from "@/registry/filters/recent-searches";
import { Rules, type RuleSet } from "@/registry/filters/rules";
import { SentenceSearch } from "@/registry/filters/sentence-search";
import { Button, IconButton } from "@/registry/ui/button";
import { CopyIcon } from "@/registry/ui/icons";
import { TextLink } from "@/registry/ui/link";
import { once } from "@/lib/once";

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

// Read when the tile first draws, not when this file loads: every item page loads it for its related tiles.
const sentenceValue = once(() => readSentence(carVocabulary, CARS, SENTENCE_PRESET).value);

/** The box with three tokens and its suggestions open under it. */
function SentencePreview() {
  return (
    <SentenceSearch
      vocabulary={carVocabulary}
      items={CARS}
      value={sentenceValue()}
      onChange={still}
      label="Describe the car you want"
      defaultOpen
    />
  );
}

const TILE_RULES: RuleSet = {
  join: "and",
  items: [
    { id: "price", field: "price", op: "atMost", value: 45000 },
    { id: "fuel", field: "fuel", op: "anyOf", value: ["Hybrid"] },
  ],
};

/** Two rules, so the whole set fits the tile and the falling count reads as a funnel. */
function RulesPreview() {
  return <Rules fields={CAR_RULE_FIELDS} items={CARS} value={TILE_RULES} onChange={still} label="Car rules" countLabel={formatCarCount} />;
}

/** The search with its list open and the first saved search highlighted, trying its filters on in the box. */
function RecentPreview() {
  return (
    <RecentSearches<Car, CarFilters>
      vocabulary={carVocabulary}
      items={CARS}
      value={carVocabulary.empty}
      onChange={still}
      recent={recentSearches()}
      saved={savedSearches()}
      onSearch={still}
      onSave={still}
      onForget={still}
      label="Describe the car you want"
      countLabel={formatCarCount}
      defaultOpen
      defaultHighlight={0}
    />
  );
}

/** One row of buttons and a sentence with a link, centred in the tile. */
function ButtonsPreview() {
  return (
    <div className="flex h-[208px] flex-col items-center justify-center gap-5">
      <div className="flex items-center gap-2">
        <Button tabIndex={-1}>Show 138 cars</Button>
        <Button tabIndex={-1} variant="secondary">
          Save search
        </Button>
        <IconButton tabIndex={-1} variant="secondary" label="Copy link" className="size-10">
          <CopyIcon />
        </IconButton>
      </div>
      <p className="text-[15px] leading-[1.6] text-mute">
        Free and MIT licensed, from{" "}
        <TextLink tabIndex={-1} href="https://filtersui.com">
          filtersui.com
        </TextLink>
        .
      </p>
    </div>
  );
}

/** The panel as in the designer's picture. Its Filters head is left out here so the open Make and model reaches the tile. */
function PanelPreview() {
  return (
    <FilterPanel
      headingLevel={3}
      defaultFilters={PANEL_PRESET.filters}
      defaultOpen={PANEL_PRESET.open}
      className="[&_[data-panel-head]]:hidden"
    />
  );
}

// A preview is a picture: inert, never pressed. On the home page, which holds two dozen of them, each sits in its own
// Activity (apart) so that on load the page around them (header, switch, links) comes alive first and the previews
// follow as the browser has time, instead of everything waiting for the last preview's script. The markup is the
// same. An item page has three, and there the split only adds work, so they come alive with the page.
export function TilePreview({ slug, apart = false }: { slug: string; apart?: boolean }) {
  if (!apart) return <PreviewOf slug={slug} />;
  return (
    <Activity mode="visible">
      <PreviewOf slug={slug} />
    </Activity>
  );
}

function PreviewOf({ slug }: { slug: string }) {
  if (slug === "sentence-search") return <SentencePreview />;
  if (slug === "filter-panel") return <PanelPreview />;
  if (slug === "dropdown") return <DropdownTilePreview />;
  if (slug === "select") return <SelectTilePreview />;
  if (slug === "buttons") return <ButtonsPreview />;
  if (slug === "rules") return <RulesPreview />;
  if (slug === "recent-searches") return <RecentPreview />;
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
    <Activity mode="visible">
      <Board />
    </Activity>
  );
}

function Board() {
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
