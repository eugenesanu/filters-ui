"use client";

import { useState } from "react";
import { BarList } from "../filters/bar-list";
import { FilterCard } from "../ui/filter-card";
import { Segmented } from "../ui/segmented";

type Body = "SUV" | "Sedan" | "Truck";

// Cars in stock per make and body style.
const STOCK: Record<string, Record<Body, number>> = {
  Toyota: { SUV: 12, Sedan: 9, Truck: 4 },
  Honda: { SUV: 9, Sedan: 11, Truck: 1 },
  Ford: { SUV: 7, Sedan: 2, Truck: 12 },
  Hyundai: { SUV: 8, Sedan: 4, Truck: 0 },
  Tesla: { SUV: 6, Sedan: 5, Truck: 1 },
  Chevrolet: { SUV: 3, Sedan: 1, Truck: 8 },
  Kia: { SUV: 6, Sedan: 3, Truck: 0 },
  Ram: { SUV: 0, Sedan: 0, Truck: 9 },
  Mazda: { SUV: 5, Sedan: 2, Truck: 0 },
  Subaru: { SUV: 5, Sedan: 1, Truck: 0 },
};

const MAKES = Object.keys(STOCK);
const BODIES: Body[] = ["SUV", "Sedan", "Truck"];

// How many cars match, for any makes ([] is all) and one body style (null is any).
const count = (makes: string[], body: Body | null) =>
  (makes.length ? makes : MAKES).reduce((n, make) => n + BODIES.reduce((m, b) => m + (body === null || body === b ? STOCK[make][b] : 0), 0), 0);

const carCount = (n: number) => (n === 1 ? "1 car" : `${n} cars`);

const summaryOf = (makes: string[]) =>
  makes.length === 0 ? null : makes.length <= 2 ? makes.join(", ") : `${makes.slice(0, 2).join(", ")} +${makes.length - 2}`;

export default function MakeBarsExample() {
  const [makes, setMakes] = useState<string[]>(["Toyota"]);
  const [body, setBody] = useState<Body | null>(null);

  // Each count leaves its own filter out, so it says what picking that option would give.
  const makeOptions = MAKES.map((make) => ({ value: make, label: make, count: count([make], body) }));
  const bodyOptions = [{ value: null, label: "Any" }, ...BODIES.map((b) => ({ value: b, label: b, count: count(makes, b) }))];

  return (
    <div className="flex w-full max-w-[320px] flex-col gap-3">
      <FilterCard title="Make" summary={summaryOf(makes)} onClear={() => setMakes([])} defaultOpen>
        <BarList label="Make" noun="makes" options={makeOptions} value={makes} onChange={setMakes} countLabel={carCount} />
      </FilterCard>
      <FilterCard title="Body style" summary={body} onClear={() => setBody(null)} defaultOpen>
        <Segmented label="Body style" options={bodyOptions} value={body} onChange={setBody} countLabel={carCount} />
      </FilterCard>
      <p aria-live="polite" className="px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{count(makes, body)}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">{count(makes, body) === 1 ? "car" : "cars"}</span>
      </p>
    </div>
  );
}
