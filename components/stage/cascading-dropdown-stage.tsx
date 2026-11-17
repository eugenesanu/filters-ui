"use client";

import { useState } from "react";
import { useStage, useStageStatus } from "@/components/stage/stage-controls";
import { MAKE_STATES, optionsInState, type Counted } from "@/components/stage/state-data";
import { CascadingDropdown, type CascadeOption } from "@/registry/filters/cascading-dropdown";
import { formatsFor } from "@/registry/lib/format";
import { FilterCard } from "@/registry/ui/filter-card";
import { Skeleton } from "@/registry/ui/skeleton";

// The example's stock (registry/examples/cascading-dropdown.tsx), so every state draws the card Ready shows.
const STOCK: Record<string, Record<string, number>> = {
  Toyota: { RAV4: 11, Corolla: 7, Camry: 5, Tacoma: 3 },
  Honda: { Civic: 9, "CR-V": 8, Accord: 4 },
  Ford: { "F-150": 10, Escape: 5, Mustang: 2 },
  Tesla: { "Model Y": 6, "Model 3": 5 },
  Hyundai: { Tucson: 6, "Ioniq 5": 3 },
  Kia: { Sportage: 5, EV6: 4 },
  Mazda: { "CX-5": 6, "MX-5": 1 },
  Subaru: { Outback: 4, Forester: 3 },
};

const OPTIONS: Counted[] = Object.entries(STOCK).map(([make, models]) => ({
  value: make,
  label: make,
  count: Object.values(models).reduce((a, b) => a + b, 0),
  children: Object.entries(models).map(([model, count]) => ({ value: model, label: model, count })),
}));

type Pick = [string | null, string | null];

/** The Make and model card in the State switch's state, with the example's data. */
export function CascadingDropdownStateStage() {
  const { locale } = useStage();
  const { state, ...stage } = useStageStatus();
  const { number } = formatsFor(locale);
  const carCount = (n: number) => (n === 1 ? "1 car" : `${number(n)} cars`);
  const [pick, setPick] = useState<Pick>(["Toyota", null]);
  const [make, model] = pick;
  const options: CascadeOption[] = optionsInState(state, OPTIONS, MAKE_STATES).map((option) => ({ ...option, children: option.children ?? [] }));
  const parent = options.find((option) => option.value === make);
  const results =
    make === null
      ? options.reduce((n, option) => n + option.count, 0)
      : model === null
        ? (parent?.count ?? 0)
        : (parent?.children.find((child) => child.value === model)?.count ?? 0);

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Make and model"
        summary={make && (model ? `${make} ${model}` : make)}
        onClear={stage.disabled ? undefined : () => setPick([null, null])}
        defaultOpen
      >
        <CascadingDropdown
          options={options}
          value={pick}
          onChange={setPick}
          labels={{ first: "Make", second: "Model" }}
          anyLabels={{ first: "Any make", second: "Any model" }}
          waitingText="Pick a make first"
          secondHeading={(first) => `${first.label} models`}
          popularLabel="Popular"
          countLabel={carCount}
          locale={locale}
          errorText="Couldn't load the makes."
          emptyText="No makes to show."
          {...stage}
        />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
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
