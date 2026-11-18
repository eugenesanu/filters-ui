"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { CarFilterBody } from "@/components/stage/car-filter";
import type { StageStatus } from "@/components/stage/stage-controls";
import { StageCount } from "@/components/stage/stage-count";
import { presetFilters } from "@/components/tile/presets";
import { CARS } from "@/registry/demo/cars";
import { CAR_FACET_TITLES, clearFacet, matchingCars, summaryOf, type CarFacet, type CarFilters } from "@/registry/demo/cars-facets";
import { FilterCard } from "@/registry/ui/filter-card";

const READY: StageStatus = { state: "ready", status: "ready", disabled: false, onRetry: () => {} };

// The home tiles' hover glow, held on, as on the bento boards.
const GLOW =
  "pointer-events-none absolute inset-[-100%] -z-20 bg-[conic-gradient(var(--fu-glow-blue),var(--fu-glow-violet),var(--fu-glow-rose),var(--fu-glow-amber),var(--fu-glow-teal),var(--fu-glow-blue))] opacity-[0.4]";

/**
 * The canvas and its one tile: the site's panel surface with the glow ring, the live filter in the middle.
 * The filter is drawn at its real size and the recorder magnifies the whole page `zoom` times instead (CSS zoom
 * would put the pointer a few pixels off a dragged handle), so the tile's own measures are divided by it here.
 */
function Board({ glow = 250, zoom = 2.5, width = 320, children }: { glow?: number; zoom?: number; width?: number; children: ReactNode }) {
  const u = (px: number) => px / zoom;
  return (
    <div id="shot" className="bg-page" style={{ width: u(1600), height: u(1200), padding: u(44) }}>
      <div
        className="relative isolate flex h-full items-center justify-center overflow-hidden border-solid border-card bg-panel"
        style={{ borderRadius: u(28), borderWidth: u(1) }}
      >
        <span aria-hidden className={GLOW} style={{ rotate: `${glow}deg` }} />
        <span aria-hidden className="pointer-events-none absolute -z-10 rounded-[inherit] bg-panel" style={{ inset: u(3), filter: `blur(${u(14)}px)` }} />
        <div className="shrink-0" style={{ width }}>
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

const SCENES: Record<string, ComponentType> = {
  price: () => <CarFilterScene slug="range-histogram" facet="price" glow={30} />,
};

/** The scene a name picks; an unknown name draws nothing. */
export function Scene({ name }: { name: string }) {
  const Picked = SCENES[name];
  return Picked ? <Picked /> : null;
}
