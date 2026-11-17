// Demo data for the long-labels state of the sentence search, the recent searches and the rules: long names for the
// body styles, fuels, drivetrains and colours of the demo cars. The stages pass them to the real registry components;
// the copy-paste examples never see them.
import type { Term, Vocabulary } from "@/registry/lib/sentence";

/** Long names for the body styles, fuels, drivetrains and colours, by their short name. */
export const LONG_NAMES: Readonly<Record<string, string>> = {
  SUV: "Sport utility vehicle with three rows of seats",
  Sedan: "Four-door sedan with a separate boot",
  Truck: "Pickup truck with a crew cab and a long bed",
  Hatchback: "Five-door hatchback with folding rear seats",
  Coupe: "Two-door coupe",
  Minivan: "Minivan with sliding doors on both sides",
  Van: "Cargo van",
  Convertible: "Convertible with a soft top",
  Gas: "Gasoline, regular or premium",
  Hybrid: "Self-charging hybrid",
  "Plug-in hybrid": "Plug-in hybrid with a long electric range",
  Electric: "Battery electric",
  Diesel: "Diesel and renewable diesel blends",
  AWD: "All-wheel drive with torque vectoring",
  "4WD": "Four-wheel drive with a low range for rough tracks",
  FWD: "Front-wheel drive",
  RWD: "Rear-wheel drive",
  White: "Pearl white with a contrasting black roof",
  Black: "Midnight black metallic",
  Gray: "Graphite gray",
  Silver: "Liquid silver metallic",
  Blue: "Deep ocean blue metallic",
  Red: "Soul red crystal",
  Green: "Forest green",
  Brown: "Bronze brown",
};

const longTerm = <State>(term: Term<State>): Term<State> => {
  const long = LONG_NAMES[term.label];
  return long ? { ...term, label: long, names: [term.label, ...(term.names ?? [])] } : term;
};

const longer = new WeakMap<object, unknown>();

/**
 * The same vocabulary with long names: the suggestions and tokens show them, and the short names still read, so
 * "white awd suv" still gives three tokens. One copy per vocabulary, so its names are worked out once.
 */
export function longVocabulary<Item, State>(vocabulary: Vocabulary<Item, State>): Vocabulary<Item, State> {
  const known = longer.get(vocabulary);
  if (known) return known as Vocabulary<Item, State>;
  const made: Vocabulary<Item, State> = {
    ...vocabulary,
    terms: vocabulary.terms.map(longTerm),
    tokens: (state) => vocabulary.tokens(state).map((token) => ({ ...token, label: LONG_NAMES[token.label] ?? token.label })),
    ...(vocabulary.facets && { facets: vocabulary.facets.map((facet) => ({ ...facet, options: (state: State, items: readonly Item[]) => facet.options(state, items).map(longTerm) })) }),
  };
  longer.set(vocabulary, made);
  return made;
}
