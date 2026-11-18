"use client";

import { useEffect, useRef, useState } from "react";
import { CarsBoard } from "@/registry/blocks/cars-board";
import { formatsFor } from "@/registry/lib/format";
import { useStage, useStageStatus } from "@/components/stage/stage-controls";
import { StagePanel } from "@/components/stage/stage-panel";

export function BoardStage() {
  const { locale } = useStage();
  const { state, ...states } = useStageStatus();
  const n = formatsFor(locale).number;
  const [round, setRound] = useState(0);
  const [away, setAway] = useState(false);
  const frame = useRef<HTMLDivElement>(null);

  // The board pins its Show bar to the window on phones, and on wider screens once its head scrolls away. Here the copy
  // panel sits under the stage, so the bar shows on phones only (below 640px, where the head hides its buttons) and
  // never once the stage is out of view.
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setAway(!entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const [shown, setShown] = useState<number | null>(null);
  return (
    // Menus carry data-state and .fixed too, but they are popovers.
    <div
      ref={frame}
      data-away={away || undefined}
      className="h-full sm:[&_.fixed[data-state]:not([popover])]:hidden data-[away]:[&_.fixed[data-state]:not([popover])]:hidden"
    >
    <StagePanel
      wide
      onReset={() => {
        setRound((n) => n + 1);
        setShown(null);
      }}
    >
      <CarsBoard
        key={round}
        className="mx-auto max-w-[929px]"
        defaultOpen={["price", "body", "make"]}
        onShow={(cars) => setShown(cars.length)}
        locale={locale}
        {...states}
      />
      <p aria-live="polite" className="mx-auto mt-6 h-5 max-w-[929px] text-[14px] leading-5 text-dim">
        {shown !== null && <>{n(shown)} {shown === 1 ? "car" : "cars"} sent to onShow</>}
      </p>
    </StagePanel>
    </div>
  );
}
