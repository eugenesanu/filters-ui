"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { Logo } from "@/components/logo";
import { CarFilterBody } from "@/components/stage/car-filter";
import type { StageStatus } from "@/components/stage/stage-controls";
import { StageCount } from "@/components/stage/stage-count";
import { presetFilters } from "@/components/tile/presets";
import { HERO } from "@/lib/home-copy";
import { CARS } from "@/registry/demo/cars";
import {
  CAR_FACET_COLUMNS,
  CAR_FACET_TITLES,
  EMPTY_CAR_FILTERS,
  clearFacet,
  formatCarCount,
  matchingCars,
  summaryOf,
  type CarFacet,
  type CarFilters,
} from "@/registry/demo/cars-facets";
import { carVocabulary } from "@/registry/demo/cars-vocabulary";
import { AppliedFilters, type AppliedFilter } from "@/registry/filters/applied-filters";
import { SentenceSearch } from "@/registry/filters/sentence-search";
import { FilterCard } from "@/registry/ui/filter-card";
import { FiltersHead } from "@/registry/ui/filters-head";

const READY: StageStatus = { state: "ready", status: "ready", disabled: false, onRetry: () => {} };
const CAR_NOUN = { one: "car", other: "cars" };
const nothing = () => {};

// The home tiles' hover glow, held on, as on the bento boards.
const GLOW =
  "pointer-events-none absolute inset-[-100%] -z-20 bg-[conic-gradient(var(--fu-glow-blue),var(--fu-glow-violet),var(--fu-glow-rose),var(--fu-glow-amber),var(--fu-glow-teal),var(--fu-glow-blue))] opacity-[0.4]";

/**
 * The canvas and its one tile: the site's panel surface with the glow ring, the live filter in the middle.
 * The filter is drawn at its real size and the recorder magnifies the whole page `zoom` times instead (CSS zoom
 * would put the pointer a few pixels off a dragged handle), so the tile's own measures are divided by it here.
 */
function Board({
  glow = 250,
  zoom = 2.5,
  width = 320,
  top,
  children,
}: {
  glow?: number;
  zoom?: number;
  width?: number;
  /** Sits this far under the tile's top edge instead of in the middle, and fades out at the bottom. */
  top?: number;
  children: ReactNode;
}) {
  const u = (px: number) => px / zoom;
  return (
    <div id="shot" className="bg-page" style={{ width: u(1600), height: u(1200), padding: u(44) }}>
      <div
        className={`relative isolate flex h-full justify-center overflow-hidden border-solid border-card bg-panel ${top === undefined ? "items-center" : "items-start"}`}
        style={{ borderRadius: u(28), borderWidth: u(1) }}
      >
        <span aria-hidden className={GLOW} style={{ rotate: `${glow}deg` }} />
        <span aria-hidden className="pointer-events-none absolute -z-10 rounded-[inherit] bg-panel" style={{ inset: u(3), filter: `blur(${u(14)}px)` }} />
        <div
          className="shrink-0"
          style={
            top === undefined
              ? { width }
              : { width, height: "100%", paddingTop: u(top), maskImage: `linear-gradient(to bottom, #000 calc(100% - ${u(90)}px), transparent calc(100% - ${u(8)}px))` }
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** One car filter in its card with the result count under it, as on the filter's own page. */
function CarFilterScene({ slug, facet, glow }: { slug: string; facet: CarFacet; glow?: number }) {
  const [filters, setFilters] = useState<CarFilters>(() => presetFilters(slug, facet));
  const [open, setOpen] = useState(true);
  const set = (patch: Partial<CarFilters>) => setFilters((f) => ({ ...f, ...patch }));
  return (
    <Board glow={glow}>
      <FilterCard
        title={CAR_FACET_TITLES[facet]}
        summary={summaryOf(filters, facet)}
        onClear={() => setFilters((f) => clearFacet(f, facet))}
        open={open}
        onOpenChange={setOpen}
        headingLevel={2}
      >
        <CarFilterBody facet={facet} filters={filters} set={set} />
      </FilterCard>
      <div className="mt-3 ps-4">
        <StageCount matches={matchingCars(filters).length} total={CARS.length} stage={READY} />
      </div>
    </Board>
  );
}

/** One live car filter card on the shared search. */
function LiveCard({
  facet,
  filters,
  setFilters,
  open,
  onOpenChange,
  headingLevel = 3,
}: {
  facet: CarFacet;
  filters: CarFilters;
  setFilters: (next: (f: CarFilters) => CarFilters) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  headingLevel?: 3 | 4;
}) {
  return (
    <FilterCard
      data-facet={facet}
      title={CAR_FACET_TITLES[facet]}
      summary={summaryOf(filters, facet)}
      onClear={() => setFilters((f) => clearFacet(f, facet))}
      open={open ?? true}
      onOpenChange={onOpenChange ?? nothing}
      headingLevel={headingLevel}
    >
      <CarFilterBody facet={facet} filters={filters} set={(patch) => setFilters((f) => ({ ...f, ...patch }))} />
    </FilterCard>
  );
}

/** One box of the bento grid: the site's tile surface, with the glow ring when `glow` gives its angle. */
function Cell({ area, glow, middle = false, width = 320, children }: { area: string; glow?: number; middle?: boolean; width?: number; children: ReactNode }) {
  return (
    <div data-cell={area} className="relative isolate overflow-hidden rounded-[28px] border border-card bg-panel" style={{ gridArea: area }}>
      {glow !== undefined && (
        <>
          <span aria-hidden className={GLOW} style={{ rotate: `${glow}deg` }} />
          <span aria-hidden className="pointer-events-none absolute inset-[3px] -z-10 rounded-[inherit] bg-panel blur-[14px]" />
        </>
      )}
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,#000_calc(100%-80px),transparent_calc(100%-6px))]">
        <div className={`flex h-full flex-col items-center px-5 ${middle ? "justify-center pb-2" : "pt-7"}`}>
          <div className="shrink-0" style={{ width }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The order chips take in the row, whatever order the filters were set in. */
const CHIP_ORDER: CarFacet[] = ["price", "year", "km", "condition", "make", "body", "fuel", "drive", "transmission", "color", "seats"];
const chipsOf = (f: CarFilters): AppliedFilter[] =>
  CHIP_ORDER.flatMap((facet) => {
    const value = summaryOf(f, facet);
    return value === null ? [] : [{ key: facet, label: CAR_FACET_TITLES[facet], value }];
  });

/** The search a bento board opens on and comes back to. */
const BENTO_START: CarFilters = { ...EMPTY_CAR_FILTERS, colors: ["White"], bodies: ["SUV"], fuels: ["Hybrid"], priceMax: 45000 };

/**
 * A bento board where every box is live and holds the same search: a word typed in the sentence box lights the colour
 * and the body style, a dragged price writes itself into the sentence, and the head counts the cars left.
 */
function BentoScene() {
  const [filters, setFilters] = useState<CarFilters>(BENTO_START);
  const matches = matchingCars(filters).length;
  const card = (facet: CarFacet) => <LiveCard facet={facet} filters={filters} setFilters={setFilters} />;
  return (
    <div
      id="shot"
      className="grid h-[1200px] w-[1600px] grid-cols-4 grid-rows-3 gap-5 bg-page p-11"
      style={{ gridTemplateAreas: '"brand brand colour body" "price sentence sentence body" "fuel head head seats"' }}
    >
      <div className="relative isolate overflow-hidden rounded-[28px] border border-card bg-panel" style={{ gridArea: "brand" }}>
        <HeroBackdrop />
        <div className="flex h-full flex-col p-9">
          <Logo className="h-8 w-auto self-start" />
          <p className="mt-7 whitespace-nowrap text-[46px] font-semibold leading-[1.05] tracking-[-0.03em] text-text">{HERO.title}</p>
        </div>
      </div>
      <Cell area="colour" middle glow={210}>
        {card("color")}
      </Cell>
      <Cell area="body">
        <div className="flex flex-col gap-4">
          {card("body")}
          {card("drive")}
        </div>
      </Cell>
      <Cell area="price" middle glow={30}>
        {card("price")}
      </Cell>
      <Cell area="sentence" width={640}>
        <SentenceSearch vocabulary={carVocabulary} items={CARS} value={filters} onChange={setFilters} label="Describe the car you want" countLabel={formatCarCount} />
        <div className="mt-3 ps-4">
          <StageCount matches={matches} total={CARS.length} stage={READY} live={false} />
        </div>
      </Cell>
      <Cell area="fuel" middle>
        {card("fuel")}
      </Cell>
      <Cell area="head" middle width={640} glow={120}>
        <FiltersHead count={matches} noun={CAR_NOUN} headingLevel={3} onClearAll={() => setFilters(EMPTY_CAR_FILTERS)} onShow={nothing} />
        <AppliedFilters className="mt-6" filters={chipsOf(filters)} onRemove={(key) => setFilters((f) => clearFacet(f, key as CarFacet))} />
      </Cell>
      <Cell area="seats" middle>
        {card("seats")}
      </Cell>
    </div>
  );
}

const SET_START: CarFilters = { ...EMPTY_CAR_FILTERS, priceMin: 15000, priceMax: 60000, bodies: ["SUV", "Sedan"] };
const SET_OPEN: CarFacet[] = ["price", "seats", "year", "body", "color", "fuel"];
const SET_ZOOM = 1.5625;

/** The full set in one tile, as on the home page, with every card live on one search. */
function SetScene() {
  const [filters, setFilters] = useState<CarFilters>(SET_START);
  const [open, setOpen] = useState<CarFacet[]>(SET_OPEN);
  return (
    <Board zoom={SET_ZOOM} width={929} glow={250} top={34}>
      <FiltersHead count={matchingCars(filters).length} noun={CAR_NOUN} headingLevel={3} onClearAll={() => setFilters(EMPTY_CAR_FILTERS)} onShow={nothing} />
      <div className="mt-6 grid grid-cols-3 items-start gap-4">
        {CAR_FACET_COLUMNS.map((column) => (
          <div key={column[0]} className="flex min-w-0 flex-col gap-4">
            {column.map((facet) => (
              <LiveCard
                key={facet}
                facet={facet}
                filters={filters}
                setFilters={setFilters}
                open={open.includes(facet)}
                onOpenChange={(next) => setOpen((was) => (next ? [...was, facet] : was.filter((f) => f !== facet)))}
                headingLevel={4}
              />
            ))}
          </div>
        ))}
      </div>
    </Board>
  );
}

const SCENES: Record<string, ComponentType> = {
  price: () => <CarFilterScene slug="range-histogram" facet="price" glow={30} />,
  bento: BentoScene,
  set: SetScene,
};

/** The scene a name picks; an unknown name draws nothing. */
export function Scene({ name }: { name: string }) {
  const Picked = SCENES[name];
  return Picked ? <Picked /> : null;
}
