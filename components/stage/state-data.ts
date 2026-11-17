// Demo data for the stage's data states: no options (empty), every count at 0 (zero-results), long names
// (long-labels) and very many options (many-options). The stage passes it to the real registry component; the
// copy-paste examples never see it. Add an entry per facet or item as its states are built (additions only).
import type { ReactNode } from "react";
import type { BodyStyle } from "@/registry/demo/body-icons";
import { CARS, COLOR_PAINTS, type Color } from "@/registry/demo/cars";
import { carFacets, KM_MAX, PRICE_MAX, PRICE_MIN, YEARS, yearBuckets, type CarFilters } from "@/registry/demo/cars-facets";
import { histogram } from "@/registry/lib/facets";
import type { ItemState } from "@/registry/items";
import type { SegmentedValue } from "@/registry/ui/segmented";

/** An option with a count, and children for a list such as makes and models. */
export type Counted = { value: string; label: string; count: number; children?: readonly Counted[] };

/** What one list of options looks like in the data states: long names by value, and the options added for many. */
export type StateData = {
  long?: Readonly<Record<string, string>>;
  /** Long names of children, by "parent\nchild". */
  longChildren?: Readonly<Record<string, string>>;
  many?: readonly Counted[];
};

const zero = (option: Counted): Counted => ({
  ...option,
  count: 0,
  ...(option.children ? { children: option.children.map(zero) } : {}),
});

/**
 * Options as a state shows them: none for empty, every count 0 for zero-results, long names, or many more. Every
 * other state passes them as they are.
 */
export function optionsInState(state: ItemState, options: readonly Counted[], data: StateData = {}): Counted[] {
  switch (state) {
    case "empty":
      return [];
    case "zero-results":
      return options.map(zero);
    case "long-labels":
      return options.map((option) => ({
        ...option,
        label: data.long?.[option.value] ?? option.label,
        ...(option.children
          ? { children: option.children.map((child) => ({ ...child, label: data.longChildren?.[`${option.value}\n${child.value}`] ?? child.label })) }
          : {}),
      }));
    case "many-options":
      return [...options, ...(data.many ?? [])];
    default:
      return [...options];
  }
}

/** Counts that look like a real long tail: a few big ones, many small ones, none at 0. */
const tail = (i: number) => Math.max(1, Math.round(38 / (1 + i * 0.55)) + ((i * 7) % 5));

const listOf = (names: readonly string[]) => names.map((name, i) => ({ value: name, label: name, count: tail(i) }));

export const FUEL_STATES: StateData = {
  long: {
    Gas: "Gasoline, regular or premium",
    Hybrid: "Self-charging hybrid",
    "Plug-in hybrid": "Plug-in hybrid with a long electric range and fast charging on the road",
    Electric: "Battery electric",
    Diesel: "Diesel and renewable diesel blends",
  },
  many: listOf([
    "Mild hybrid",
    "Flex fuel",
    "Ethanol E85",
    "Biodiesel",
    "Renewable diesel",
    "Natural gas",
    "Propane",
    "Hydrogen",
    "Fuel cell hybrid",
    "Range extender",
    "Bi-fuel",
    "Dual fuel",
    "Synthetic fuel",
    "Methanol",
    "Biogas",
    "Liquefied gas",
    "E-fuel",
    "Solar assisted",
    "Series hybrid",
    "Parallel hybrid",
    "Hydrogen combustion",
    "Hybrid diesel",
    "Hybrid flex fuel",
    "Compressed air",
    "Ammonia",
  ]),
};

export const DRIVE_STATES: StateData = {
  long: {
    AWD: "All-wheel drive",
    "4WD": "Four-wheel drive with a low range for rough tracks and deep snow",
    FWD: "Front-wheel drive",
    RWD: "Rear-wheel drive",
  },
  many: listOf([
    "Part-time 4WD",
    "Full-time 4WD",
    "Automatic 4WD",
    "AWD with torque vectoring",
    "Front-biased AWD",
    "Rear-biased AWD",
    "Dual motor",
    "Tri motor",
    "Quad motor",
    "Single motor, front",
    "Single motor, rear",
    "Hub motors",
    "6x6",
    "4x2",
    "Selectable AWD",
    "Locking differentials",
    "Limited slip",
    "On-demand AWD",
  ]),
};

// Makes that are not in the demo cars, each with a model or two, for the long list.
const MORE_MAKES: [string, string[]][] = [
  ["Acura", ["MDX", "Integra"]],
  ["Alfa Romeo", ["Giulia", "Tonale"]],
  ["Aston Martin", ["DB12"]],
  ["Bentley", ["Bentayga"]],
  ["Buick", ["Enclave", "Envista"]],
  ["Cadillac", ["Escalade", "Lyriq"]],
  ["Citroën", ["C5 Aircross"]],
  ["Cupra", ["Born"]],
  ["Dacia", ["Duster"]],
  ["Dodge", ["Durango", "Hornet"]],
  ["Ferrari", ["Roma"]],
  ["Fiat", ["500e"]],
  ["Genesis", ["GV70", "G80"]],
  ["Infiniti", ["QX60"]],
  ["Jaguar", ["F-Pace"]],
  ["Lamborghini", ["Urus"]],
  ["Land Rover", ["Defender", "Range Rover"]],
  ["Lincoln", ["Aviator", "Nautilus"]],
  ["Lotus", ["Emira"]],
  ["Lucid", ["Air"]],
  ["Maserati", ["Grecale"]],
  ["McLaren", ["Artura"]],
  ["Mitsubishi", ["Outlander", "Eclipse Cross"]],
  ["Opel", ["Astra"]],
  ["Peugeot", ["3008", "208"]],
  ["Polestar", ["2", "3"]],
  ["Porsche", ["Macan", "911"]],
  ["Renault", ["Clio", "Megane"]],
  ["Rivian", ["R1S", "R1T"]],
  ["Rolls-Royce", ["Ghost"]],
  ["Seat", ["Leon"]],
  ["Skoda", ["Octavia", "Kodiaq"]],
  ["Smart", ["#1"]],
  ["Suzuki", ["Swift", "Vitara"]],
  ["Vauxhall", ["Corsa"]],
];

export const MAKE_STATES: StateData = {
  long: {
    Toyota: "Toyota, certified pre-owned with the extended warranty",
    Honda: "Honda Motor Company",
    Ford: "Ford Motor Company, Blue Advantage",
    Chevrolet: "Chevrolet",
    Hyundai: "Hyundai Motor Company, certified",
  },
  longChildren: {
    "Toyota\nRAV4": "RAV4 Hybrid XSE Premium with the Technology Package",
    "Toyota\nCorolla": "Corolla Cross Hybrid",
    "Toyota\nCamry": "Camry",
  },
  many: MORE_MAKES.map(([make, models], i) => ({
    value: make,
    label: make,
    count: tail(i + 6),
    children: models.map((model, j) => ({ value: model, label: model, count: Math.max(1, Math.round(tail(i + 6) / (j + 1.6))) })),
  })),
};

/** Price bars for the many-options state: the same cars spread over 64 bars instead of 20. */
export const manyPriceBuckets = (filters: CarFilters) =>
  histogram(carFacets.pool(CARS, filters, "price"), (car) => car.price, { min: PRICE_MIN, max: PRICE_MAX, count: 64 });

/** Buckets as a state shows them: none for empty, every count 0 for zero-results, more bars for many-options. */
export function bucketsInState(state: ItemState, buckets: readonly number[], many?: () => readonly number[]): readonly number[] {
  if (state === "empty") return [];
  if (state === "zero-results") return buckets.map(() => 0);
  if (state === "many-options" && many) return many();
  return buckets;
}

/** Body styles not in the demo cars for the long list, each drawn with the nearest of the eight body icons. */
const MORE_BODIES: [string, BodyStyle][] = [
  ["Crossover", "SUV"],
  ["Compact SUV", "SUV"],
  ["Full-size SUV", "SUV"],
  ["Wagon", "Hatchback"],
  ["Estate", "Hatchback"],
  ["Microcar", "Hatchback"],
  ["Liftback", "Sedan"],
  ["Limousine", "Sedan"],
  ["Fastback", "Coupe"],
  ["Shooting brake", "Coupe"],
  ["Roadster", "Convertible"],
  ["Targa", "Convertible"],
  ["Single cab pickup", "Truck"],
  ["Chassis cab", "Truck"],
  ["Panel van", "Van"],
  ["Camper van", "Van"],
];

export const BODY_STATES: StateData = {
  long: {
    SUV: "Sport utility vehicle",
    Sedan: "Saloon or sedan",
    Truck: "Pickup truck with a crew cab and a long bed",
    Coupe: "Two-door coupe",
    Minivan: "Minivan with sliding doors",
    Van: "Cargo or passenger van",
    Convertible: "Convertible or roadster",
  },
  many: listOf(MORE_BODIES.map(([name]) => name)),
};

/** The icon a body style draws with: its own, or the nearest one for the extra styles of the long list. */
export function bodyIconFor(value: string): BodyStyle {
  return MORE_BODIES.find(([name]) => name === value)?.[1] ?? (value as BodyStyle);
}

// Paints for the colours of the long list, mixed from the eight demo paints so no new colour value is written here.
const mix = (a: Color, b: Color | string, share: number) =>
  `color-mix(in srgb, ${COLOR_PAINTS[a]} ${share}%, ${b in COLOR_PAINTS ? COLOR_PAINTS[b as Color] : b})`;
const PURPLE = mix("Red", "Blue", 50);
const MORE_PAINTS: [string, string][] = [
  ["Navy", mix("Blue", "Black", 60)],
  ["Sky blue", mix("Blue", "White", 45)],
  ["Teal", mix("Blue", "Green", 50)],
  ["Mint", mix("Green", "White", 40)],
  ["Olive", mix("Green", "Brown", 55)],
  ["Forest green", mix("Green", "Black", 60)],
  ["Burgundy", mix("Red", "Black", 60)],
  ["Pink", mix("Red", "White", 35)],
  ["Rust", mix("Red", "Brown", 55)],
  ["Beige", mix("Brown", "White", 30)],
  ["Cream", mix("Brown", "White", 12)],
  ["Bronze", mix("Brown", "Silver", 60)],
  ["Taupe", mix("Brown", "Gray", 50)],
  ["Charcoal", mix("Gray", "Black", 50)],
  ["Graphite", mix("Gray", "Black", 70)],
  ["Pearl", mix("White", "Silver", 85)],
  ["Gunmetal", mix("Gray", "Blue", 60)],
  ["Purple", PURPLE],
  ["Plum", `color-mix(in srgb, ${PURPLE} 65%, ${COLOR_PAINTS.Black})`],
  ["Lavender", `color-mix(in srgb, ${PURPLE} 35%, ${COLOR_PAINTS.White})`],
  ["Sand", mix("Brown", "Silver", 40)],
  ["Tan", mix("Brown", "White", 45)],
];

export const COLOR_STATES: StateData = {
  long: {
    Black: "Midnight black metallic",
    White: "Pearl white tricoat",
    Silver: "Lunar silver metallic",
    Blue: "Deep ocean blue",
    Red: "Soul red crystal metallic",
  },
  many: listOf(MORE_PAINTS.map(([name]) => name)),
};

/** The paint a colour option shows: its own, or the mixed one for the extra colours of the long list. */
export function paintFor(value: string): string {
  return COLOR_PAINTS[value as Color] ?? MORE_PAINTS.find(([name]) => name === value)?.[1] ?? "transparent";
}

/** Long names for the segmented choices, by String(value): seats, new or used, transmission. "Any" keeps its name. */
export const SEGMENT_LONG: Readonly<Record<string, string>> = {
  "6": "Six or more",
  "7": "Seven or more",
  "8": "Eight or more",
  Used: "Used, certified pre-owned",
  New: "New, never registered",
  Automatic: "Automatic, with dual clutch and CVT",
  Manual: "Manual with a clutch pedal",
};

/**
 * Segments as a state shows them: every count 0 for zero-results (Any has none and keeps it), long names for
 * long-labels. Every other state passes them as they are.
 */
export function segmentsInState<O extends { value: SegmentedValue; label: ReactNode; count?: number }>(
  state: ItemState,
  options: readonly O[],
  long: Readonly<Record<string, string>> = SEGMENT_LONG,
): O[] {
  if (state === "zero-results") return options.map((option) => (option.count === undefined ? option : { ...option, count: 0 }));
  if (state === "long-labels") return options.map((option) => ({ ...option, label: long[String(option.value)] ?? option.label }));
  return [...options];
}

/** Model years for the many-options state: forty, the oldest first, ending with the demo's own ten. */
export const MANY_YEARS = Array.from({ length: 40 }, (_, i) => YEARS[YEARS.length - 1] - 39 + i);

/** Cars per year for MANY_YEARS: the demo's own counts for its ten years, and a thin tail growing towards them before. */
export const manyYearBuckets = (filters: CarFilters) => {
  const own = yearBuckets(filters);
  const older = MANY_YEARS.length - YEARS.length;
  return MANY_YEARS.map((year, i) => (i < older ? 1 + Math.round((i / (older - 1)) ** 1.5 * 16) : own[YEARS.indexOf(year)]));
};

/** Kilometre bars for the many-options state: the same cars spread over 60 bars instead of 15. */
export const manyKmBuckets = (filters: CarFilters) =>
  histogram(carFacets.pool(CARS, filters, "km"), (car) => car.km, { min: 0, max: KM_MAX, count: 60 });
