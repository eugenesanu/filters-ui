"use client";

import { useState } from "react";
import { IconTiles } from "../filters/icon-tiles";
import { BodyIcon, type BodyStyle } from "../demo/body-icons";
import { FilterCard } from "../ui/filter-card";

type Car = { name: string; body: BodyStyle };

const CARS: Car[] = [
  { name: "Toyota RAV4", body: "SUV" },
  { name: "Honda CR-V", body: "SUV" },
  { name: "Kia Telluride", body: "SUV" },
  { name: "Toyota Camry", body: "Sedan" },
  { name: "Tesla Model 3", body: "Sedan" },
  { name: "Ford F-150", body: "Truck" },
  { name: "Toyota Tacoma", body: "Truck" },
  { name: "Volkswagen Golf GTI", body: "Hatchback" },
  { name: "Ford Mustang", body: "Coupe" },
  { name: "Toyota Sienna", body: "Minivan" },
  { name: "Ford Transit", body: "Van" },
  { name: "Mazda MX-5", body: "Convertible" },
];

const BODIES: BodyStyle[] = ["SUV", "Sedan", "Truck", "Hatchback", "Coupe", "Minivan", "Van", "Convertible"];

const carCount = (n: number) => (n === 1 ? "1 car" : `${n} cars`);

const options = BODIES.map((body) => ({
  value: body,
  label: body,
  icon: <BodyIcon body={body} />,
  count: CARS.filter((car) => car.body === body).length,
}));

const summaryOf = (picked: BodyStyle[]) =>
  picked.length === 0 ? null : picked.length <= 2 ? picked.join(", ") : `${picked.slice(0, 2).join(", ")} +${picked.length - 2}`;

export default function BodyStyleExample() {
  const [bodies, setBodies] = useState<BodyStyle[]>([]);
  const results = CARS.filter((car) => bodies.length === 0 || bodies.includes(car.body));

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Body style"
        summary={summaryOf(bodies)}
        onClear={() => setBodies([])}
        defaultOpen
        bodyClassName="pb-1.5"
      >
        <IconTiles label="Body style" options={options} value={bodies} onChange={setBodies} countLabel={carCount} />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
