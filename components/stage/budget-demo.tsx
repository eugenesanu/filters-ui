"use client";

import { useState, type ReactNode } from "react";
import { useStage, useStageStatus } from "@/components/stage/stage-controls";
import { StageCount } from "@/components/stage/stage-count";
import { bucketsInState } from "@/components/stage/state-data";
import { CARS } from "@/registry/demo/cars";
import { EMPTY_CAR_FILTERS, carFormats, PRICE_MAX, PRICE_MIN, PRICE_STEP, matchingCars, priceBuckets, summaryOf } from "@/registry/demo/cars-facets";
import { Budget, budgetRange, type BudgetValue } from "@/registry/filters/budget";
import { FilterCard } from "@/registry/ui/filter-card";

/** An example rate for the estimate, shown as one on the card. */
export const BUDGET_RATE = 6.9;
/** The stage opens as the tile shows it: $450 a month over 60 months with $3,000 down. */
export const BUDGET_PRESET: BudgetValue = { by: "monthly", monthly: 450, term: 60, down: 3000 };

/** The Budget card on the demo cars, in the State switch's state, with the result count and a Reset under it. */
export function BudgetDemo({ reset }: { reset: ReactNode }) {
  const { locale } = useStage();
  const { state, ...stage } = useStageStatus();
  const f = carFormats(locale);
  const [budget, setBudget] = useState<BudgetValue>(BUDGET_PRESET);
  const [open, setOpen] = useState(true);
  const [priceMin, priceMax] = budgetRange(budget, BUDGET_RATE);
  const filters = { ...EMPTY_CAR_FILTERS, priceMin, priceMax };
  const matches = matchingCars(filters).length;
  const summary =
    budget.by === "monthly" ? (budget.monthly === null ? null : `${f.money(budget.monthly)} a month`) : summaryOf(filters, "price", locale);

  return (
    <div className="flex w-full max-w-[320px] flex-col">
      <FilterCard
        title="Budget"
        summary={summary}
        onClear={stage.disabled ? undefined : () => setBudget(budget.by === "total" ? { by: "total", range: [null, null] } : { ...budget, monthly: null })}
        open={open}
        onOpenChange={setOpen}
        headingLevel={2}
      >
        <Budget
          locale={locale}
          value={budget}
          onChange={setBudget}
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          buckets={bucketsInState(state, priceBuckets(EMPTY_CAR_FILTERS))}
          rate={BUDGET_RATE}
          format={f.money}
          {...stage}
        />
      </FilterCard>
      <div className="mt-3 flex items-center justify-between gap-3 ps-4">
        <StageCount matches={matches} total={CARS.length} stage={{ state, ...stage }} live={false} />
        {reset}
      </div>
    </div>
  );
}
