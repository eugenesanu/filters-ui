// Finds the smallest changes to a set of filters that bring results back, for a "no results" state.
//
// A relax map says how each filter can be loosened: its name, its value in words, and looser values, nearest first.
// A list filter (fuel, colour) usually has one step, Any; a limit has one step per notch out, then Any.
// Fixes change one filter where that is enough, and two where no single change finds anything.

export type RelaxStep<State> = {
  /** The looser value in words, e.g. "Under $25k" or "Any". */
  value: string;
  /** The filters with this one loosened. Change only this filter, so two steps can be applied one after the other. */
  apply: (state: State) => State;
};

export type RelaxFacet<State> = {
  /** The filter's name, e.g. "Price". */
  label: string;
  /** The value in words, e.g. "Under $20k", or null while the filter is not set. */
  value: (state: State) => string | null;
  /** Looser values, nearest first. */
  steps: (state: State) => readonly RelaxStep<State>[];
};

export type RelaxMap<State> = Record<string, RelaxFacet<State>>;

export type FixChange = {
  key: string;
  label: string;
  from: string;
  to: string;
  /** True when the change leaves the filter unset, rather than looser. */
  removed: boolean;
};

export type Fix<State> = {
  /** Stable while the same changes are offered. */
  id: string;
  changes: FixChange[];
  /** The filters with the changes made. */
  state: State;
  /** How many items they find. */
  count: number;
};

/**
 * Steps for a filter that holds one value or a limit: each looser value in `looser` (nearest first), then Any.
 * No steps while `current` is null.
 */
export function loosen<State, V>(
  current: V | null,
  looser: readonly V[],
  set: (state: State, value: V | null) => State,
  format: (value: V) => string = String,
  any = "Any",
): RelaxStep<State>[] {
  if (current === null) return [];
  return [
    ...looser.map((value) => ({ value: format(value), apply: (state: State) => set(state, value) })),
    { value: any, apply: (state: State) => set(state, null) },
  ];
}

type Facet<State> = { key: string; label: string; from: string; steps: readonly RelaxStep<State>[] };

/**
 * Up to `limit` fixes for filters that find nothing. Each set filter is loosened by its nearest step that finds
 * something; where none does, it is paired with another such filter, nearest steps first. Fixes that change one
 * filter come first, then the ones that find most.
 */
export function findFixes<Item, State>({
  items,
  value,
  matches,
  relax,
  limit = 3,
}: {
  items: readonly Item[];
  value: State;
  matches: (item: Item, state: State) => boolean;
  relax: RelaxMap<State>;
  limit?: number;
}): Fix<State>[] {
  const count = (state: State) => {
    let n = 0;
    for (const item of items) if (matches(item, state)) n++;
    return n;
  };

  const facets: Facet<State>[] = [];
  for (const [key, facet] of Object.entries(relax)) {
    const from = facet.value(value);
    const steps = from === null ? [] : facet.steps(value);
    if (from !== null && steps.length) facets.push({ key, label: facet.label, from, steps });
  }

  const fixOf = (picks: [Facet<State>, number][], state: State, n: number): Fix<State> => {
    const changes = picks.map(([facet, i]) => ({
      key: facet.key,
      label: facet.label,
      from: facet.from,
      to: facet.steps[i].value,
      removed: relax[facet.key].value(state) === null,
    }));
    return { id: changes.map((c) => `${c.key}:${c.to}`).join("|"), changes, state, count: n };
  };

  const fixes: Fix<State>[] = [];
  const stuck: Facet<State>[] = [];
  for (const facet of facets) {
    let found = false;
    for (let i = 0; i < facet.steps.length && !found; i++) {
      const state = facet.steps[i].apply(value);
      const n = count(state);
      if (n > 0) {
        fixes.push(fixOf([[facet, i]], state, n));
        found = true;
      }
    }
    if (!found) stuck.push(facet);
  }

  // Pairs, only of filters that no single change frees: the nearest pair of steps wins, the larger count breaks a tie.
  if (fixes.length < limit) {
    for (let a = 0; a < stuck.length; a++) {
      for (let b = a + 1; b < stuck.length; b++) {
        const [one, two] = [stuck[a], stuck[b]];
        let best: Fix<State> | null = null;
        for (let cost = 0; cost <= one.steps.length + two.steps.length - 2 && !best; cost++) {
          for (let i = Math.max(0, cost - two.steps.length + 1); i <= Math.min(cost, one.steps.length - 1); i++) {
            const state = two.steps[cost - i].apply(one.steps[i].apply(value));
            const n = count(state);
            if (n > 0 && (!best || n > best.count)) best = fixOf([[one, i], [two, cost - i]], state, n);
          }
        }
        if (best) fixes.push(best);
      }
    }
  }

  return fixes.sort((x, y) => x.changes.length - y.changes.length || y.count - x.count).slice(0, limit);
}
