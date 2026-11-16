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
import { Button, IconButton } from "@/registry/ui/button";
import { DropdownMenu } from "@/registry/ui/dropdown-menu";
import { CopyIcon } from "@/registry/ui/icons";
import { TextLink } from "@/registry/ui/link";
import { Select } from "@/registry/ui/select";

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

const SORTS = [
  { value: "newest", label: "Newest listings" },
  { value: "price-low", label: "Price low to high" },
  { value: "price-high", label: "Price high to low" },
  { value: "km-low", label: "Lowest kilometres" },
  { value: "year-new", label: "Newest model year" },
];

const SORTED_CARS = [
  { name: "Honda Civic", detail: "2019", price: "$17,900" },
  { name: "Ford Escape", detail: "2020", price: "$21,500" },
  { name: "Mazda CX-5", detail: "2021", price: "$26,200" },
  { name: "Toyota RAV4", detail: "2022", price: "$31,400" },
];

/** The Dropdown page's sorted list, with its sort menu open over it. */
function DropdownPreview() {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 pr-[7px] pl-[21px]">
        <p className="text-[14px] leading-5 text-dim">5 cars</p>
        <DropdownMenu still variant="quiet" label="Sort by" prefix="Sort by" align="end" value="price-low" onChange={still} options={SORTS} />
      </div>
      <ul className="mt-2 rounded-[24px] border border-card-border bg-card p-2">
        {SORTED_CARS.map((car) => (
          <li key={car.name} className="flex h-14 items-center gap-3 px-3 tabular-nums">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium leading-5 text-text">{car.name}</span>
              <span className="block text-[13px] leading-5 text-mute">{car.detail}</span>
            </span>
            <span className="shrink-0 text-[15px] font-medium leading-5 text-accent-soft">{car.price}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const YEAR_OPTIONS = [{ value: "", label: "Any" }, ...[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map((y) => ({ value: String(y), label: String(y) }))];

/** A year field with its list open on the chosen year. */
function SelectPreview() {
  return <Select still label="From year" prefix="From" value="2025" onChange={still} options={YEAR_OPTIONS} />;
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

export function TilePreview({ slug }: { slug: string }) {
  if (slug === "sentence-search") return <SentencePreview />;
  if (slug === "dropdown") return <DropdownPreview />;
  if (slug === "select") return <SelectPreview />;
  if (slug === "buttons") return <ButtonsPreview />;
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
