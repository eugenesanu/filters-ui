"use client";

import { useState } from "react";
import { CARS } from "@/registry/demo/cars";
import { CAR_FACET_TITLES, clearFacet, matchingCars, summaryOf, type CarFacet, type CarFilters } from "@/registry/demo/cars-facets";
import { FilterCard } from "@/registry/ui/filter-card";
import { CarFilterBody } from "@/components/stage/car-filter";
import { presetFilters } from "@/components/tile/presets";
import { useStage, useStageStatus } from "@/components/stage/stage-controls";
import { StageCount } from "@/components/stage/stage-count";
import { ResetButton, StagePanel } from "@/components/stage/stage-panel";

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

export function CarFilterStage({ slug, facets }: { slug: string; facets: CarFacet[] }) {
  const { locale } = useStage();
  const stage = useStageStatus();
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
          // A disabled filter cannot be changed, so its card offers no Clear.
          onClear={stage.disabled ? undefined : () => setFilters((f) => clearFacet(f, facet))}
          open={open}
          onOpenChange={setOpen}
          headingLevel={2}
        >
          <CarFilterBody facet={facet} filters={filters} set={set} locale={locale} stage={stage} />
        </FilterCard>
        <div className="mt-3 flex items-center justify-between gap-3 ps-4">
          <StageCount matches={matches} total={CARS.length} stage={stage} />
          <ResetButton onReset={reset} className="-me-3" />
        </div>
      </div>
    </StagePanel>
  );
}
