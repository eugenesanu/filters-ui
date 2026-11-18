"use client";

import { useState } from "react";
import { FilterPanel } from "@/registry/blocks/filter-panel";
import { formatsFor } from "@/registry/lib/format";
import { PANEL_PRESET } from "@/components/tile/presets";
import { useStage, useStageStatus } from "@/components/stage/stage-controls";
import { StagePanel } from "@/components/stage/stage-panel";

export function PanelStage() {
  const { locale } = useStage();
  const { state, ...states } = useStageStatus();
  const [round, setRound] = useState(0);
  const [shown, setShown] = useState<number | null>(null);
  return (
    <StagePanel
      onReset={() => {
        setRound((n) => n + 1);
        setShown(null);
      }}
    >
      <div className="flex w-full max-w-[400px] flex-col">
        <FilterPanel
          key={round}
          className="h-[min(860px,calc(100dvh-120px))] min-h-[600px]"
          defaultFilters={PANEL_PRESET.filters}
          defaultOpen={PANEL_PRESET.open}
          onShow={(cars) => setShown(cars.length)}
          locale={locale}
          {...states}
        />
        <p aria-live="polite" className="mt-3 h-5 ps-5 text-[14px] leading-5 text-dim tabular-nums">
          {shown !== null && <>{formatsFor(locale).number(shown)} {shown === 1 ? "car" : "cars"} sent to onShow</>}
        </p>
      </div>
    </StagePanel>
  );
}
