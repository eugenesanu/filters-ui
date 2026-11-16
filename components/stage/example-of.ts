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
  "cars-board": dynamic(() => import("@/registry/examples/cars-board")),
};

const Missing = () => null;

export function exampleOf(slug: string): ComponentType {
  return EXAMPLES[slug] ?? Missing;
}
