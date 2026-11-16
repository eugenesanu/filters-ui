// Faceted counting for filter UIs.
//
// Each facet has a test that says whether an item passes that facet's current choice
// (and passes when the facet is unset). An option's count is taken with its own facet
// left out, so it tells how many items picking that option would show.

export type FacetTest<Item, State> = (item: Item, state: State) => boolean;
export type FacetTests<Item, State, Key extends string = string> = Record<Key, FacetTest<Item, State>>;

export type Facets<Item, State, Key extends string> = {
  /** Does the item pass every facet, optionally leaving one out? */
  matches: (item: Item, state: State, skip?: Key) => boolean;
  /** Items that pass every facet. */
  filter: (items: readonly Item[], state: State) => Item[];
  /** Items that pass every facet except `facet`: the pool its own options are counted in. */
  pool: (items: readonly Item[], state: State, facet: Key) => Item[];
  /**
   * Count per option value for `facet`, with that facet's own choice left out.
   * `valueOf` may return one value, several, or null (the item has none and is not counted).
   */
  countBy: <Value>(
    items: readonly Item[],
    state: State,
    facet: Key,
    valueOf: (item: Item) => Value | readonly Value[] | null | undefined,
  ) => Map<Value, number>;
  /** How many items in the facet's pool satisfy `predicate`, e.g. "seats at least 7". */
  countIf: (items: readonly Item[], state: State, facet: Key, predicate: (item: Item) => boolean) => number;
};

export function createFacets<Item, State, Key extends string>(
  tests: FacetTests<Item, State, Key>,
): Facets<Item, State, Key> {
  const keys = Object.keys(tests) as Key[];

  const matches = (item: Item, state: State, skip?: Key) =>
    keys.every((key) => key === skip || tests[key](item, state));

  const pool = (items: readonly Item[], state: State, facet: Key) =>
    items.filter((item) => matches(item, state, facet));

  function countBy<Value>(
    items: readonly Item[],
    state: State,
    facet: Key,
    valueOf: (item: Item) => Value | readonly Value[] | null | undefined,
  ) {
    const counts = new Map<Value, number>();
    for (const item of items) {
      if (!matches(item, state, facet)) continue;
      const value = valueOf(item);
      if (value === null || value === undefined) continue;
      const list = (Array.isArray(value) ? value : [value]) as Value[];
      for (const v of new Set(list)) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return counts;
  }

  return {
    matches,
    pool,
    countBy,
    filter: (items, state) => items.filter((item) => matches(item, state)),
    countIf: (items, state, facet, predicate) => {
      let n = 0;
      for (const item of items) if (matches(item, state, facet) && predicate(item)) n++;
      return n;
    },
  };
}

/**
 * Counts items into `count` equal buckets over [min, max], e.g. the bars of a range chart.
 * A value past either end lands in the end bucket; null is not counted.
 */
export function histogram<Item>(
  items: readonly Item[],
  valueOf: (item: Item) => number | null | undefined,
  { min, max, count }: { min: number; max: number; count: number },
): number[] {
  const buckets = Array.from({ length: count }, () => 0);
  const size = (max - min) / count;
  for (const item of items) {
    const value = valueOf(item);
    if (value === null || value === undefined || Number.isNaN(value)) continue;
    buckets[Math.max(0, Math.min(count - 1, Math.floor((value - min) / size)))] += 1;
  }
  return buckets;
}
