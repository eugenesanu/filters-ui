// Demo data for the stage's data states: no options (empty), every count at 0 (zero-results), long names
// (long-labels) and very many options (many-options). The stage passes it to the real registry component; the
// copy-paste examples never see it. Add an entry per facet or item as its states are built (additions only).
import { CARS } from "@/registry/demo/cars";
import { carFacets, PRICE_MAX, PRICE_MIN, type CarFilters } from "@/registry/demo/cars-facets";
import { histogram } from "@/registry/lib/facets";
import type { ItemState } from "@/registry/items";

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

/** Applied filters' many-options state: one chip per make, body style, fuel, drive and colour, over twenty in all. */
export const APPLIED_MANY_FILTERS: CarFilters = {
  condition: "Used",
  priceMin: 10000,
  priceMax: 60000,
  makes: ["Toyota", "Honda", "Ford", "Hyundai", "Kia"].map((make) => ({ make, models: [] })),
  bodies: ["SUV", "Sedan", "Hatchback"],
  yearMin: 2017,
  yearMax: null,
  kmMax: 120000,
  fuels: ["Gas", "Hybrid", "Electric"],
  drives: ["AWD", "FWD"],
  transmission: "Automatic",
  colors: ["White", "Black", "Silver", "Blue"],
  seatsMin: null,
  listedMin: null,
  listedMax: null,
};

/** Applied filters' long-labels state: words added to each chip's value, by facet, so the numbers still follow the locale. */
export const APPLIED_LONG_TAILS: Readonly<Record<string, string>> = {
  price: ", before taxes, dealer fees and delivery to your door",
  year: ", with one owner and a full service history on record",
  body: ", crossover or wagon with a raised ride height",
  fuel: " or plug-in hybrid with a long electric range on a full charge",
};

/** No results' long-labels state: each filter's name in more words, and words added to every value it takes. */
export const NO_RESULTS_LONG: { names: Readonly<Record<string, string>>; tails: Readonly<Record<string, string>> } = {
  names: {
    price: "Price before taxes, fees and delivery",
    fuel: "Fuel or power source",
    seats: "Seats, third row included",
    body: "Body style and shape",
    color: "Exterior paint colour",
    drive: "Drivetrain and driven wheels",
  },
  tails: {
    price: ", delivered to your door",
    fuel: " as listed by the seller",
    seats: " with room left for luggage",
    body: " with a raised ride height",
    color: " metallic or matte finish",
    drive: " with a locking differential",
  },
};
