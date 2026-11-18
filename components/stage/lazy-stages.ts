"use client";

import dynamic from "next/dynamic";
import { createElement, useState, type ComponentType } from "react";

// Every stage is its own script, so an item page loads only its own; next/dynamic draws it on the server and preloads its
// script with the page. Without a loading option a stage has no Suspense boundary of its own, so a navigation waits for
// its script instead of showing an empty stage.

const loads: (() => Promise<unknown>)[] = [];

/**
 * A stage drawn through next/dynamic until warmStages has loaded it, then drawn directly, so a navigation to a page
 * that shows it does not stop to resolve a lazy component. Each instance keeps the way it was first drawn, so a stage on
 * screen never remounts when the warm-up ends. next/dynamic needs a literal import in its call, so each stage names its
 * path twice; scripts/check-registry.mjs fails when the two differ.
 */
function stage<P extends object>(Lazy: ComponentType<P>, load: () => Promise<ComponentType<P>>): ComponentType<P> {
  let Loaded: ComponentType<P> | null = null;
  loads.push(() =>
    load().then((component) => {
      Loaded = component;
    }),
  );
  return function Part(props: P) {
    const [Drawn] = useState(() => Loaded ?? Lazy);
    return createElement(Drawn, props);
  };
}

export const BoardStage = stage(
  dynamic(() => import("@/components/stage/board-stage").then((m) => m.BoardStage)),
  () => import("@/components/stage/board-stage").then((m) => m.BoardStage),
);
export const SentenceStage = stage(
  dynamic(() => import("@/components/stage/sentence-stage").then((m) => m.SentenceStage)),
  () => import("@/components/stage/sentence-stage").then((m) => m.SentenceStage),
);
export const FilterPillsStage = stage(
  dynamic(() => import("@/components/stage/filter-pills-stage").then((m) => m.FilterPillsStage)),
  () => import("@/components/stage/filter-pills-stage").then((m) => m.FilterPillsStage),
);
export const AllFiltersStage = stage(
  dynamic(() => import("@/components/stage/all-filters-stage").then((m) => m.AllFiltersStage)),
  () => import("@/components/stage/all-filters-stage").then((m) => m.AllFiltersStage),
);
export const ListedStage = stage(
  dynamic(() => import("@/components/stage/listed-demo").then((m) => m.ListedStage)),
  () => import("@/components/stage/listed-demo").then((m) => m.ListedStage),
);
export const BudgetStage = stage(
  dynamic(() => import("@/components/stage/budget-demo").then((m) => m.BudgetStage)),
  () => import("@/components/stage/budget-demo").then((m) => m.BudgetStage),
);
export const NoResultsStage = stage(
  dynamic(() => import("@/components/stage/results-stages").then((m) => m.NoResultsStage)),
  () => import("@/components/stage/results-stages").then((m) => m.NoResultsStage),
);
export const AppliedFiltersStage = stage(
  dynamic(() => import("@/components/stage/results-stages").then((m) => m.AppliedFiltersStage)),
  () => import("@/components/stage/results-stages").then((m) => m.AppliedFiltersStage),
);
export const RecentSearchesStage = stage(
  dynamic(() => import("@/components/stage/recent-searches-stage").then((m) => m.RecentSearchesStage)),
  () => import("@/components/stage/recent-searches-stage").then((m) => m.RecentSearchesStage),
);
export const RulesStage = stage(
  dynamic(() => import("@/components/stage/rules-stage").then((m) => m.RulesStage)),
  () => import("@/components/stage/rules-stage").then((m) => m.RulesStage),
);
export const PanelStage = stage(
  dynamic(() => import("@/components/stage/panel-stage").then((m) => m.PanelStage)),
  () => import("@/components/stage/panel-stage").then((m) => m.PanelStage),
);
export const CarFilterStage = stage(
  dynamic(() => import("@/components/stage/car-filter-stage").then((m) => m.CarFilterStage)),
  () => import("@/components/stage/car-filter-stage").then((m) => m.CarFilterStage),
);
export const ExampleStage = stage(
  dynamic(() => import("@/components/stage/example-stage").then((m) => m.ExampleStage)),
  () => import("@/components/stage/example-stage").then((m) => m.ExampleStage),
);

let asked = false;
let warmed = false;

/**
 * Fetches every stage once the page has loaded, as the link prefetch did when the stages were part of the page, so a tap
 * on a tile or the pager waits for no script. A press before then starts it at once, so the target's scripts load beside
 * its page data instead of after it.
 */
export function warmStages() {
  if (asked) return;
  asked = true;
  const warm = () => {
    if (warmed) return;
    warmed = true;
    loads.forEach((load) => load().catch(() => {}));
  };
  addEventListener("pointerdown", warm, { once: true, capture: true });
  if (document.readyState === "complete") warm();
  else addEventListener("load", warm, { once: true });
}
