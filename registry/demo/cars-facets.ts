import { createFacets, histogram } from "../lib/facets";
import { CARS, THIS_YEAR, TRANSMISSIONS, type Body, type Car, type Color, type Condition, type Drive, type Fuel, type Transmission } from "./cars";

/** A ticked make and the models that narrow it; no models means every model of that make. */
export type MakePick = { make: string; models: string[] };

export type CarFilters = {
  condition: Condition | null;
  priceMin: number | null;
  priceMax: number | null;
  makes: MakePick[];
  bodies: Body[];
  yearMin: number | null;
  yearMax: number | null;
  kmMax: number | null;
  fuels: Fuel[];
  drives: Drive[];
  transmission: Transmission | null;
  colors: Color[];
  seatsMin: number | null;
};

export const EMPTY_CAR_FILTERS: CarFilters = {
  condition: null,
  priceMin: null,
  priceMax: null,
  makes: [],
  bodies: [],
  yearMin: null,
  yearMax: null,
  kmMax: null,
  fuels: [],
  drives: [],
  transmission: null,
  colors: [],
  seatsMin: null,
};

export type CarFacet =
  | "condition"
  | "price"
  | "make"
  | "body"
  | "year"
  | "km"
  | "fuel"
  | "drive"
  | "transmission"
  | "color"
  | "seats";

export const PRICE_MIN = 0;
export const PRICE_MAX = 100000;
export const PRICE_STEP = 2500;
/** The price chart: 20 bars of $5,000 from $0 to $100k; a dearer car counts in the last bar. */
export const PRICE_BARS = 20;
/** The kilometres scale: a limit at KM_MAX is no limit. */
export const KM_MAX = 150000;
export const KM_STEP = 5000;
/** The kilometres chart: 15 bars of 10,000 km; a car past 150,000 km counts in the last bar. */
export const KM_BARS = 15;
/** Model years on offer, oldest first: one bar and one picker choice each. */
export const YEARS = Array.from({ length: 10 }, (_, i) => THIS_YEAR - 9 + i);
export const SEAT_MINIMUMS = [6, 7, 8];

// A car missing the detail fails a facet that is set, and passes one that is not.
const known = <T,>(value: T | null, test: (value: T) => boolean) => value !== null && test(value);

export const carFacets = createFacets<Car, CarFilters, CarFacet>({
  condition: (car, f) => !f.condition || car.condition === f.condition,
  price: (car, f) => (f.priceMin === null || car.price >= f.priceMin) && (f.priceMax === null || car.price <= f.priceMax),
  make: (car, f) => !f.makes.length || f.makes.some((p) => p.make === car.make && (!p.models.length || p.models.includes(car.model))),
  body: (car, f) => !f.bodies.length || f.bodies.includes(car.body),
  year: (car, f) => (f.yearMin === null || car.year >= f.yearMin) && (f.yearMax === null || car.year <= f.yearMax),
  km: (car, f) => f.kmMax === null || known(car.km, (km) => km <= f.kmMax!),
  fuel: (car, f) => !f.fuels.length || known(car.fuel, (fuel) => f.fuels.includes(fuel)),
  drive: (car, f) => !f.drives.length || known(car.drive, (drive) => f.drives.includes(drive)),
  transmission: (car, f) => !f.transmission || car.transmission === f.transmission,
  color: (car, f) => !f.colors.length || known(car.color, (color) => f.colors.includes(color)),
  seats: (car, f) => f.seatsMin === null || known(car.seats, (seats) => seats >= f.seatsMin!),
});

/** Cars per price bar among those matching every other filter, so the bars show what moving the price could reach. */
export const priceBuckets = (f: CarFilters, cars: readonly Car[] = CARS) =>
  histogram(carFacets.pool(cars, f, "price"), (car) => car.price, { min: PRICE_MIN, max: PRICE_MAX, count: PRICE_BARS });

/** Cars per model year (in YEARS order) among those matching every other filter. */
export const yearBuckets = (f: CarFilters, cars: readonly Car[] = CARS) => {
  const counts = carFacets.countBy(cars, f, "year", (car) => car.year);
  return YEARS.map((year) => counts.get(year) ?? 0);
};

/** Cars per kilometres bar among those matching every other filter. A car with no kilometres on record has no bar. */
export const kmBuckets = (f: CarFilters, cars: readonly Car[] = CARS) =>
  histogram(carFacets.pool(cars, f, "km"), (car) => car.km, { min: 0, max: KM_MAX, count: KM_BARS });

/** Seat options: Any, then "at least" each minimum, counted with the seats choice left out. */
export const seatOptions = (f: CarFilters, cars: readonly Car[] = CARS) => [
  { value: null, label: "Any" },
  ...SEAT_MINIMUMS.map((min) => ({
    value: min,
    label: `${min}+`,
    count: carFacets.countIf(cars, f, "seats", (car) => car.seats !== null && car.seats >= min),
  })),
];

/** New or used: Any, then Used and New, counted with the condition choice left out. */
export const conditionOptions = (f: CarFilters, cars: readonly Car[] = CARS) => {
  const counts = carFacets.countBy(cars, f, "condition", (car) => car.condition);
  return [
    { value: null, label: "Any" },
    ...(["Used", "New"] as const).map((c) => ({ value: c, label: c, count: counts.get(c) ?? 0 })),
  ];
};

/** Transmission: Any, then each gearbox, counted with the transmission choice left out. */
export const transmissionOptions = (f: CarFilters, cars: readonly Car[] = CARS) => {
  const counts = carFacets.countBy(cars, f, "transmission", (car) => car.transmission);
  return [{ value: null, label: "Any" }, ...TRANSMISSIONS.map((t) => ({ value: t, label: t, count: counts.get(t) ?? 0 }))];
};

/** Cars per fuel, with the fuel choice left out. A car with no fuel on record is not counted. */
export const fuelCounts = (f: CarFilters, cars: readonly Car[] = CARS) => carFacets.countBy(cars, f, "fuel", (car) => car.fuel);

/** Cars per drivetrain, with the drivetrain choice left out. */
export const driveCounts = (f: CarFilters, cars: readonly Car[] = CARS) => carFacets.countBy(cars, f, "drive", (car) => car.drive);

/** How many makes the short list shows before "All N makes". */
export const MAKES_UP_FRONT = 8;

export type MakeOption = {
  value: string;
  label: string;
  count: number;
  children: { value: string; label: string; count: number }[];
};

/**
 * Every make in `cars`, the most listed first (MAKES_UP_FRONT of them), then the rest A to Z; each with its models in
 * listing order. Counts leave the make and model choice out, except that a make narrowed to some models counts only those.
 */
export function makeOptions(f: CarFilters, cars: readonly Car[] = CARS): MakeOption[] {
  const totals = new Map<string, number>();
  const modelsOf = new Map<string, string[]>();
  for (const car of cars) {
    totals.set(car.make, (totals.get(car.make) ?? 0) + 1);
    const models = modelsOf.get(car.make) ?? [];
    if (!models.includes(car.model)) models.push(car.model);
    modelsOf.set(car.make, models);
  }

  const narrowed = new Map(f.makes.map((p) => [p.make, p.models]));
  const makeCounts = new Map<string, number>();
  const modelCounts = new Map<string, number>();
  for (const car of carFacets.pool(cars, f, "make")) {
    const models = narrowed.get(car.make);
    if (!models?.length || models.includes(car.model)) makeCounts.set(car.make, (makeCounts.get(car.make) ?? 0) + 1);
    const key = `${car.make}\n${car.model}`;
    modelCounts.set(key, (modelCounts.get(key) ?? 0) + 1);
  }

  const byName = (a: string, b: string) => a.localeCompare(b, "en");
  const front = [...totals.keys()].sort((a, b) => totals.get(b)! - totals.get(a)! || byName(a, b)).slice(0, MAKES_UP_FRONT);
  const rest = [...totals.keys()].filter((make) => !front.includes(make)).sort(byName);

  return [...front, ...rest].map((make) => ({
    value: make,
    label: make,
    count: makeCounts.get(make) ?? 0,
    children: modelsOf.get(make)!.map((model) => ({ value: model, label: model, count: modelCounts.get(`${make}\n${model}`) ?? 0 })),
  }));
}

/** Cars per body style, with the body choice left out. */
export const bodyCounts = (f: CarFilters, cars: readonly Car[] = CARS) => carFacets.countBy(cars, f, "body", (car) => car.body);

/** Cars per colour, with the colour choice left out. */
export const colorCounts = (f: CarFilters, cars: readonly Car[] = CARS) => carFacets.countBy(cars, f, "color", (car) => car.color);

export const matchingCars = (f: CarFilters, cars: readonly Car[] = CARS) => carFacets.filter(cars, f);

/** What one facet's Clear does. */
export function clearFacet(f: CarFilters, facet: CarFacet): CarFilters {
  const e = EMPTY_CAR_FILTERS;
  switch (facet) {
    case "condition":
      return { ...f, condition: e.condition };
    case "price":
      return { ...f, priceMin: null, priceMax: null };
    case "make":
      return { ...f, makes: [] };
    case "body":
      return { ...f, bodies: [] };
    case "year":
      return { ...f, yearMin: null, yearMax: null };
    case "km":
      return { ...f, kmMax: null };
    case "fuel":
      return { ...f, fuels: [] };
    case "drive":
      return { ...f, drives: [] };
    case "transmission":
      return { ...f, transmission: null };
    case "color":
      return { ...f, colors: [] };
    case "seats":
      return { ...f, seatsMin: null };
  }
}

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** "$45,000" */
export const formatMoney = (value: number) => `$${integer.format(value)}`;
const thousands = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** "$45k" or "$97.5k" above a thousand, "$950" below. */
export const formatMoneyShort = (value: number) =>
  value >= 1000 ? `$${thousands.format(value / 1000)}k` : formatMoney(value);
/** "1 car", "6 cars", "1,204 cars" */
export const formatCarCount = (n: number) => (n === 1 ? "1 car" : `${integer.format(n)} cars`);
/** "50,000 km" */
export const formatKm = (value: number) => `${integer.format(value)} km`;

/** "SUV", "SUV, Minivan", then two values and a count of the rest: "SUV, Minivan +1". */
export const listSummary = (values: readonly string[]) =>
  values.length === 0 ? null : values.length <= 2 ? values.join(", ") : `${values.slice(0, 2).join(", ")} +${values.length - 2}`;

/** The closed card's summary for one facet, or null when the facet is unset. */
export function summaryOf(f: CarFilters, facet: CarFacet): string | null {
  switch (facet) {
    case "condition":
      return f.condition;
    case "price":
      if (f.priceMin !== null && f.priceMax !== null) return `${formatMoneyShort(f.priceMin)} to ${formatMoneyShort(f.priceMax)}`;
      if (f.priceMax !== null) return `Under ${formatMoneyShort(f.priceMax)}`;
      if (f.priceMin !== null) return `Over ${formatMoneyShort(f.priceMin)}`;
      return null;
    case "make":
      return listSummary(f.makes.flatMap((p) => (p.models.length ? p.models : [p.make])));
    case "body":
      return listSummary(f.bodies);
    case "year":
      if (f.yearMin !== null && f.yearMin === f.yearMax) return String(f.yearMin);
      if (f.yearMin !== null && f.yearMax !== null) return `${f.yearMin} to ${f.yearMax}`;
      if (f.yearMin !== null) return `${f.yearMin} or newer`;
      if (f.yearMax !== null) return `${f.yearMax} or older`;
      return null;
    case "km":
      return f.kmMax === null ? null : `Under ${formatKm(f.kmMax)}`;
    case "fuel":
      return listSummary(f.fuels);
    case "drive":
      return listSummary(f.drives);
    case "transmission":
      return f.transmission;
    case "color":
      return listSummary(f.colors);
    case "seats":
      return f.seatsMin === null ? null : `${f.seatsMin}+`;
  }
}

/** Card titles, in the designer's wording. */
export const CAR_FACET_TITLES: Record<CarFacet, string> = {
  price: "Price",
  seats: "Seats",
  year: "Year",
  km: "Kilometres",
  condition: "New or used",
  body: "Body style",
  drive: "Drivetrain",
  color: "Colour",
  fuel: "Fuel",
  make: "Make and model",
  transmission: "Transmission",
};

/** The board's three columns, as drawn. */
export const CAR_FACET_COLUMNS: CarFacet[][] = [
  ["price", "seats", "year", "km", "condition"],
  ["body", "drive"],
  ["color", "fuel", "make", "transmission"],
];

export const isEmpty = (f: CarFilters) =>
  (Object.keys(CAR_FACET_TITLES) as CarFacet[]).every((facet) => summaryOf(f, facet) === null);
