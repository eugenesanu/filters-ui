// The words the sentence search knows for the demo cars.
//
// ---------------------------------------------------------------------------------------------------
// SWAP THIS FILE FOR YOUR OWN. Everything about cars lives here: the names (makes, models, body
// styles, colours, fuels, drivetrains, gearboxes), the phrases with numbers (prices, years,
// kilometres, seats) and the everyday phrases ("cheap", "family", "3 row", "good on gas",
// "good in snow"). The reader in ../lib/sentence.ts knows none of it.
// ---------------------------------------------------------------------------------------------------

import { formatsFor, type Formats } from "../lib/format";
import type { Facet, Rule, Term, Token, Vocabulary } from "../lib/sentence";
import { BODIES, COLORS, COLOR_PAINTS, DRIVES, FUELS, MAKES, MODELS_OF, THIS_YEAR, type Car, type Color } from "./cars";
import { EMPTY_CAR_FILTERS, carFacets, carFormats, type CarFilters, type MakePick } from "./cars-facets";

type CarRule = Rule<Car, CarFilters>;
type CarTerm = Term<CarFilters>;

const pushed = <T,>(list: readonly T[], value: T) => (list.includes(value) ? [...list] : [...list, value]);
const union = <T,>(a: readonly T[], b: readonly T[]) => [...new Set([...a, ...b])];

function withModel(makes: readonly MakePick[], make: string, model?: string): MakePick[] {
  const at = makes.findIndex((pick) => pick.make === make);
  if (at < 0) return [...makes, { make, models: model ? [model] : [] }];
  if (!model) return [...makes];
  return makes.map((pick, i) => (i === at ? { make, models: pushed(pick.models, model) } : pick));
}

// ----- Names -----------------------------------------------------------------------------------------

/** Other words for a name. Plurals ("suvs") are read without listing them. */
const OTHER_NAMES: Record<string, string[]> = {
  Chevrolet: ["chevy"],
  Volkswagen: ["vw"],
  "Mercedes-Benz": ["mercedes", "benz"],
  SUV: ["crossover"],
  Truck: ["pickup"],
  Hatchback: ["hatch"],
  Coupe: ["sports car", "sport car"],
  Van: ["cargo van", "work van"],
  Minivan: ["mini van"],
  Convertible: ["cabriolet"],
  Electric: ["ev", "bev"],
  "Plug-in hybrid": ["plug-in", "phev"],
  Gas: ["gasoline"],
  AWD: ["all wheel drive", "all wheel"],
  "4WD": ["4x4", "four wheel drive", "four wheel"],
  FWD: ["front wheel drive", "front wheel"],
  RWD: ["rear wheel drive", "rear wheel"],
  Manual: ["stick shift", "stick"],
  Gray: ["grey"],
  Used: ["pre-owned", "preowned"],
  New: ["brand new"],
};

const term = (key: string, label: string, group: string, add: CarTerm["add"], extra: Partial<CarTerm> = {}): CarTerm => ({
  key,
  label,
  group,
  names: OTHER_NAMES[label],
  add,
  ...extra,
});

const MAKE_TERMS = MAKES.map((make) =>
  term(`make-${make}`, make, "Make", (f) => ({ ...f, makes: withModel(f.makes, make) }), { spellcheck: true }),
);
const MODEL_TERMS = MAKES.flatMap((make) =>
  MODELS_OF[make].map((model) =>
    term(`model-${make}-${model}`, model, "Model", (f) => ({ ...f, makes: withModel(f.makes, make, model) }), {
      hint: make,
      parent: `make-${make}`,
      spellcheck: true,
    }),
  ),
);
const BODY_TERMS = BODIES.map((body) => term(`body-${body}`, body, "Body style", (f) => ({ ...f, bodies: pushed(f.bodies, body) })));
const COLOR_TERMS = COLORS.map((color) =>
  term(`color-${color}`, color, "Colour", (f) => ({ ...f, colors: pushed(f.colors, color) }), { swatch: COLOR_PAINTS[color] }),
);
const FUEL_TERMS = FUELS.map((fuel) => term(`fuel-${fuel}`, fuel, "Fuel", (f) => ({ ...f, fuels: pushed(f.fuels, fuel) })));
const DRIVE_TERMS = DRIVES.map((drive) => term(`drive-${drive}`, drive, "Drivetrain", (f) => ({ ...f, drives: pushed(f.drives, drive) })));
const GEAR_TERMS = (["Automatic", "Manual"] as const).map((gear) =>
  term(`transmission-${gear}`, gear, "Transmission", (f) => ({ ...f, transmission: gear })),
);
const CONDITION_TERMS = (["Used", "New"] as const).map((condition) =>
  term(`condition-${condition}`, condition, "Condition", (f) => ({ ...f, condition })),
);

const TERMS: CarTerm[] = [...MAKE_TERMS, ...MODEL_TERMS, ...BODY_TERMS, ...COLOR_TERMS, ...FUEL_TERMS, ...DRIVE_TERMS, ...GEAR_TERMS, ...CONDITION_TERMS];

// ----- Numbers ---------------------------------------------------------------------------------------

const PRICE_ROUNDING = 5000;
const LOW_KM = 50000;
const CHEAP_SHARE = 0.25;
const KM_LIMITS = [25000, 50000, 100000, 150000];
const SEAT_STEPS = [6, 7, 8];
const YEAR_STEPS = [2, 4, 6, 8].map((back) => THIS_YEAR - back);
/** Newest first. */
const YEARS_BACK = Array.from({ length: 10 }, (_, i) => THIS_YEAR - i);

/** How one locale writes the numbers in a phrase and reads them back, with the pattern parts that find them. */
type Numerals = {
  /** "$30k" for whole thousands, "$25,500" and "$950" otherwise; "30.000 $" in de-DE. */
  money: (value: number) => string;
  km: (value: number) => string;
  plain: (value: number) => string;
  /** A typed number: "30,000", or "30.000" in de-DE and "٣٠٬٠٠٠" in ar-EG. */
  read: (digits: string) => number;
  /** The locale's digits written as 0 to 9. */
  latin: (text: string) => string;
  /** One character of a typed number. */
  num: string;
  digit: string;
  year: string;
  /** The edges of a number, as \b is for 0 to 9. */
  before: string;
  after: string;
};

const inClass = (chars: string) => chars.replace(/[\\\]^-]/g, "\\$&");

function numeralsOf(f: Formats): Numerals {
  const latin = f.digits === "0123456789";
  const own = latin ? "" : f.digits;
  // Group marks a typed number may carry besides the comma, as "." in de-DE.
  const marks = [".", "'", "’", "٬", "،"].filter((mark) => f.readNumber(`1${mark}000`) === 1000).join("");
  const digitOf = (i: number) => (latin ? String(i) : `[${i}${f.digits[i]}]`);
  const digit = latin ? "\\d" : `[\\d${own}]`;
  return {
    money: (value) => (value >= 1000 && value < 1e6 && value % 1000 === 0 ? f.priceShort(value) : f.price(value)),
    km: carFormats(f.locale).km,
    plain: f.plain,
    read: (digits) => f.readNumber(digits) ?? 0,
    latin: (text) => {
      let out = text;
      for (let i = 0; i < 10; i++) out = out.split(f.digits[i]).join(String(i));
      return out;
    },
    // A decimal point too where the locale reads one, only before a digit: "30.5k" stays one number, a full stop is not one.
    num: `(?:[\\d,${inClass(marks + own)}]${f.readNumber("1.5") === 1.5 ? `|\\.(?=${digit})` : ""})`,
    digit,
    year: `(${digitOf(2)}${digitOf(0)}[012${own.slice(0, 3)}]${digit})`,
    before: latin ? "\\b" : `(?<![\\w${own}])`,
    after: latin ? "\\b" : `(?![\\w${own}])`,
  };
}

function priceLabel(x: Numerals, min: number | null, max: number | null) {
  if (min !== null && max !== null) return `${x.money(min)} to ${x.money(max)}`;
  if (max !== null) return `Under ${x.money(max)}`;
  return min !== null ? `Over ${x.money(min)}` : null;
}

function yearLabel(x: Numerals, min: number | null, max: number | null) {
  if (min !== null && min === max) return x.plain(min);
  if (min !== null && max !== null) return `${x.plain(min)} to ${x.plain(max)}`;
  if (min !== null) return `${x.plain(min)} or newer`;
  return max !== null ? `${x.plain(max)} or older` : null;
}

const kmLabel = (x: Numerals, kmMax: number) => `Under ${x.km(kmMax)}`;
const seatsLabel = (x: Numerals, seatsMin: number) => `${x.plain(seatsMin)}+ seats`;

const yearTerm = (x: Numerals, yearMin: number | null, yearMax: number | null): CarTerm =>
  term(`year-${yearMin}-${yearMax}`, yearLabel(x, yearMin, yearMax) ?? "", "Year", (f) => ({ ...f, yearMin, yearMax }));
const priceTerm = (x: Numerals, priceMin: number | null, priceMax: number | null): CarTerm =>
  term(`price-${priceMin}-${priceMax}`, priceLabel(x, priceMin, priceMax) ?? "", "Price", (f) => ({ ...f, priceMin, priceMax }));
const kmTerm = (x: Numerals, kmMax: number): CarTerm => term(`km-${kmMax}`, kmLabel(x, kmMax), "Kilometres", (f) => ({ ...f, kmMax }));
const seatsTerm = (x: Numerals, seatsMin: number): CarTerm => term(`seats-${seatsMin}`, seatsLabel(x, seatsMin), "Seats", (f) => ({ ...f, seatsMin }));

const matching = (cars: readonly Car[], f: CarFilters) => carFacets.filter(cars, f);

/** A quarter, a half and three quarters of the way up the prices left, so every budget offered splits them. */
function priceSteps(f: CarFilters, cars: readonly Car[]) {
  const prices = matching(cars, { ...f, priceMin: null, priceMax: null })
    .map((car) => car.price)
    .sort((a, b) => a - b);
  if (!prices.length) return [];
  return [...new Set([0.25, 0.5, 0.75].map((share) => Math.ceil(prices[Math.floor(prices.length * share)] / PRICE_ROUNDING) * PRICE_ROUNDING))];
}

/** "50k" is 50,000. */
const plain = (x: Numerals, digits: string, k?: string) => x.read(digits) * (k ? 1000 : 1);

/** "30k" and "30" mean $30,000; "30000" means itself. */
const dollars = (x: Numerals, digits: string, k?: string) => {
  const value = x.read(digits);
  return k || value < 1000 ? value * 1000 : value;
};

/** Suggestions for a typed number; each shape of number means something of its own. */
function numberTerms(x: Numerals, typed: string, f: CarFilters, cars: readonly Car[]): CarTerm[] {
  typed = x.latin(typed);
  const years = typed.match(/^(20[012]\d)\s*(?:-|to)\s*(20[012]\d)?$/);
  if (years) {
    const from = Number(years[1]);
    const ends = years[2] ? [Number(years[2])] : [from + 2, from + 4, from + 6].filter((year) => year <= THIS_YEAR);
    return ends.filter((end) => end >= from).map((end) => yearTerm(x, from, end));
  }
  if (/^20[012]\d$/.test(typed)) {
    const year = Number(typed);
    return [yearTerm(x, year, year), yearTerm(x, year, null), yearTerm(x, null, year)];
  }
  if (/^20[012]?$/.test(typed)) {
    return YEARS_BACK.filter((year) => String(year).startsWith(typed) && year % 2 === 0)
      .slice(0, 4)
      .map((year) => yearTerm(x, year, null));
  }

  const between = typed.match(new RegExp(`^\\$?\\s*(\\d${x.num}*)\\s*(k)?\\s*(?:-|to)\\s*\\$?\\s*(\\d${x.num}*)?\\s*(k)?$`));
  if (between) {
    const from = dollars(x, between[1], between[2]);
    const ends = between[3] ? [dollars(x, between[3], between[4])] : [from + 5000, from + 10000, from + 20000];
    return ends.filter((end) => end > from).map((end) => priceTerm(x, from, end));
  }

  const side = typed.match(/^(under|below|max|up to|less than|over|above|more than|min)\b\s*/);
  const over = side !== null && /over|above|more|min/.test(side[1]);
  const rest = side ? typed.slice(side[0].length) : typed;
  if (side && !rest) return over ? priceSteps(f, cars).map((min) => priceTerm(x, min, null)) : [];
  if (rest === "$") return priceSteps(f, cars).map((max) => priceTerm(x, null, max));

  const km = rest.match(new RegExp(`^(\\d${x.num}*)\\s*(k)?\\s*(?:km|kms|kilom\\w*)$`));
  if (km) return [kmTerm(x, plain(x, km[1], km[2]))];

  const amount = rest.match(new RegExp(`^\\$?\\s*(\\d${x.num}*)\\s*(k)?$`));
  if (!amount) return [];
  const bare = !side && !amount[2] && !rest.includes("$");
  const digits = x.read(amount[1]);
  if (bare && digits < 10) return digits >= 2 ? [seatsTerm(x, digits)] : [];
  const value = dollars(x, amount[1], amount[2]);
  if (over) return [priceTerm(x, value, null)];
  if (side) return [priceTerm(x, null, value), kmTerm(x, value)];
  return [priceTerm(x, null, value), priceTerm(x, value, null), kmTerm(x, value)];
}

// ----- Phrases ---------------------------------------------------------------------------------------

const KM = "(?:km|kms|kilomet\\w+)";
/** "30k" and "30 grand" are both 30,000. */
const K = "(k|grand)";
const TO = "(?:to|-|–|—)";
/** "up to 5 seats" and "less than 5 years old" are not prices. */
const NOT_PRICE = "(?!\\s*(?:seats?|seaters?|passengers?|years?|yrs?)\\b)";
const SEAT_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };

/** A price that contradicts the other end replaces it: "under 20k" then "over 40k" means over $40k. */
function withPrice(f: CarFilters, min: number | null, max: number | null): CarFilters {
  const priceMin = min ?? (max !== null && f.priceMin !== null && f.priceMin > max ? null : f.priceMin);
  const priceMax = max ?? (min !== null && f.priceMax !== null && f.priceMax < min ? null : f.priceMax);
  return { ...f, priceMin, priceMax };
}

/** Prices a quarter of the way up the cars that match, so "cheap" means cheap for that kind of car. */
function cheapFor(f: CarFilters, cars: readonly Car[]) {
  const priced = (list: readonly Car[]) => list.map((car) => car.price).sort((a, b) => a - b);
  const found = priced(matching(cars, f));
  const prices = found.length ? found : priced(cars);
  return Math.ceil(prices[Math.floor((prices.length - 1) * CHEAP_SHARE)] / PRICE_ROUNDING) * PRICE_ROUNDING;
}

/** Read in this order, before any name. A phrase's words are used up once it matches. */
function rulesOf(x: Numerals): CarRule[] {
  const { num: N, year: YEAR, before: B, after: A } = x;
  return [
    // Years first, so "from 2019" and "2019 to 2021" are not read as prices.
    {
      pattern: new RegExp(`(?:\\bbetween\\s+)?(?<!\\$)${B}${YEAR}\\s*(?:to|-|–|—|or|and)\\s*${YEAR}${A}(?!\\s*k\\b)`),
      read: (f, m) => ({ ...f, yearMin: Math.min(x.read(m[1]), x.read(m[2])), yearMax: Math.max(x.read(m[1]), x.read(m[2])) }),
    },
    { pattern: new RegExp(`\\b(?:from|since)\\s+${YEAR}${A}(?!\\s*k\\b)`), read: (f, m) => ({ ...f, yearMin: x.read(m[1]) }) },
    { pattern: new RegExp(`\\b(?:under|below|less than)\\s+(${N}+)\\s*(k)?\\s*${KM}\\b`), read: (f, m) => ({ ...f, kmMax: plain(x, m[1], m[2]) }) },
    {
      pattern: new RegExp(
        `\\$?\\s*${B}(${N}+)\\s*${K}?\\s*${TO}\\s*\\$?\\s*(${N}+)\\s*${K}\\b(?!\\s*${KM})|\\$\\s*(${N}+)\\s*${K}?\\s*${TO}\\s*\\$?\\s*(${N}+)\\s*${K}?|\\bbetween\\s+\\$?\\s*(${N}+)\\s*${K}?\\s*and\\s+\\$?\\s*(${N}+)\\s*${K}?${A}`,
      ),
      read: (f, m) => {
        const at = m[1] !== undefined ? 1 : m[5] !== undefined ? 5 : 9;
        return { ...f, priceMin: dollars(x, m[at], m[at + 1]), priceMax: dollars(x, m[at + 2], m[at + 3]) };
      },
    },
    { pattern: new RegExp(`\\b(?:under|below|less than|max|up to|budget(?: of)?)\\s+\\$?\\s*(${N}+)\\s*${K}?${A}${NOT_PRICE}`), read: (f, m) => withPrice(f, null, dollars(x, m[1], m[2])) },
    { pattern: new RegExp(`\\b(?:over|above|more than|from)\\s+\\$?\\s*(${N}+)\\s*${K}?${A}${NOT_PRICE}`), read: (f, m) => withPrice(f, dollars(x, m[1], m[2]), null) },
    // A lone "$30k" or "30k" is a budget.
    { pattern: new RegExp(`(?:\\$\\s*(${N}+)\\s*${K}?|${B}(${N}+)\\s*${K})${A}(?!\\s*(?:${KM}|miles?))`), read: (f, m) => withPrice(f, null, m[1] !== undefined ? dollars(x, m[1], m[2]) : dollars(x, m[3], m[4])) },
    { pattern: new RegExp(`${B}${YEAR}\\s*(?:or|and)\\s*(?:older|earlier)\\b`), read: (f, m) => ({ ...f, yearMax: x.read(m[1]) }) },
    { pattern: new RegExp(`\\b(?:older than|before)\\s+${YEAR}${A}`), read: (f, m) => ({ ...f, yearMax: x.read(m[1]) - 1 }) },
    { pattern: new RegExp(`${B}${YEAR}(?:\\s*\\+|\\s*(?:or|and)\\s+(?:newer|later|up)\\b|\\s+(?:and\\s+)?(?:newer|later|up)\\b)`), read: (f, m) => ({ ...f, yearMin: x.read(m[1]) }) },
    { pattern: new RegExp(`\\b(?:newer than|after)\\s+${YEAR}${A}`), read: (f, m) => ({ ...f, yearMin: x.read(m[1]) + 1 }) },
    { pattern: new RegExp(`${B}${YEAR}${A}`), read: (f, m) => ({ ...f, yearMin: x.read(m[1]), yearMax: x.read(m[1]) }) },
    ...PLAIN_RULES.slice(0, 3),
    {
      pattern: new RegExp(`${B}(${x.digit}|${Object.keys(SEAT_WORDS).join("|")})\\s*-?\\s*(?:seats?|seaters?|passengers?)\\b`),
      read: (f, m) => ({ ...f, seatsMin: SEAT_WORDS[m[1]] ?? x.read(m[1]) }),
    },
    ...PLAIN_RULES.slice(3),
  ];
}

/** The phrases with no number to read, the same in every locale. */
const PLAIN_RULES: CarRule[] = [
  // Everyday words for what a car is good at. Read before the names, since "good on gas" also says gas.
  { pattern: /\b(?:3|three|third|3rd)[- ]?rows?(?:\s+(?:seating|seats?))?\b/g, read: (f) => ({ ...f, seatsMin: 6 }) },
  {
    pattern: /\b(?:(?:good|great) on (?:gas|fuel)|fuel[- ]efficient|efficient|economical|good (?:gas |fuel )?mileage)\b/g,
    read: (f) => ({ ...f, fuels: union(f.fuels, ["Hybrid", "Plug-in hybrid", "Electric"]) }),
  },
  { pattern: /\b(?:good (?:in|for) (?:the )?snow|snowy?|winter)\b/g, read: (f) => ({ ...f, drives: union(f.drives, ["AWD", "4WD"]) }) },
  { pattern: /\blow[- ]?(?:km|kms|kilomet\w+|mileage|miles)\b/g, read: (f) => ({ ...f, kmMax: f.kmMax ?? LOW_KM }) },
  // "family" guesses SUV and Minivan only when no body style is named anywhere in the sentence or set before.
  {
    pattern: /\bfamil(?:y|ies)\b/g,
    finish: (f, { context }) => (f.bodies.length || context.bodies.length ? f : { ...f, bodies: ["SUV", "Minivan"] }),
  },
  {
    pattern: /\b(?:cheap(?:er|est)?|affordable|inexpensive|budget|first cars?|students?)\b/g,
    finish: (f, { context, items, vocabulary }) =>
      [f.priceMin, f.priceMax, context.priceMin, context.priceMax].some((price) => price !== null)
        ? f
        : { ...f, priceMax: cheapFor(vocabulary.merge(context, f), items) },
  },
];

// ----- Filters named by their own word ("price", "colour") or offered on an empty box ----------------

const isSetList = (list: readonly unknown[]) => list.length > 0;

const facetsOf = (x: Numerals): Facet<Car, CarFilters>[] => [
  { title: "Make", words: ["make", "brand"], options: () => MAKE_TERMS, isSet: (f) => isSetList(f.makes) },
  {
    title: "Model",
    words: ["model"],
    options: (f) => MODEL_TERMS.filter((t) => f.makes.some((pick) => t.parent === `make-${pick.make}`)),
    isSet: (f) => !f.makes.length || f.makes.some((pick) => pick.models.length > 0),
  },
  { title: "Body style", words: ["body", "style", "type"], options: () => BODY_TERMS, isSet: (f) => isSetList(f.bodies) },
  { title: "Colour", words: ["colour", "color", "paint"], options: () => COLOR_TERMS, isSet: (f) => isSetList(f.colors) },
  {
    title: "Year",
    words: ["year", "range", "newer"],
    options: () => YEAR_STEPS.map((year) => yearTerm(x, year, null)),
    isSet: (f) => f.yearMin !== null || f.yearMax !== null,
    stepped: true,
  },
  {
    title: "Price",
    words: ["price", "budget", "cost", "range", "under"],
    options: (f, cars) => priceSteps(f, cars).map((max) => priceTerm(x, null, max)),
    isSet: (f) => f.priceMin !== null || f.priceMax !== null,
    stepped: true,
  },
  { title: "Fuel", words: ["fuel", "engine"], options: () => FUEL_TERMS, isSet: (f) => isSetList(f.fuels) },
  { title: "Drivetrain", words: ["drive", "drivetrain"], options: () => DRIVE_TERMS, isSet: (f) => isSetList(f.drives) },
  {
    title: "Kilometres",
    words: ["km", "kms", "kilometres", "kilometers", "mileage", "odometer", "under"],
    options: () => KM_LIMITS.map((kmMax) => kmTerm(x, kmMax)),
    isSet: (f) => f.kmMax !== null,
    stepped: true,
  },
  { title: "Seats", words: ["seat", "seats"], options: () => SEAT_STEPS.map((seatsMin) => seatsTerm(x, seatsMin)), isSet: (f) => f.seatsMin !== null, stepped: true },
];

// ----- Tokens ----------------------------------------------------------------------------------------

const without = <T,>(list: readonly T[], value: T) => list.filter((item) => item !== value);

/** In the order a person would say them: "used white AWD Toyota RAV4, 2020 or newer, under $40k". */
function tokensOf(numerals: Numerals, f: CarFilters): Token<CarFilters>[] {
  const tokens: Token<CarFilters>[] = [];
  const add = (token: Token<CarFilters>) => tokens.push(token);
  if (f.condition) add({ key: `condition-${f.condition}`, label: f.condition, group: "Condition", clear: (x) => ({ ...x, condition: null }) });
  for (const color of f.colors) {
    add({ key: `color-${color}`, label: color, group: "Colour", swatch: COLOR_PAINTS[color], clear: (x) => ({ ...x, colors: without(x.colors, color) }) });
  }
  for (const fuel of f.fuels) add({ key: `fuel-${fuel}`, label: fuel, group: "Fuel", clear: (x) => ({ ...x, fuels: without(x.fuels, fuel) }) });
  for (const drive of f.drives) add({ key: `drive-${drive}`, label: drive, group: "Drivetrain", clear: (x) => ({ ...x, drives: without(x.drives, drive) }) });
  for (const { make } of f.makes) {
    add({ key: `make-${make}`, label: make, group: "Make", clear: (x) => ({ ...x, makes: x.makes.filter((pick) => pick.make !== make) }) });
  }
  for (const { make, models } of f.makes) {
    for (const model of models) {
      add({
        key: `model-${make}-${model}`,
        label: model,
        group: "Model",
        hint: make,
        clear: (x) => ({ ...x, makes: x.makes.map((pick) => (pick.make === make ? { make, models: without(pick.models, model) } : pick)) }),
      });
    }
  }
  for (const body of f.bodies) add({ key: `body-${body}`, label: body, group: "Body style", clear: (x) => ({ ...x, bodies: without(x.bodies, body) }) });
  if (f.transmission) {
    add({ key: `transmission-${f.transmission}`, label: f.transmission, group: "Transmission", clear: (x) => ({ ...x, transmission: null }) });
  }
  const year = yearLabel(numerals, f.yearMin, f.yearMax);
  if (year) add({ key: "year", label: year, group: "Year", clear: (x) => ({ ...x, yearMin: null, yearMax: null }) });
  if (f.kmMax !== null) add({ key: "km", label: kmLabel(numerals, f.kmMax), group: "Kilometres", clear: (x) => ({ ...x, kmMax: null }) });
  if (f.seatsMin !== null) add({ key: "seats", label: seatsLabel(numerals, f.seatsMin), group: "Seats", clear: (x) => ({ ...x, seatsMin: null }) });
  const price = priceLabel(numerals, f.priceMin, f.priceMax);
  if (price) add({ key: "price", label: price, group: "Price", clear: (x) => ({ ...x, priceMin: null, priceMax: null }) });
  return tokens;
}

function mergeMakes(base: readonly MakePick[], extra: readonly MakePick[]) {
  let makes = [...base];
  for (const pick of extra) {
    makes = withModel(makes, pick.make);
    for (const model of pick.models) makes = withModel(makes, pick.make, model);
  }
  return makes;
}

function vocabularyOf(formats: Formats): Vocabulary<Car, CarFilters> {
  const x = numeralsOf(formats);
  return {
    empty: EMPTY_CAR_FILTERS,
    matches: (car, f) => carFacets.matches(car, f),
    merge: (base, extra) => ({
      ...withPrice(base, extra.priceMin, extra.priceMax),
      condition: extra.condition ?? base.condition,
      makes: mergeMakes(base.makes, extra.makes),
      bodies: union(base.bodies, extra.bodies),
      yearMin: extra.yearMin ?? base.yearMin,
      yearMax: extra.yearMax ?? base.yearMax,
      kmMax: extra.kmMax ?? base.kmMax,
      fuels: union(base.fuels, extra.fuels),
      drives: union(base.drives, extra.drives),
      transmission: extra.transmission ?? base.transmission,
      colors: union<Color>(base.colors, extra.colors),
      seatsMin: extra.seatsMin ?? base.seatsMin,
    }),
    tokens: (state) => tokensOf(x, state),
    terms: TERMS,
    rules: rulesOf(x),
    facets: facetsOf(x),
    firstUp: ["Make", "Body style"],
    nextUp: ["Model", "Colour", "Year", "Price", "Body style", "Fuel", "Kilometres", "Seats"],
    numbers: (typed, state, items) => numberTerms(x, typed, state, items),
    filler:
      "a an the any some my me i im we you want need looking look for find show get buy with and or of in on at least by to from under over than less more car cars vehicle vehicles one ones please that is it has have".split(
        " ",
      ),
    notTypos:
      "audio audit carry civil escapee fold fond food fore fork form fort highland mind mine mink mint modesty mustard outpace outrank pacific pacifier ramp rave ream roam rouge sentry shortage spoilage storage transient transmit wrangle wringer".split(
        " ",
      ),
    stopNames: ["car", "cars", "vehicle", "vehicles"],
    dropLast: ["Make", "Model"],
    everything: "Every car",
  };
}

const vocabularies = new Map<string, Vocabulary<Car, CarFilters>>();

/** The vocabulary with prices, kilometres, years and seats written and read the locale's way, e.g. "de-DE". Words stay English. */
export function carVocabularyFor(locale?: string): Vocabulary<Car, CarFilters> {
  const f = formatsFor(locale);
  let known = vocabularies.get(f.locale);
  if (!known) {
    known = vocabularyOf(f);
    vocabularies.set(f.locale, known);
  }
  return known;
}

/** The vocabulary in en-US. */
export const carVocabulary = carVocabularyFor();
