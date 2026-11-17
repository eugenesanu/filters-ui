"use client";

import { createElement, useEffect, useRef, useState, type ReactNode } from "react";
import { CARS } from "@/registry/demo/cars";
import { CAR_FACET_TITLES, carFormats, clearFacet, matchingCars, summaryOf, type CarFacet, type CarFilters } from "@/registry/demo/cars-facets";
import { CarsBoard } from "@/registry/blocks/cars-board";
import { FilterCard } from "@/registry/ui/filter-card";
import { TextSwap } from "@/registry/ui/text-swap";
import { CarFilterBody } from "@/components/stage/car-filter";
import { exampleOf } from "@/components/stage/example-of";
import { carVocabulary, carVocabularyFor } from "@/registry/demo/cars-vocabulary";
import { SentenceSearch } from "@/registry/filters/sentence-search";
import { readSentence } from "@/registry/lib/sentence";
import { SENTENCE_PRESET } from "@/components/tile/presets";
import { presetFilters } from "@/components/tile/presets";
import { FilterPillsStage } from "@/components/stage/filter-pills-stage";
import { AllFiltersStage } from "@/components/stage/all-filters-stage";
import { ListedDemo } from "@/components/stage/listed-demo";
import { BudgetDemo } from "@/components/stage/budget-demo";
import { AppliedFiltersStage, NoResultsStage } from "@/components/stage/results-stages";
import { RecentSearchesStage } from "@/components/stage/recent-searches-stage";
import { RulesStage } from "@/components/stage/rules-stage";
import { FilterPanel } from "@/registry/blocks/filter-panel";
import { PANEL_PRESET } from "@/components/tile/presets";
import { StageControlRow, StageControlsProvider, useStage, useStageFrame, useStageProps } from "@/components/stage/stage-controls";
import { formatsFor } from "@/registry/lib/format";

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

const RESET =
  "h-9 shrink-0 cursor-pointer rounded-[10px] px-3 text-[14px] font-medium leading-5 text-dim transition-[color,background-color] duration-200 ease-smooth hover:bg-wash hover:text-text";

function ResetButton({ onReset, className }: { onReset: () => void; className?: string }) {
  return (
    <button type="button" onClick={onReset} className={className ? `${RESET} ${className}` : RESET}>
      Reset
    </button>
  );
}

/** The stage: its toolbar, the live component (in the direction and language the controls ask for) and the control row. */
export function StagePanel({ onReset, toolbar, children, wide = false }: { onReset?: () => void; toolbar?: ReactNode; children: ReactNode; wide?: boolean }) {
  const frame = useStageFrame();
  return (
    <section aria-label="Try it" className="relative flex h-full min-h-[360px] flex-col rounded-[24px] border border-card bg-panel">
      <div className="flex min-h-12 items-center justify-between gap-3 px-3 pt-3">
        {toolbar ?? <span />}
        {onReset && <ResetButton onReset={onReset} />}
      </div>
      <div {...frame} className={wide ? "flex-1 px-4 pt-2 sm:px-8" : "flex flex-1 flex-col items-center justify-center px-4 pb-1 pt-2 sm:pb-3"}>
        {children}
      </div>
      <StageControlRow />
    </section>
  );
}

function ExampleSwitch({ facets, value, onChange }: { facets: CarFacet[]; value: CarFacet; onChange: (facet: CarFacet) => void }) {
  return (
    <div role="group" aria-label="Example" className="flex min-w-0 flex-wrap items-center gap-x-1 ps-2 text-[14px] leading-5">
      <span className="me-1 text-dim">Example:</span>
      {facets.map((f) => (
        <button
          key={f}
          type="button"
          aria-pressed={f === value}
          onClick={() => onChange(f)}
          className={`inline-flex h-9 cursor-pointer items-center rounded-[10px] px-2 transition-[color,background-color] duration-200 ease-smooth ${
            f === value ? "text-text" : "text-dim hover:bg-wash hover:text-text"
          }`}
        >
          {CAR_FACET_TITLES[f]}
        </button>
      ))}
    </div>
  );
}

function CarFilterStage({ slug, facets }: { slug: string; facets: CarFacet[] }) {
  const { locale } = useStage();
  const n = formatsFor(locale).number;
  const [facet, setFacet] = useState(facets[0]);
  const [filters, setFilters] = useState<CarFilters>(() => presetFilters(slug, facets[0]));
  const [open, setOpen] = useState(true);
  const [round, setRound] = useState(0);
  const matches = matchingCars(filters).length;
  const set = (patch: Partial<CarFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const reset = () => {
    setFilters(presetFilters(slug, facet));
    setOpen(true);
    setRound((n) => n + 1);
  };

  return (
    <StagePanel
      toolbar={
        facets.length > 1 ? (
          <ExampleSwitch
            facets={facets}
            value={facet}
            onChange={(next) => {
              setFacet(next);
              setFilters(presetFilters(slug, next));
              setOpen(true);
            }}
          />
        ) : undefined
      }
    >
      <div className="flex w-full max-w-[320px] flex-col">
        <FilterCard
          key={`${facet}-${round}`}
          title={CAR_FACET_TITLES[facet]}
          summary={summaryOf(filters, facet, locale)}
          onClear={() => setFilters((f) => clearFacet(f, facet))}
          open={open}
          onOpenChange={setOpen}
          headingLevel={2}
        >
          <CarFilterBody facet={facet} filters={filters} set={set} locale={locale} />
        </FilterCard>
        <div className="mt-3 flex items-center justify-between gap-3 ps-4">
          <p aria-live="polite" className="text-[14px] leading-5 text-dim tabular-nums">
            <TextSwap className="font-medium text-text">{n(matches)}</TextSwap> of {n(CARS.length)} cars
          </p>
          <ResetButton onReset={reset} className="-me-3" />
        </div>
      </div>
    </StagePanel>
  );
}

function BoardStage() {
  const { locale } = useStage();
  const n = formatsFor(locale).number;
  const [round, setRound] = useState(0);
  const [away, setAway] = useState(false);
  const frame = useRef<HTMLDivElement>(null);

  // The board pins its Show bar to the window on phones, and on wider screens once its head scrolls away. Here the copy
  // panel sits under the stage, so the bar shows on phones only (below 640px, where the head hides its buttons) and
  // never once the stage is out of view.
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setAway(!entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const [shown, setShown] = useState<number | null>(null);
  return (
    // Menus carry data-state and .fixed too, but they are popovers.
    <div
      ref={frame}
      data-away={away || undefined}
      className="h-full sm:[&_.fixed[data-state]:not([popover])]:hidden data-[away]:[&_.fixed[data-state]:not([popover])]:hidden"
    >
    <StagePanel
      wide
      onReset={() => {
        setRound((n) => n + 1);
        setShown(null);
      }}
    >
      <CarsBoard
        key={round}
        className="mx-auto max-w-[929px]"
        defaultOpen={["price", "body", "make"]}
        onShow={(cars) => setShown(cars.length)}
        locale={locale}
      />
      <p aria-live="polite" className="mx-auto mt-6 h-5 max-w-[929px] text-[14px] leading-5 text-dim">
        {shown !== null && <>{n(shown)} {shown === 1 ? "car" : "cars"} sent to onShow</>}
      </p>
    </StagePanel>
    </div>
  );
}

/** Sentences a visitor can try; none needs a place. The last one is misspelt on purpose. */
const SENTENCES = ["blue suv under 30k", "hybrid with 7 seats", "rav4 2020 or newer", "cheap truck", "telsa"];

const presetSentence = () => readSentence(carVocabulary, CARS, SENTENCE_PRESET).value;

function SentenceStage() {
  const { locale } = useStage();
  const n = formatsFor(locale).number;
  const [filters, setFilters] = useState<CarFilters>(presetSentence);
  const [round, setRound] = useState(0);
  const [typed, setTyped] = useState<string | null>(null);
  const matches = matchingCars(filters).length;

  const reset = () => {
    setFilters(presetSentence());
    setTyped(null);
    setRound((n) => n + 1);
  };

  return (
    <StagePanel
      wide
      toolbar={
        <div role="group" aria-label="Try a sentence" className="flex min-w-0 items-start gap-x-1 ps-2 text-[14px] leading-5">
          <span className="me-1 flex h-9 shrink-0 items-center text-dim">Try:</span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-2">
            {SENTENCES.map((sentence) => (
              <button
                key={sentence}
                type="button"
                onClick={() => {
                  setFilters(carVocabulary.empty);
                  setTyped(sentence);
                  setRound((n) => n + 1);
                }}
                className="relative inline-flex h-9 cursor-pointer items-center whitespace-nowrap rounded-[10px] px-2 text-dim transition-[color,background-color] duration-200 ease-smooth hover:bg-wash hover:text-text pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1"
              >
                {sentence}
              </button>
            ))}
          </span>
        </div>
      }
    >
      {/* On phones the open list sits in the flow, so it grows the stage instead of covering the copy panel below. */}
      <div className="mx-auto flex w-full max-w-[600px] flex-col pt-2 sm:pt-[clamp(8px,6vh,72px)] max-sm:[&_[data-state=open]:has(>[role=listbox])]:static">
        <SentenceSearch
          key={round}
          vocabulary={carVocabularyFor(locale)}
          items={CARS}
          value={filters}
          onChange={setFilters}
          label="Describe the car you want"
          countLabel={carFormats(locale).carCount}
          locale={locale}
          defaultText={typed ?? ""}
          defaultOpen={typed !== null}
          autoFocus={typed !== null}
        />
        <div className="mt-3 flex items-center justify-between gap-3 ps-4">
          <p className="text-[14px] leading-5 text-dim tabular-nums">
            <TextSwap className="font-medium text-text">{n(matches)}</TextSwap> of {n(CARS.length)} cars
          </p>
          <ResetButton onReset={reset} className="-me-3" />
        </div>
      </div>
    </StagePanel>
  );
}

function ListedStage() {
  const [round, setRound] = useState(0);
  return (
    <StagePanel>
      <ListedDemo key={round} wide reset={<ResetButton onReset={() => setRound((n) => n + 1)} className="-me-3" />} />
    </StagePanel>
  );
}

function BudgetStage() {
  const [round, setRound] = useState(0);
  return (
    <StagePanel>
      <BudgetDemo key={round} reset={<ResetButton onReset={() => setRound((n) => n + 1)} className="-me-3" />} />
    </StagePanel>
  );
}

function PanelStage() {
  const { locale } = useStage();
  const [round, setRound] = useState(0);
  const [shown, setShown] = useState<number | null>(null);
  return (
    <StagePanel
      onReset={() => {
        setRound((n) => n + 1);
        setShown(null);
      }}
    >
      <div className="flex w-full max-w-[400px] flex-col">
        <FilterPanel
          key={round}
          className="h-[min(860px,calc(100dvh-120px))] min-h-[600px]"
          defaultFilters={PANEL_PRESET.filters}
          defaultOpen={PANEL_PRESET.open}
          onShow={(cars) => setShown(cars.length)}
          locale={locale}
        />
        <p aria-live="polite" className="mt-3 h-5 ps-5 text-[14px] leading-5 text-dim tabular-nums">
          {shown !== null && <>{formatsFor(locale).number(shown)} {shown === 1 ? "car" : "cars"} sent to onShow</>}
        </p>
      </div>
    </StagePanel>
  );
}

function ExampleStage({ slug }: { slug: string }) {
  const [round, setRound] = useState(0);
  const props = useStageProps();
  return (
    <StagePanel onReset={() => setRound((n) => n + 1)}>
      {createElement(exampleOf(slug), { key: round, ...props })}
    </StagePanel>
  );
}

export function FilterStage({ slug }: { slug: string }) {
  return (
    <StageControlsProvider slug={slug}>
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
