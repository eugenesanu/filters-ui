"use client";

import { CAR_RULE_FIELDS, CAR_RULES } from "@/components/stage/rules-stage";
import { CARS } from "@/registry/demo/cars";
import { formatCarCount } from "@/registry/demo/cars-facets";
import { Rules } from "@/registry/filters/rules";

// A still is never pressed.
const still = () => {};

/** The rules page's opening set: a budget, two fuels, then a group. Wider than the home tile, so each rule sits on one line. */
export function RulesBox() {
  return <Rules fields={CAR_RULE_FIELDS} items={CARS} value={CAR_RULES} onChange={still} label="Car rules" countLabel={formatCarCount} />;
}
