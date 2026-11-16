"use client";

import { useState } from "react";
import { RecentSearches, remember, type SavedSearch } from "../filters/recent-searches";
import type { Term, Token, Vocabulary } from "../lib/sentence";

type Car = { make: string; body: string; color: string; fuel: string; seats: number; price: number };

const CARS: Car[] = [
  { make: "Toyota", body: "SUV", color: "Blue", fuel: "Hybrid", seats: 5, price: 28900 },
  { make: "Toyota", body: "SUV", color: "White", fuel: "Gas", seats: 5, price: 29900 },
  { make: "Toyota", body: "SUV", color: "Black", fuel: "Hybrid", seats: 8, price: 47500 },
  { make: "Toyota", body: "Minivan", color: "White", fuel: "Hybrid", seats: 8, price: 39900 },
  { make: "Honda", body: "Sedan", color: "White", fuel: "Gas", seats: 5, price: 23995 },
  { make: "Honda", body: "SUV", color: "Blue", fuel: "Hybrid", seats: 5, price: 32900 },
  { make: "Honda", body: "Minivan", color: "Black", fuel: "Hybrid", seats: 8, price: 41200 },
  { make: "Ford", body: "Truck", color: "Red", fuel: "Gas", seats: 6, price: 38900 },
  { make: "Kia", body: "SUV", color: "White", fuel: "Gas", seats: 8, price: 44800 },
  { make: "Tesla", body: "Sedan", color: "White", fuel: "Electric", seats: 5, price: 37900 },
  { make: "Tesla", body: "SUV", color: "Blue", fuel: "Electric", seats: 5, price: 45900 },
  { make: "Hyundai", body: "SUV", color: "Blue", fuel: "Electric", seats: 5, price: 29800 },
];

type Search = { makes: string[]; bodies: string[]; colors: string[]; fuels: string[]; priceMax: number | null; seatsMin: number | null };
type ListKey = "makes" | "bodies" | "colors" | "fuels";

const EMPTY: Search = { makes: [], bodies: [], colors: [], fuels: [], priceMax: null, seatsMin: null };
const LISTS: [ListKey, string, string[]][] = [
  ["makes", "Make", ["Toyota", "Honda", "Ford", "Kia", "Tesla", "Hyundai"]],
  ["bodies", "Body style", ["SUV", "Sedan", "Truck", "Minivan"]],
  ["colors", "Colour", ["Black", "White", "Blue", "Red"]],
  ["fuels", "Fuel", ["Gas", "Hybrid", "Electric"]],
];

const unique = (values: string[]) => [...new Set(values)];

// The words the search knows; see the sentence search for a fuller vocabulary.
const TERMS: Term<Search>[] = LISTS.flatMap(([list, group, values]) =>
  values.map((value) => ({ key: `${list}-${value}`, label: value, group, add: (s: Search) => ({ ...s, [list]: unique([...s[list], value]) }) })),
);

function tokens(s: Search): Token<Search>[] {
  const out: Token<Search>[] = LISTS.flatMap(([list, group]) =>
    s[list].map((value) => ({ key: `${list}-${value}`, label: value, group, clear: (x: Search) => ({ ...x, [list]: x[list].filter((v) => v !== value) }) })),
  );
  if (s.priceMax !== null) out.push({ key: "price", label: `Under $${s.priceMax / 1000}k`, group: "Price", clear: (x) => ({ ...x, priceMax: null }) });
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
    { pattern: /\b(?:under|below)\s+\$?(\d+)k\b/, read: (s, m) => ({ ...s, priceMax: Number(m[1]) * 1000 }) },
    { pattern: /\b(\d)\s*seats?\b/, read: (s, m) => ({ ...s, seatsMin: Number(m[1]) }) },
  ],
};

// Where the lists live is up to you: state for this visit, localStorage, or your server.
const SAVED: SavedSearch<Search>[] = [
  { id: "family", name: "Family hybrid", value: { ...EMPTY, fuels: ["Hybrid"], seatsMin: 7 } },
  { id: "city", name: "City electric", value: { ...EMPTY, fuels: ["Electric"], priceMax: 40000 } },
];
const RECENT: SavedSearch<Search>[] = [
  { id: "r1", value: { ...EMPTY, colors: ["Blue"], bodies: ["SUV"], priceMax: 30000 } },
  { id: "r2", value: { ...EMPTY, makes: ["Toyota"], bodies: ["Minivan"] } },
  { id: "r3", value: { ...EMPTY, makes: ["Tesla"] } },
];

const carCount = (n: number) => (n === 1 ? "1 car" : `${n} cars`);

export default function RecentSearchesExample() {
  const [search, setSearch] = useState<Search>(EMPTY);
  const [recent, setRecent] = useState(RECENT);
  const [saved, setSaved] = useState(SAVED);
  const results = CARS.filter((car) => vocabulary.matches(car, search));

  return (
    <div className="w-full max-w-[560px]">
      <RecentSearches
        vocabulary={vocabulary}
        items={CARS}
        value={search}
        onChange={setSearch}
        recent={recent}
        saved={saved}
        onSearch={(value) => setRecent((list) => remember(vocabulary, list, value))}
        onSave={(value, name) => setSaved((list) => [...list, { id: String(Date.now()), name, value }])}
        onForget={(id) => {
          setRecent((list) => list.filter((entry) => entry.id !== id));
          setSaved((list) => list.filter((entry) => entry.id !== id));
        }}
        label="Describe the car you want"
        countLabel={carCount}
      />
      <p className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
