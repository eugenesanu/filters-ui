"use client";

import { useState } from "react";
import { Rules, matchRules, type RuleField, type RuleSet } from "../filters/rules";

type Car = { name: string; price: number; fuel: string; body: string; seats: number; year: number };

const CARS: Car[] = [
  { name: "Toyota RAV4", price: 31400, fuel: "Hybrid", body: "SUV", seats: 5, year: 2022 },
  { name: "Toyota Sienna", price: 42900, fuel: "Hybrid", body: "Minivan", seats: 8, year: 2023 },
  { name: "Toyota Highlander", price: 47500, fuel: "Hybrid", body: "SUV", seats: 8, year: 2023 },
  { name: "Toyota Corolla", price: 21900, fuel: "Gas", body: "Sedan", seats: 5, year: 2021 },
  { name: "Honda CR-V", price: 33800, fuel: "Hybrid", body: "SUV", seats: 5, year: 2023 },
  { name: "Honda Odyssey", price: 38200, fuel: "Gas", body: "Minivan", seats: 8, year: 2021 },
  { name: "Honda Civic", price: 23995, fuel: "Gas", body: "Sedan", seats: 5, year: 2022 },
  { name: "Kia Sorento", price: 39900, fuel: "Plug-in hybrid", body: "SUV", seats: 7, year: 2024 },
  { name: "Kia Telluride", price: 44800, fuel: "Gas", body: "SUV", seats: 8, year: 2023 },
  { name: "Kia EV6", price: 41500, fuel: "Electric", body: "SUV", seats: 5, year: 2024 },
  { name: "Ford Escape", price: 29400, fuel: "Plug-in hybrid", body: "SUV", seats: 5, year: 2022 },
  { name: "Ford F-150", price: 46900, fuel: "Hybrid", body: "Truck", seats: 6, year: 2023 },
  { name: "Chrysler Pacifica", price: 43900, fuel: "Plug-in hybrid", body: "Minivan", seats: 7, year: 2022 },
  { name: "Tesla Model Y", price: 45900, fuel: "Electric", body: "SUV", seats: 7, year: 2024 },
  { name: "Tesla Model 3", price: 36900, fuel: "Electric", body: "Sedan", seats: 5, year: 2023 },
  { name: "Mazda CX-5", price: 27900, fuel: "Gas", body: "SUV", seats: 5, year: 2021 },
];

const FIELDS: RuleField<Car>[] = [
  { key: "price", label: "Price", kind: "number", get: (car) => car.price, prefix: "$" },
  { key: "fuel", label: "Fuel", kind: "list", get: (car) => car.fuel, options: ["Gas", "Hybrid", "Plug-in hybrid", "Electric"] },
  { key: "seats", label: "Seats", kind: "step", get: (car) => car.seats, steps: [5, 6, 7, 8] },
  { key: "body", label: "Body style", kind: "list", get: (car) => car.body, options: ["SUV", "Sedan", "Minivan", "Truck"] },
  { key: "year", label: "Year", kind: "step", get: (car) => car.year, steps: [2024, 2023, 2022, 2021] },
];

const START: RuleSet = {
  join: "and",
  items: [
    { id: "price", field: "price", op: "atMost", value: 45000 },
    { id: "fuel", field: "fuel", op: "anyOf", value: ["Hybrid", "Electric"] },
    {
      id: "room",
      join: "or",
      rules: [
        { id: "seats", field: "seats", op: "atLeast", value: 7 },
        { id: "body", field: "body", op: "anyOf", value: ["Minivan"] },
      ],
    },
  ],
};

const carCount = (n: number) => (n === 1 ? "1 car" : `${n} cars`);

export default function RulesExample() {
  const [rules, setRules] = useState(START);
  const results = CARS.filter((car) => matchRules(car, rules, FIELDS));

  return (
    <div className="w-full max-w-[640px]">
      <Rules fields={FIELDS} items={CARS} value={rules} onChange={setRules} label="Car rules" countLabel={carCount} leftLabel="Cars left" />
      <p className="mt-4 pl-11 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#929292)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
