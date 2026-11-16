"use client";

import { useState, type ReactNode } from "react";
import { CARS } from "@/registry/demo/cars";
import { EMPTY_CAR_FILTERS, PRICE_MAX, PRICE_MIN, PRICE_STEP, formatMoney, matchingCars, priceBuckets, summaryOf } from "@/registry/demo/cars-facets";
import { Budget, budgetRange, type BudgetValue } from "@/registry/filters/budget";
import { FilterCard } from "@/registry/ui/filter-card";
import { TextSwap } from "@/registry/ui/text-swap";

const count = new Intl.NumberFormat("en-US");

/** An example rate for the estimate, shown as one on the card. */
export const BUDGET_RATE = 6.9;
/** The stage opens as the tile shows it: $450 a month over 60 months with $3,000 down. */
export const BUDGET_PRESET: BudgetValue = { by: "monthly", monthly: 450, term: 60, down: 3000 };

/** The Budget card on the demo cars, with the result count and a Reset under it. */
export function BudgetDemo({ reset }: { reset: ReactNode }) {
  const [budget, setBudget] = useState<BudgetValue>(BUDGET_PRESET);
  const [open, setOpen] = useState(true);
  const [priceMin, priceMax] = budgetRange(budget, BUDGET_RATE);
  const filters = { ...EMPTY_CAR_FILTERS, priceMin, priceMax };
  const matches = matchingCars(filters).length;
  const summary =
    budget.by === "monthly" ? (budget.monthly === null ? null : `${formatMoney(budget.monthly)} a month`) : summaryOf(filters, "price");

  return (
    <div className="flex w-full max-w-[320px] flex-col">
      <FilterCard
        title="Budget"
        summary={summary}
        onClear={() => setBudget(budget.by === "total" ? { by: "total", range: [null, null] } : { ...budget, monthly: null })}
        open={open}
        onOpenChange={setOpen}
        headingLevel={2}
      >
        <Budget
          value={budget}
          onChange={setBudget}
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          buckets={priceBuckets(EMPTY_CAR_FILTERS)}
          rate={BUDGET_RATE}
          format={formatMoney}
        />
      </FilterCard>
      <div className="mt-3 flex items-center justify-between gap-3 pl-4">
        <p className="text-[14px] leading-5 text-dim tabular-nums">
          <TextSwap className="font-medium text-text">{count.format(matches)}</TextSwap> of {count.format(CARS.length)} cars
        </p>
        {reset}
      </div>
    </div>
  );
}
