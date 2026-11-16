"use client";

import { useState } from "react";
import { ChipGroup } from "../filters/chip-group";
import { FilterCard } from "../ui/filter-card";

type Fuel = "Gas" | "Hybrid" | "Plug-in hybrid" | "Electric" | "Diesel";

type Car = { name: string; fuel: Fuel };

const CARS: Car[] = [
  { name: "Honda Civic", fuel: "Gas" },
  { name: "Mazda CX-5", fuel: "Gas" },
  { name: "Subaru Outback", fuel: "Gas" },
  { name: "Ford Mustang", fuel: "Gas" },
  { name: "Toyota RAV4", fuel: "Hybrid" },
  { name: "Toyota Camry", fuel: "Hybrid" },
  { name: "Honda CR-V", fuel: "Hybrid" },
  { name: "Ford Escape", fuel: "Plug-in hybrid" },
  { name: "BMW X3", fuel: "Plug-in hybrid" },
  { name: "Tesla Model Y", fuel: "Electric" },
  { name: "Kia EV6", fuel: "Electric" },
  { name: "Hyundai Ioniq 5", fuel: "Electric" },
];

const FUELS: Fuel[] = ["Gas", "Hybrid", "Plug-in hybrid", "Electric", "Diesel"];

const carCount = (n: number) => (n === 1 ? "1 car" : `${n} cars`);

// Diesel has no cars here: its chip stays, dimmed, so the rows do not shift.
const options = FUELS.map((fuel) => ({
  value: fuel,
  label: fuel,
  count: CARS.filter((car) => car.fuel === fuel).length,
}));

const summaryOf = (picked: Fuel[]) =>
  picked.length === 0 ? null : picked.length <= 2 ? picked.join(", ") : `${picked.slice(0, 2).join(", ")} +${picked.length - 2}`;

export default function FuelExample() {
  const [fuels, setFuels] = useState<Fuel[]>([]);
  const results = CARS.filter((car) => fuels.length === 0 || fuels.includes(car.fuel));

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Fuel"
        summary={summaryOf(fuels)}
        onClear={() => setFuels([])}
        defaultOpen
        bodyClassName="pb-2"
      >
        <ChipGroup label="Fuel" options={options} value={fuels} onChange={setFuels} countLabel={carCount} />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
