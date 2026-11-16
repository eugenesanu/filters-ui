"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// A tile with no car preset shows its own example. next/dynamic needs literal paths at module top level,
// so every example is listed here; scripts/check-registry.mjs fails when an item's example is missing.
const EXAMPLES: Record<string, ComponentType> = {
  "sentence-search": dynamic(() => import("@/registry/examples/sentence-search")),
  "range-histogram": dynamic(() => import("@/registry/examples/range-histogram")),
  "range-select": dynamic(() => import("@/registry/examples/range-select")),
  "upper-limit": dynamic(() => import("@/registry/examples/upper-limit")),
  "segmented-choice": dynamic(() => import("@/registry/examples/segmented-choice")),
  "chip-group": dynamic(() => import("@/registry/examples/chip-group")),
  "icon-tiles": dynamic(() => import("@/registry/examples/icon-tiles")),
  "color-swatches": dynamic(() => import("@/registry/examples/color-swatches")),
  "searchable-list": dynamic(() => import("@/registry/examples/searchable-list")),
  dropdown: dynamic(() => import("@/registry/examples/dropdown")),
  select: dynamic(() => import("@/registry/examples/select")),
  buttons: dynamic(() => import("@/registry/examples/buttons")),
  "cars-board": dynamic(() => import("@/registry/examples/cars-board")),
  "filter-pills": dynamic(() => import("@/registry/examples/filter-pills")),
  "all-filters": dynamic(() => import("@/registry/examples/all-filters")),
  "cascading-dropdown": dynamic(() => import("@/registry/examples/cascading-dropdown")),
  "bar-list": dynamic(() => import("@/registry/examples/bar-list")),
  "date-range": dynamic(() => import("@/registry/examples/date-range")),
  budget: dynamic(() => import("@/registry/examples/budget")),
  "no-results": dynamic(() => import("@/registry/examples/no-results")),
  "applied-filters": dynamic(() => import("@/registry/examples/applied-filters")),
  "recent-searches": dynamic(() => import("@/registry/examples/recent-searches")),
  rules: dynamic(() => import("@/registry/examples/rules")),
  "filter-panel": dynamic(() => import("@/registry/examples/filter-panel")),
};

const Missing = () => null;

export function exampleOf(slug: string): ComponentType {
  return EXAMPLES[slug] ?? Missing;
}
