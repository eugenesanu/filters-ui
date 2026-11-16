"use client";

import { createElement, useEffect, useRef, useState, type ReactNode } from "react";
import { CARS } from "@/registry/demo/cars";
import { CAR_FACET_TITLES, clearFacet, matchingCars, summaryOf, type CarFacet, type CarFilters } from "@/registry/demo/cars-facets";
import { CarsBoard } from "@/registry/blocks/cars-board";
import { FilterCard } from "@/registry/ui/filter-card";
import { TextSwap } from "@/registry/ui/text-swap";
import { BODY_FIT, CarFilterBody } from "@/components/stage/car-filter";
import { exampleOf } from "@/components/stage/example-of";
import { presetFilters } from "@/components/tile/presets";

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

const count = new Intl.NumberFormat("en-US");

const RESET =
  "h-9 shrink-0 cursor-pointer rounded-[10px] px-3 text-[14px] font-medium leading-5 text-dim transition-[color,background-color] duration-200 ease-smooth hover:bg-white/[0.06] hover:text-text";

function ResetButton({ onReset, className }: { onReset: () => void; className?: string }) {
  return (
    <button type="button" onClick={onReset} className={className ? `${RESET} ${className}` : RESET}>
      Reset
    </button>
  );
}

function StagePanel({ onReset, toolbar, children, wide = false }: { onReset?: () => void; toolbar?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <section aria-label="Try it" className="relative flex h-full min-h-[360px] flex-col rounded-[24px] border border-card bg-panel">
      <div className="flex min-h-12 items-center justify-between gap-3 px-3 pt-3">
        {toolbar ?? <span />}
        {onReset && <ResetButton onReset={onReset} />}
      </div>
      <div className={wide ? "flex-1 px-4 pb-10 pt-2 sm:px-8" : "flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-2 sm:pb-14"}>
        {children}
      </div>
    </section>
  );
}

function ExampleSwitch({ facets, value, onChange }: { facets: CarFacet[]; value: CarFacet; onChange: (facet: CarFacet) => void }) {
  return (
    <div role="group" aria-label="Example" className="flex min-w-0 flex-wrap items-center gap-x-1 pl-2 text-[14px] leading-5">
      <span className="mr-1 text-dim">Example:</span>
      {facets.map((f) => (
        <button
          key={f}
          type="button"
          aria-pressed={f === value}
          onClick={() => onChange(f)}
          className={`inline-flex h-9 cursor-pointer items-center rounded-[10px] px-2 transition-[color,background-color] duration-200 ease-smooth ${
            f === value ? "text-text" : "text-dim hover:bg-white/[0.06] hover:text-text"
          }`}
        >
          {CAR_FACET_TITLES[f]}
        </button>
      ))}
    </div>
  );
}

function CarFilterStage({ slug, facets }: { slug: string; facets: CarFacet[] }) {
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
          summary={summaryOf(filters, facet)}
          onClear={() => setFilters((f) => clearFacet(f, facet))}
          open={open}
          onOpenChange={setOpen}
          headingLevel={2}
          bodyClassName={BODY_FIT[facet]}
        >
          <CarFilterBody facet={facet} filters={filters} set={set} />
        </FilterCard>
        <div className="mt-3 flex items-center justify-between gap-3 pl-4">
          <p aria-live="polite" className="text-[14px] leading-5 text-dim tabular-nums">
            <TextSwap className="font-medium text-text">{count.format(matches)}</TextSwap> of {count.format(CARS.length)} cars
          </p>
          <ResetButton onReset={reset} className="-mr-3" />
        </div>
      </div>
    </StagePanel>
  );
}

function BoardStage() {
  const [round, setRound] = useState(0);
  const [away, setAway] = useState(false);
  const frame = useRef<HTMLDivElement>(null);

  // The board pins its Show bar to the window once its head scrolls away; past the stage it would float over the page.
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setAway(!entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const [shown, setShown] = useState<number | null>(null);
  return (
    <div ref={frame} data-away={away || undefined} className="h-full data-[away]:[&_[data-state].fixed]:hidden">
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
      />
      <p aria-live="polite" className="mx-auto mt-6 h-5 max-w-[929px] text-[14px] leading-5 text-dim">
        {shown !== null && <>{count.format(shown)} {shown === 1 ? "car" : "cars"} sent to onShow</>}
      </p>
    </StagePanel>
    </div>
  );
}

function ExampleStage({ slug }: { slug: string }) {
  const [round, setRound] = useState(0);
  return (
    <StagePanel onReset={() => setRound((n) => n + 1)}>
      {createElement(exampleOf(slug), { key: round })}
    </StagePanel>
  );
}

export function FilterStage({ slug }: { slug: string }) {
  if (slug === "cars-board") return <BoardStage />;
  const facets = STAGE_FACETS[slug];
  return facets ? <CarFilterStage slug={slug} facets={facets} /> : <ExampleStage slug={slug} />;
}
