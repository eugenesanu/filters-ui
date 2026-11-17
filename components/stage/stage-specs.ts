// What each item's stage offers, one entry per item (registry:check fails on a missing one). The Direction control
// shows on every stage; the others show when the item's spec asks for them, and the stage hands their values on.

export type StageSpec = {
  /**
   * The item prints numbers, prices, distances or dates and takes `locale`. The stage then shows the Locale control and
   * passes `locale` to the example's default export (and to the components a custom stage draws).
   */
  locale: boolean;
};

export const STAGE_SPECS: Record<string, StageSpec> = {
  "icon-tiles": { locale: true },
  "color-swatches": { locale: true },
  "searchable-list": { locale: true },
  "sentence-search": { locale: true },
  "range-histogram": { locale: true },
  "chip-group": { locale: true },
  "range-select": { locale: true },
  "upper-limit": { locale: true },
  "segmented-choice": { locale: true },
  "cars-board": { locale: true },
  "filter-pills": { locale: true },
  "all-filters": { locale: true },
  "cascading-dropdown": { locale: true },
  "bar-list": { locale: true },
  "date-range": { locale: true },
  budget: { locale: true },
  "no-results": { locale: true },
  "applied-filters": { locale: true },
  "recent-searches": { locale: true },
  rules: { locale: true },
  "filter-panel": { locale: true },
  dropdown: { locale: true },
  select: { locale: true },
  buttons: { locale: false },
};

export const specOf = (slug: string): StageSpec => STAGE_SPECS[slug] ?? { locale: false };
