"use client";

import { useState } from "react";
import { SentenceSearch } from "../filters/sentence-search";
import type { Term, Token, Vocabulary } from "../lib/sentence";

type Car = { make: string; model: string; body: string; color: string; fuel: string; seats: number; price: number };

const CARS: Car[] = [
  { make: "Toyota", model: "RAV4", body: "SUV", color: "Blue", fuel: "Hybrid", seats: 5, price: 28900 },
  { make: "Toyota", model: "RAV4", body: "SUV", color: "White", fuel: "Gas", seats: 5, price: 29900 },
  { make: "Toyota", model: "Highlander", body: "SUV", color: "Black", fuel: "Hybrid", seats: 8, price: 47500 },
  { make: "Toyota", model: "Corolla", body: "Sedan", color: "Blue", fuel: "Gas", seats: 5, price: 21900 },
  { make: "Honda", model: "Civic", body: "Sedan", color: "White", fuel: "Gas", seats: 5, price: 23995 },
  { make: "Honda", model: "CR-V", body: "SUV", color: "Blue", fuel: "Hybrid", seats: 5, price: 32900 },
  { make: "Honda", model: "Odyssey", body: "Minivan", color: "Black", fuel: "Gas", seats: 8, price: 41200 },
  { make: "Ford", model: "F-150", body: "Truck", color: "Red", fuel: "Gas", seats: 6, price: 38900 },
  { make: "Ford", model: "Escape", body: "SUV", color: "Black", fuel: "Plug-in hybrid", seats: 5, price: 31400 },
  { make: "Kia", model: "Telluride", body: "SUV", color: "White", fuel: "Gas", seats: 8, price: 44800 },
  { make: "Tesla", model: "Model 3", body: "Sedan", color: "White", fuel: "Electric", seats: 5, price: 37900 },
  { make: "Tesla", model: "Model Y", body: "SUV", color: "Blue", fuel: "Electric", seats: 5, price: 45900 },
];

type Search = { makes: string[]; bodies: string[]; colors: string[]; fuels: string[]; priceMax: number | null; seatsMin: number | null };

const EMPTY: Search = { makes: [], bodies: [], colors: [], fuels: [], priceMax: null, seatsMin: null };

type ListKey = "makes" | "bodies" | "colors" | "fuels";

const unique = (values: string[]) => [...new Set(values)];
const toggleOn = (list: ListKey, value: string) => (s: Search) => ({ ...s, [list]: unique([...s[list], value]) });

// The words this search knows. Swap these lists for your own fields.
const terms = (list: ListKey, group: string, values: string[], extra: Partial<Term<Search>> = {}): Term<Search>[] =>
  values.map((value) => ({ key: `${list}-${value}`, label: value, group, add: toggleOn(list, value), ...extra }));

const TERMS: Term<Search>[] = [
  ...terms("makes", "Make", unique(CARS.map((car) => car.make)), { spellcheck: true }),
  ...terms("bodies", "Body style", ["SUV", "Sedan", "Truck", "Minivan"]),
  ...terms("colors", "Colour", ["Black", "White", "Blue", "Red"]),
  ...terms("fuels", "Fuel", ["Gas", "Hybrid", "Plug-in hybrid", "Electric"]),
];

const whole = new Intl.NumberFormat("en-US");
const money = (value: number) => (value % 1000 === 0 ? `$${value / 1000}k` : `$${whole.format(value)}`);

const dollars = (digits: string, k?: string) => {
  const value = Number(digits.replace(/,/g, ""));
  return k || value < 1000 ? value * 1000 : value;
};

function tokens(s: Search): Token<Search>[] {
  const lists = [
    ["makes", "Make"],
    ["bodies", "Body style"],
    ["colors", "Colour"],
    ["fuels", "Fuel"],
  ] as const;
  const out: Token<Search>[] = lists.flatMap(([list, group]) =>
    s[list].map((value) => ({
      key: `${list}-${value}`,
      label: value,
      group,
      clear: (x: Search) => ({ ...x, [list]: x[list].filter((v) => v !== value) }),
    })),
  );
  if (s.priceMax !== null) out.push({ key: "price", label: `Under ${money(s.priceMax)}`, group: "Price", clear: (x) => ({ ...x, priceMax: null }) });
  if (s.seatsMin !== null) out.push({ key: "seats", label: `${s.seatsMin}+ seats`, group: "Seats", clear: (x) => ({ ...x, seatsMin: null }) });
  return out;
}

const vocabulary: Vocabulary<Car, Search> = {
  empty: EMPTY,
  matches: (car, s) =>
    (!s.makes.length || s.makes.includes(car.make)) &&
    (!s.bodies.length || s.bodies.includes(car.body)) &&
    (!s.colors.length || s.colors.includes(car.color)) &&
    (!s.fuels.length || s.fuels.includes(car.fuel)) &&
    (s.priceMax === null || car.price <= s.priceMax) &&
    (s.seatsMin === null || car.seats >= s.seatsMin),
  merge: (a, b) => ({
    makes: unique([...a.makes, ...b.makes]),
    bodies: unique([...a.bodies, ...b.bodies]),
    colors: unique([...a.colors, ...b.colors]),
    fuels: unique([...a.fuels, ...b.fuels]),
    priceMax: b.priceMax ?? a.priceMax,
    seatsMin: b.seatsMin ?? a.seatsMin,
  }),
  tokens,
  terms: TERMS,
  rules: [
    { pattern: /\b(?:under|below|up to)\s+\$?\s*([\d,]+)\s*(k)?\b/, read: (s, m) => ({ ...s, priceMax: dollars(m[1], m[2]) }) },
    { pattern: /\b(\d)\s*(?:seats?|seater)\b/, read: (s, m) => ({ ...s, seatsMin: Number(m[1]) }) },
  ],
  facets: [
    { title: "Body style", words: ["body", "type"], options: () => TERMS.filter((t) => t.group === "Body style"), isSet: (s) => s.bodies.length > 0 },
    { title: "Colour", words: ["colour", "color"], options: () => TERMS.filter((t) => t.group === "Colour"), isSet: (s) => s.colors.length > 0 },
    { title: "Fuel", words: ["fuel"], options: () => TERMS.filter((t) => t.group === "Fuel"), isSet: (s) => s.fuels.length > 0 },
    {
      title: "Price",
      words: ["price", "budget"],
      options: () => [30000, 40000].map((max) => ({ key: `price-${max}`, label: `Under ${money(max)}`, group: "Price", add: (s: Search) => ({ ...s, priceMax: max }) })),
      isSet: (s) => s.priceMax !== null,
      stepped: true,
    },
  ],
  firstUp: ["Body style", "Fuel"],
  nextUp: ["Body style", "Colour", "Fuel", "Price"],
  filler: "a an the any with and or for in on of car cars".split(" "),
  notTypos: ["fold", "food", "fork", "form", "fort"],
  stopNames: ["car", "cars"],
  everything: "Every car",
};

const carCount = (n: number) => (n === 1 ? "1 car" : `${n} cars`);

export default function SentenceSearchExample() {
  const [search, setSearch] = useState<Search>(EMPTY);
  const results = CARS.filter((car) => vocabulary.matches(car, search));

  return (
    <div className="w-full max-w-[560px]">
      <SentenceSearch
        vocabulary={vocabulary}
        items={CARS}
        value={search}
        onChange={setSearch}
        label="Describe the car you want"
        countLabel={carCount}
      />
      <p className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#929292)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
