"use client";

import { useState } from "react";
import { useStage, useStageStatus, useUnpickedAtZero } from "@/components/stage/stage-controls";
import { MAKE_STATES, optionsInState } from "@/components/stage/state-data";
import { BarList } from "@/registry/filters/bar-list";
import { formatsFor } from "@/registry/lib/format";
import { FilterCard } from "@/registry/ui/filter-card";
import { Segmented } from "@/registry/ui/segmented";
import { Skeleton } from "@/registry/ui/skeleton";

type Body = "SUV" | "Sedan" | "Truck";

// The example's stock (registry/examples/bar-list.tsx), so every state draws the cards Ready shows.
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

const count = (makes: string[], body: Body | null) =>
  (makes.length ? makes.filter((make) => make in STOCK) : MAKES).reduce(
    (n, make) => n + BODIES.reduce((m, b) => m + (body === null || body === b ? STOCK[make][b] : 0), 0),
    0,
  );

const summaryOf = (makes: string[]) =>
  makes.length === 0 ? null : makes.length <= 2 ? makes.join(", ") : `${makes.slice(0, 2).join(", ")} +${makes.length - 2}`;

/** The Make and Body style cards in the State switch's state, with the example's data; the bar list takes the state. */
export function BarListStateStage() {
  const { locale } = useStage();
  const { state, ...stage } = useStageStatus();
  const { number } = formatsFor(locale);
  const carCount = (n: number) => (n === 1 ? "1 car" : `${number(n)} cars`);
  const [makes, setMakes] = useState<string[]>(["Toyota"]);
  const [body, setBody] = useState<Body | null>(null);
  useUnpickedAtZero<string[]>(state, makes, setMakes, () => []);
  // Nothing to count from in these two states, so the body style counts and the result are 0 as well.
  const none = state === "empty" || state === "zero-results";

  const makeOptions = optionsInState(
    state,
    MAKES.map((make) => ({ value: make, label: make, count: count([make], body) })),
    MAKE_STATES,
  );
  const bodyOptions = [{ value: null, label: "Any" }, ...BODIES.map((b) => ({ value: b, label: b, count: none ? 0 : count(makes, b) }))];
  const results = none ? 0 : count(makes, body);

  return (
    <div className="flex w-full max-w-[320px] flex-col gap-3">
      <FilterCard title="Make" summary={summaryOf(makes)} onClear={stage.disabled ? undefined : () => setMakes([])} defaultOpen>
        <BarList label="Make" noun="makes" options={makeOptions} value={makes} onChange={setMakes} countLabel={carCount} locale={locale} {...stage} />
      </FilterCard>
      <FilterCard title="Body style" summary={body} onClear={() => setBody(null)} defaultOpen>
        <Segmented label="Body style" options={bodyOptions} value={body} onChange={setBody} countLabel={carCount} locale={locale} />
      </FilterCard>
      <p aria-live="polite" className="px-4 text-[14px] leading-5 tabular-nums">
        {stage.status === "loading" ? (
          <Skeleton className="inline-block h-3 w-5 rounded-[4px] align-[-1px]" />
        ) : (
          <span className="font-medium">{number(results)}</span>
        )}{" "}
        <span className="text-dim">{results === 1 ? "car" : "cars"}</span>
      </p>
    </div>
  );
}
