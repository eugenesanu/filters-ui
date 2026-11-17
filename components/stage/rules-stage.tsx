"use client";

import { useState } from "react";
import { StageControlRow, useStage, useStageFrame } from "@/components/stage/stage-controls";
import { formatsFor } from "@/registry/lib/format";
import { BODIES, CARS, COLORS, DRIVES, FUELS, MAKES, THIS_YEAR, TRANSMISSIONS, type Car } from "@/registry/demo/cars";
import { carFormats } from "@/registry/demo/cars-facets";
import { Rules, matchRules, type RuleField, type RuleSet } from "@/registry/filters/rules";
import { TextSwap } from "@/registry/ui/text-swap";

/** The demo cars' rule fields; kilometres follow the locale. */
export const carRuleFields = (locale?: string): RuleField<Car>[] => [
  { key: "price", label: "Price", kind: "number", get: (car) => car.price, prefix: "$" },
  { key: "fuel", label: "Fuel", kind: "list", get: (car) => car.fuel, options: FUELS },
  { key: "seats", label: "Seats", kind: "step", get: (car) => car.seats, steps: [2, 4, 5, 6, 7, 8] },
  { key: "body", label: "Body style", kind: "list", get: (car) => car.body, options: BODIES },
  { key: "year", label: "Year", kind: "step", get: (car) => car.year, steps: Array.from({ length: 10 }, (_, i) => THIS_YEAR - i) },
  { key: "km", label: "Kilometres", kind: "number", get: (car) => car.km, format: carFormats(locale).km },
  { key: "make", label: "Make", kind: "list", get: (car) => car.make, options: MAKES },
  { key: "color", label: "Colour", kind: "list", get: (car) => car.color, options: COLORS },
  { key: "drive", label: "Drivetrain", kind: "list", get: (car) => car.drive, options: DRIVES },
  { key: "transmission", label: "Transmission", kind: "list", get: (car) => car.transmission, options: TRANSMISSIONS },
];

export const CAR_RULE_FIELDS = carRuleFields();

/** What the page opens with: a budget, two fuels, then seven seats or an SUV. */
export const CAR_RULES: RuleSet = {
  join: "and",
  items: [
    { id: "price", field: "price", op: "atMost", value: 45000 },
    { id: "fuel", field: "fuel", op: "anyOf", value: ["Hybrid", "Electric"] },
    {
      id: "room",
      join: "or",
      rules: [
        { id: "seats", field: "seats", op: "atLeast", value: 7 },
        { id: "body", field: "body", op: "anyOf", value: ["SUV"] },
      ],
    },
  ],
};

/** The rules on the 256 demo cars, with the count under them and Reset. */
export function RulesStage() {
  const frame = useStageFrame();
  const { locale } = useStage();
  const f = carFormats(locale);
  const n = formatsFor(locale).number;
  const [rules, setRules] = useState(CAR_RULES);
  const [round, setRound] = useState(0);
  const fields = carRuleFields(locale);
  const matches = CARS.filter((car) => matchRules(car, rules, fields)).length;

  return (
    <section aria-label="Try it" className="relative flex h-full min-h-[360px] flex-col rounded-[24px] border border-card bg-panel">
      <div className="flex min-h-12 items-center justify-end gap-3 px-3 pt-3">
        <button
          type="button"
          onClick={() => {
            setRules(CAR_RULES);
            setRound((n) => n + 1);
          }}
          className="h-9 shrink-0 cursor-pointer rounded-[10px] px-3 text-[14px] font-medium leading-5 text-dim transition-[color,background-color] duration-200 ease-smooth hover:bg-wash hover:text-text"
        >
          Reset
        </button>
      </div>
      <div {...frame} className="flex-1 px-4 pb-0 pt-2 sm:px-6 sm:pt-6">
        <div className="mx-auto w-full max-w-[640px]">
          <Rules locale={locale} key={round} fields={fields} items={CARS} value={rules} onChange={setRules} label="Car rules" countLabel={f.carCount} leftLabel="Cars left" />
          <p className="mt-5 ps-11 text-[14px] leading-5 text-dim tabular-nums">
            <TextSwap className="font-medium text-text">{n(matches)}</TextSwap> of {n(CARS.length)} cars
          </p>
        </div>
      </div>
      <StageControlRow />
    </section>
  );
}
