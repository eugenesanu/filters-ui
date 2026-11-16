import type { Metadata } from "next";
import { CarsBoard } from "@/registry/blocks/cars-board";
import { EMPTY_CAR_FILTERS, type CarFacet, type CarFilters } from "@/registry/demo/cars-facets";

export const metadata: Metadata = {
  title: "Lab: cards",
  robots: { index: false, follow: false },
};

const STATES: Record<string, { filters: CarFilters; open: CarFacet[] }> = {
  shot: {
    filters: { ...EMPTY_CAR_FILTERS, priceMax: 45000, bodies: ["SUV"], colors: ["White", "Gray"], seatsMin: 7 },
    open: ["seats", "body", "color"],
  },
  empty: { filters: EMPTY_CAR_FILTERS, open: [] },
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// ?state=shot|empty picks the stills' state; ?zoom=1.45 frames the board like the 1440x1080 shot.
export default async function LabCardsPage({ searchParams }: PageProps<"/lab/cards">) {
  const query = await searchParams;
  const state = STATES[first(query.state) ?? "shot"] ?? STATES.shot;
  const zoom = Number(first(query.zoom));
  const framed = zoom > 0 && zoom <= 4;

  return (
    <main
      className={
        framed
          ? "min-h-dvh bg-page px-8 pt-[72.4px] pb-16"
          : "min-h-dvh bg-page px-4 pt-14 pb-32 sm:px-8 sm:pt-24 sm:pb-24"
      }
      // A transform keeps the layout exact; CSS zoom rounds every box to whole device pixels.
      style={framed ? { width: `${100 / zoom}vw`, transform: `scale(${zoom})`, transformOrigin: "0 0" } : undefined}
    >
      <CarsBoard
        key={first(query.state)}
        className="mx-auto max-w-[929px]"
        defaultFilters={state.filters}
        defaultOpen={state.open}
        headingLevel={1}
      />
    </main>
  );
}
