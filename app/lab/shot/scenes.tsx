"use client";

import { useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { carMatches, carRelax } from "@/components/stage/car-relax";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { Logo } from "@/components/logo";
import { CarFilterBody } from "@/components/stage/car-filter";
import type { StageStatus } from "@/components/stage/stage-controls";
import { StageCount } from "@/components/stage/stage-count";
import { presetFilters } from "@/components/tile/presets";
import { HERO } from "@/lib/home-copy";
import { BudgetDemo } from "@/components/stage/budget-demo";
import { listedFilters } from "@/components/stage/listed-demo";
import { CAR_RULE_FIELDS, CAR_RULES } from "@/components/stage/rules-stage";
import { CARS, FUELS, type Car } from "@/registry/demo/cars";
import {
  CAR_FACET_COLUMNS,
  CAR_FACET_TITLES,
  EMPTY_CAR_FILTERS,
  clearFacet,
  carFormats,
  formatCarCount,
  fuelCounts,
  listedCounts,
  makeOptions,
  matchingCars,
  summaryOf,
  type CarFacet,
  type CarFilters,
} from "@/registry/demo/cars-facets";
import { carVocabulary } from "@/registry/demo/cars-vocabulary";
import { AppliedFilters, type AppliedFilter } from "@/registry/filters/applied-filters";
import { BarList } from "@/registry/filters/bar-list";
import { DateRange, daysBetween, formatDateRange, useToday, type DateRangeValue } from "@/registry/filters/date-range";
import { FilterPills, type FilterPill } from "@/registry/filters/filter-pills";
import { NoResults } from "@/registry/filters/no-results";
import { SlidersIcon } from "@/registry/ui/icons";
import { matchRules, Rules, type RuleSet } from "@/registry/filters/rules";
import { SearchableList } from "@/registry/filters/searchable-list";
import { SentenceSearch } from "@/registry/filters/sentence-search";
import { readSentence } from "@/registry/lib/sentence";
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
  glow,
  zoom = 2.5,
  width = 320,
  top,
  children,
}: {
  /** Degrees the ring of colour is turned; left out, the tile has no glow. */
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
        {glow !== undefined && (
          <>
            <span aria-hidden className={GLOW} style={{ rotate: `${glow}deg` }} />
            <span aria-hidden className="pointer-events-none absolute -z-10 rounded-[inherit] bg-panel" style={{ inset: u(3), filter: `blur(${u(14)}px)` }} />
          </>
        )}
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
    <Board zoom={SET_ZOOM} width={929} top={34}>
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

const CARDS_ZOOM = 1.25;
type CardKey = CarFacet | "fuel-bars" | "make-list";
// One box per kind of filter, none twice: date range, bar list, chips, segmented choice, icon tiles, swatches,
// searchable list, price range. Picked so each pair of columns comes out the same height.
const CARDS_LEFT: CardKey[][] = [["listed"], ["fuel-bars", "drive", "seats"]];
const CARDS_RIGHT: CardKey[][] = [
  ["body", "color"],
  ["make-list", "price"],
];
/** The makes shown before "All 21 makes"; one fewer than the site's eight, so the card ends level with its neighbour. */
const MAKES_SHOWN = 7;

type SetFilters = (next: (f: CarFilters) => CarFilters) => void;

/** Fuel as a bar list: the same choice as the chips, drawn as ranked rows. */
function FuelBars({ filters, setFilters }: { filters: CarFilters; setFilters: SetFilters }) {
  const counts = fuelCounts(filters);
  return (
    <FilterCard data-facet="fuel" title="Fuel" summary={summaryOf(filters, "fuel")} onClear={() => setFilters((f) => clearFacet(f, "fuel"))} open onOpenChange={nothing} headingLevel={3}>
      <BarList
        label="Fuel"
        noun="fuels"
        options={FUELS.map((v) => ({ value: v, label: v, count: counts.get(v) ?? 0 }))}
        value={filters.fuels}
        onChange={(fuels) => setFilters((f) => ({ ...f, fuels: fuels as CarFilters["fuels"] }))}
        countLabel={formatCarCount}
      />
    </FilterCard>
  );
}

/** Make and model as on the site, with a row fewer up front. */
function MakeList({ filters, setFilters }: { filters: CarFilters; setFilters: SetFilters }) {
  return (
    <FilterCard data-facet="make" title={CAR_FACET_TITLES.make} summary={summaryOf(filters, "make")} onClear={() => setFilters((f) => clearFacet(f, "make"))} open onOpenChange={nothing} headingLevel={3}>
      <SearchableList
        label="Make and model"
        noun="makes"
        collapsedCount={MAKES_SHOWN}
        options={makeOptions(filters)}
        value={filters.makes.map((pick) => ({ value: pick.make, children: pick.models }))}
        onChange={(picks) => setFilters((f) => ({ ...f, makes: picks.map((pick) => ({ make: pick.value, models: pick.children })) }))}
        countLabel={formatCarCount}
      />
    </FilterCard>
  );
}

/** Listed as a date range. Its own value is kept beside the search and dropped when the search loses the filter. */
function ListedCard({ filters, setFilters }: { filters: CarFilters; setFilters: SetFilters }) {
  const today = useToday();
  const [value, setValue] = useState<DateRangeValue>(null);
  if (value !== null && filters.listedMin === null && filters.listedMax === null) setValue(null);
  const perDay = listedCounts(filters);
  return (
    <FilterCard data-facet="listed" title="Listed" summary={formatDateRange(value, undefined, today)} onClear={() => setFilters((f) => clearFacet(f, "listed"))} open onOpenChange={nothing} headingLevel={3}>
      <DateRange
        label="Listed"
        value={value}
        onChange={(next) => {
          setValue(next);
          const { listedMin, listedMax } = listedFilters(next, today);
          setFilters((f) => ({ ...f, listedMin, listedMax }));
        }}
        countOf={(day) => (today ? (perDay.get(daysBetween(day, today)) ?? 0) : 0)}
        total={[...perDay.values()].reduce((n, k) => n + k, 0)}
        countLabel={formatCarCount}
      />
    </FilterCard>
  );
}

/**
 * A bento board with no tiles around the filters: each filter card is a box of the grid itself, laid straight on
 * the page. Only the brand keeps the tile surface. Every card holds the same search as the sentence box.
 */
function CardsScene() {
  const [filters, setFilters] = useState<CarFilters>(BENTO_START);
  const u = (px: number) => px / CARDS_ZOOM;
  const gap = u(20);
  const half = (u(1600) - u(44) * 2 - gap) / 2;
  const brandHeight = 307;
  // The room under the brand tile on the left and under the search on the right; a column spreads its cards over it.
  const leftRoom = u(1200) - u(44) * 2 - brandHeight - gap;
  const rightRoom = 625;
  const box = (key: CardKey) =>
    key === "fuel-bars" ? (
      <FuelBars key={key} filters={filters} setFilters={setFilters} />
    ) : key === "make-list" ? (
      <MakeList key={key} filters={filters} setFilters={setFilters} />
    ) : key === "listed" ? (
      <ListedCard key={key} filters={filters} setFilters={setFilters} />
    ) : (
      <LiveCard key={key} facet={key} filters={filters} setFilters={setFilters} />
    );
  const column = (room: number) => (keys: CardKey[]) => (
    <div key={keys[0]} className="flex min-w-0 flex-col justify-between" style={{ height: room }}>
      {keys.map(box)}
    </div>
  );
  return (
    <div id="shot" className="relative overflow-hidden bg-page" style={{ width: u(1600), height: u(1200), padding: u(44) }}>
      <div className="grid grid-cols-2 items-start" style={{ gap }}>
        <div className="flex min-w-0 flex-col" style={{ gap }}>
          <div className="relative isolate overflow-hidden border-solid border-card bg-panel" style={{ height: brandHeight, borderRadius: u(28), borderWidth: u(1) }}>
            {/* Drawn at the size of the approved boards, whatever the page is magnified by. */}
            <div style={{ zoom: 1 / CARDS_ZOOM, width: half * CARDS_ZOOM, height: brandHeight * CARDS_ZOOM }} className="relative">
              <HeroBackdrop />
              <div className="flex h-full flex-col p-9">
                <div className="flex items-center justify-between">
                  <Logo className="h-8 w-auto" />
                  <span className="text-[20px] font-medium leading-8 text-mute">filtersui.com</span>
                </div>
                <p className="mt-7 whitespace-nowrap text-[46px] font-semibold leading-[1.05] tracking-[-0.03em] text-text">{HERO.title}</p>
              </div>
            </div>
          </div>
          {/* An even split on purpose: in a wider column the calendar's "Last 30 days" fits one line with a small count
              and two with a large one, and the card would change height mid-shot. */}
          <div className="grid grid-cols-2 items-start" style={{ gap }}>
            {CARDS_LEFT.map(column(leftRoom))}
          </div>
        </div>
        <div className="flex min-w-0 flex-col justify-between" style={{ height: u(1200) - u(44) * 2 }}>
          {/* The box grows a line when its tokens wrap; its room is kept, so the cards under it never move. */}
          <div data-cell="sentence" className="relative z-10 h-[100px]">
            <SentenceSearch vocabulary={carVocabulary} items={CARS} value={filters} onChange={setFilters} label="Describe the car you want" countLabel={formatCarCount} />
          </div>
          <div className="px-1">
            <FiltersHead count={matchingCars(filters).length} noun={CAR_NOUN} headingLevel={3} onClearAll={() => setFilters(EMPTY_CAR_FILTERS)} onShow={nothing} />
            <div className="mt-5 flex h-10 items-center">
              <AppliedFilters filters={chipsOf(filters)} onRemove={(key) => setFilters((f) => clearFacet(f, key as CarFacet))} />
            </div>
          </div>
          <div className="grid grid-cols-2 items-start" style={{ gap }}>
            {CARDS_RIGHT.map(column(rightRoom))}
          </div>
        </div>
      </div>
    </div>
  );
}

const FORMATS = carFormats();

/** The four cheapest cars a search finds, drawn as the site's result lists are. */
function CheapestCars({ cars, count = 4 }: { cars: readonly Car[]; count?: number }) {
  return (
    <ul aria-label="Cheapest results" className="rounded-[24px] border border-card-border bg-card p-2">
      {[...cars]
        .sort((a, b) => a.price - b.price)
        .slice(0, count)
        .map((car) => (
          <li key={car.id} className="flex h-14 items-center gap-3 px-3 tabular-nums">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium leading-5 text-text">
                {car.make} {car.model}
              </span>
              <span className="block truncate text-[13px] leading-5 text-dim">
                {car.year}
                {car.km !== null && <> · {FORMATS.km(car.km)}</>}
                {car.fuel && <> · {car.fuel}</>}
              </span>
            </span>
            <span className="shrink-0 text-[15px] font-medium leading-5 text-accent-soft">{FORMATS.money(car.price)}</span>
          </li>
        ))}
    </ul>
  );
}

/** The sentence box on the demo cars: the count and the cheapest finds under it. Opens on a sentence already read. */
function SentenceScene() {
  const [filters, setFilters] = useState<CarFilters>(() => readSentence(carVocabulary, CARS, "blue suv under 30k").value);
  const found = matchingCars(filters);
  return (
    <Board zoom={2} width={620} glow={300}>
      <div data-cell="sentence" className="relative z-10">
        <SentenceSearch vocabulary={carVocabulary} items={CARS} value={filters} onChange={setFilters} label="Describe the car you want" countLabel={formatCarCount} />
      </div>
      <div className="mt-3 ps-4">
        <StageCount matches={found.length} total={CARS.length} stage={READY} live={false} />
      </div>
      <div className="mt-4">
        <CheapestCars cars={found} />
      </div>
    </Board>
  );
}

/** The Listed card (a date range) on the demo cars, with the count under it. */
function ListedScene({ wide = false }: { wide?: boolean }) {
  const today = useToday();
  const [value, setValue] = useState<DateRangeValue>({ last: 30 });
  const filters = listedFilters(value, today);
  const perDay = listedCounts(filters);
  return (
    <Board zoom={wide ? 2 : 1.6} width={wide ? 600 : 320} glow={160}>
      <FilterCard data-facet="listed" title="Listed" summary={formatDateRange(value, undefined, today)} onClear={() => setValue(null)} open onOpenChange={nothing} headingLevel={2}>
        <DateRange
          label="Listed"
          value={value}
          onChange={setValue}
          countOf={(day) => (today ? (perDay.get(daysBetween(day, today)) ?? 0) : 0)}
          total={[...perDay.values()].reduce((n, k) => n + k, 0)}
          countLabel={formatCarCount}
        />
      </FilterCard>
      <div className="mt-3 ps-4">
        <StageCount matches={matchingCars(filters).length} total={CARS.length} stage={READY} live={false} />
      </div>
    </Board>
  );
}

/** The rules builder on the demo cars, opening on the page's own set: a budget, two fuels, then a group. */
function RulesScene() {
  const [rules, setRules] = useState<RuleSet>(CAR_RULES);
  const found = CARS.filter((car) => matchRules(car, rules, CAR_RULE_FIELDS)).length;
  return (
    <Board zoom={2} width={670} glow={90}>
      <Rules fields={CAR_RULE_FIELDS} items={CARS} value={rules} onChange={setRules} label="Car rules" countLabel={formatCarCount} />
      <div className="mt-4 ps-11">
        <StageCount matches={found} total={CARS.length} stage={READY} live={false} />
      </div>
    </Board>
  );
}

const PILL_BAR: { facet: CarFacet; width: number }[] = [
  { facet: "price", width: 360 },
  { facet: "make", width: 340 },
  { facet: "body", width: 320 },
  { facet: "fuel", width: 320 },
];
// Year waits in More filters here, so the bar stays on one line with two pills set and Clear all at its end.
const PILL_MORE: CarFacet[] = ["year", "km", "seats", "condition", "drive", "transmission", "color"];

/** The pill bar on the demo cars with the newest finds under it. Opens with nothing set. */
function PillsScene() {
  const [filters, setFilters] = useState<CarFilters>(EMPTY_CAR_FILTERS);
  const set = (patch: Partial<CarFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const found = matchingCars(filters);
  const pills: FilterPill[] = [
    ...PILL_BAR.map(({ facet, width }) => ({
      id: facet,
      label: CAR_FACET_TITLES[facet],
      summary: summaryOf(filters, facet),
      onClear: () => setFilters((f) => clearFacet(f, facet)),
      width,
      content: <CarFilterBody facet={facet} filters={filters} set={set} />,
    })),
    {
      id: "more",
      label: "More filters",
      icon: <SlidersIcon size={16} />,
      count: PILL_MORE.filter((facet) => summaryOf(filters, facet) !== null).length,
      onClear: () => setFilters((f) => PILL_MORE.reduce(clearFacet, f)),
      width: 400,
      content: <div />,
    },
  ];
  return (
    <Board zoom={1.6} width={900} glow={60} top={60}>
      <FilterPills label="Car filters" pills={pills} showLabel={`Show ${formatCarCount(found.length)}`} onClearAll={() => setFilters(EMPTY_CAR_FILTERS)} />
      <div className="mt-4 ps-1">
        <StageCount matches={found.length} total={CARS.length} stage={READY} />
      </div>
      <div className="mt-3">
        <CheapestCars cars={found} count={6} />
      </div>
    </Board>
  );
}

/** Rises in through a 6px blur when it mounts, as the results do on the No results page. */
function Reveal({ children }: { children: ReactNode }) {
  const node = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const rise = node.current?.animate(
      [
        { opacity: 0, transform: "translateY(6px)", filter: "blur(6px)" },
        { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
      ],
      { duration: 480, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" },
    );
    return () => rise?.cancel();
  }, []);
  return <div ref={node}>{children}</div>;
}

/** A hybrid with seven seats under $45k. Pull the price low enough and nothing is left. */
const NONE_START: CarFilters = { ...EMPTY_CAR_FILTERS, priceMax: 45000, fuels: ["Hybrid"], seatsMin: 7 };

/** The Price card over the results; a price too low finds nothing, and No results offers the changes that bring cars back. */
function NoResultsScene() {
  const [filters, setFilters] = useState<CarFilters>(NONE_START);
  const relax = useMemo(() => carRelax(), []);
  const found = matchingCars(filters);
  return (
    <Board zoom={1.6} width={600} glow={140} top={170}>
      <AppliedFilters filters={chipsOf(filters)} onRemove={(key) => setFilters((f) => clearFacet(f, key as CarFacet))} />
      <div className="mt-4">
        <LiveCard facet="price" filters={filters} setFilters={setFilters} headingLevel={3} />
      </div>
      <div className="mt-3 ps-4">
        <StageCount matches={found.length} total={CARS.length} stage={READY} />
      </div>
      <div className="mt-3">
        {found.length === 0 ? (
          <Reveal key="none">
            <NoResults items={CARS} value={filters} onChange={setFilters} matches={carMatches} relax={relax} title="No cars match" noun={CAR_NOUN} />
          </Reveal>
        ) : (
          <Reveal key="some">
            <CheapestCars cars={found} count={3} />
          </Reveal>
        )}
      </div>
    </Board>
  );
}

const SCENES: Record<string, ComponentType> = {
  price: () => <CarFilterScene slug="range-histogram" facet="price" glow={30} />,
  bento: BentoScene,
  cards: CardsScene,
  set: SetScene,
  sentence: SentenceScene,
  listed: () => <ListedScene />,
  "listed-wide": () => <ListedScene wide />,
  rules: RulesScene,
  pills: PillsScene,
  none: NoResultsScene,
  budget: () => (
    <Board zoom={2} glow={210}>
      <BudgetDemo reset={null} />
    </Board>
  ),
};

/** The scene a name picks; an unknown name draws nothing. */
export function Scene({ name }: { name: string }) {
  const Picked = SCENES[name];
  return Picked ? <Picked /> : null;
}
