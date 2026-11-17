"use client";

import { useState } from "react";
import { StageControlRow, useStage, useStageFrame, useStageStatus } from "@/components/stage/stage-controls";
import { StageCount } from "@/components/stage/stage-count";
import { LONG_NAMES } from "@/components/stage/long-names";
import { BODIES, CARS, COLORS, DRIVES, FUELS, MAKES, THIS_YEAR, TRANSMISSIONS, type Car } from "@/registry/demo/cars";
import { carFormats } from "@/registry/demo/cars-facets";
import { Rules, isGroup, matchRules, type Rule, type RuleField, type RuleSet } from "@/registry/filters/rules";
import type { ItemState } from "@/registry/items";

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

/** Field names for the long-labels state, by key. */
const LONG_FIELDS: Readonly<Record<string, string>> = {
  price: "Price with taxes, fees and delivery",
  fuel: "Fuel or energy source",
  seats: "Seats, the driver's included",
  body: "Body style and size class",
  year: "Model year",
  km: "Kilometres on the odometer",
  color: "Exterior paint colour",
  drive: "Drivetrain",
};

const longName = (name: string) => LONG_NAMES[name] ?? name;

/** The fields with long names, and long names for the fuels, body styles, colours and drivetrains they hold. */
const longFields = (fields: RuleField<Car>[]): RuleField<Car>[] =>
  fields.map((field) => {
    const label = LONG_FIELDS[field.key] ?? field.label;
    if (field.kind !== "list") return { ...field, label };
    return { ...field, label, get: (car: Car) => { const has = field.get(car); return has === null ? null : longName(has); }, options: field.options.map(longName) };
  });

const longRule = (rule: Rule): Rule => (Array.isArray(rule.value) ? { ...rule, value: (rule.value as readonly string[]).map(longName) } : rule);

/** The opening rules with the long names in their lists. */
const LONG_RULES: RuleSet = {
  ...CAR_RULES,
  items: CAR_RULES.items.map((item) => (isGroup(item) ? { ...item, rules: item.rules.map(longRule) } : longRule(item))),
};

/** Twelve rules in two groups, for a long column. */
const MANY_RULES: RuleSet = {
  join: "and",
  items: [
    { id: "price", field: "price", op: "atMost", value: 60000 },
    { id: "fuel", field: "fuel", op: "anyOf", value: ["Gas", "Hybrid", "Electric"] },
    {
      id: "room",
      join: "or",
      rules: [
        { id: "seats", field: "seats", op: "atLeast", value: 5 },
        { id: "body", field: "body", op: "anyOf", value: ["SUV", "Minivan"] },
      ],
    },
    { id: "year", field: "year", op: "atLeast", value: 2018 },
    { id: "km", field: "km", op: "atMost", value: 120000 },
    { id: "make", field: "make", op: "noneOf", value: ["Jeep"] },
    { id: "color", field: "color", op: "noneOf", value: ["Brown"] },
    {
      id: "grip",
      join: "or",
      rules: [
        { id: "drive", field: "drive", op: "anyOf", value: ["AWD", "4WD", "FWD"] },
        { id: "transmission", field: "transmission", op: "anyOf", value: ["Automatic"] },
      ],
    },
    { id: "price-low", field: "price", op: "atLeast", value: 10000 },
    { id: "body-not", field: "body", op: "noneOf", value: ["Van"] },
  ],
};

/** The rules a state starts from: long names, twelve rules, or the opening set. */
const rulesIn = (state: ItemState) => (state === "long-labels" ? LONG_RULES : state === "many-options" ? MANY_RULES : CAR_RULES);

/** The rules on the 256 demo cars, with the count under them and Reset. */
export function RulesStage() {
  const frame = useStageFrame();
  const { locale } = useStage();
  const stage = useStageStatus();
  const { state, ...states } = stage;
  const f = carFormats(locale);
  const [rules, setRules] = useState(CAR_RULES);
  const [round, setRound] = useState(0);
  const local = carRuleFields(locale);
  const fields = state === "long-labels" ? longFields(local) : local;
  const matches = CARS.filter((car) => matchRules(car, rules, fields)).length;

  // Long labels and many options bring their own rules; the other states keep the rules as they are.
  const data = (s: ItemState) => (s === "long-labels" || s === "many-options" ? s : "ready");
  const [shown, setShown] = useState(data(state));
  if (data(state) !== shown) {
    setShown(data(state));
    setRules(rulesIn(state));
  }

  return (
    <section aria-label="Try it" className="relative flex h-full min-h-[360px] flex-col rounded-[24px] border border-card bg-panel">
      <div className="flex min-h-12 items-center justify-end gap-3 px-3 pt-3">
        <button
          type="button"
          onClick={() => {
            setRules(rulesIn(state));
            setRound((n) => n + 1);
          }}
          className="h-9 shrink-0 cursor-pointer rounded-[10px] px-3 text-[14px] font-medium leading-5 text-dim transition-[color,background-color] duration-200 ease-smooth hover:bg-wash hover:text-text"
        >
          Reset
        </button>
      </div>
      <div {...frame} className="flex-1 px-4 pb-0 pt-2 sm:px-6 sm:pt-6">
        <div className="mx-auto w-full max-w-[640px]">
          <Rules locale={locale} key={round} fields={fields} items={CARS} value={rules} onChange={setRules} label="Car rules" countLabel={f.carCount} {...states} />
          <div className="mt-5 ps-11">
            <StageCount matches={matches} total={CARS.length} stage={stage} live={false} />
          </div>
        </div>
      </div>
      <StageControlRow />
    </section>
  );
}
