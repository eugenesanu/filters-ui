"use client";

import type { ReactNode } from "react";
import { StageControlRow, useStageFrame } from "@/components/stage/stage-controls";

const RESET =
  "h-9 shrink-0 cursor-pointer rounded-[10px] px-3 text-[14px] font-medium leading-5 text-dim transition-[color,background-color] duration-200 ease-smooth hover:bg-wash hover:text-text";

export function ResetButton({ onReset, className }: { onReset: () => void; className?: string }) {
  return (
    <button type="button" onClick={onReset} className={className ? `${RESET} ${className}` : RESET}>
      Reset
    </button>
  );
}

/** The stage: its toolbar, the live component (in the direction and language the controls ask for) and the control row. */
export function StagePanel({ onReset, toolbar, children, wide = false }: { onReset?: () => void; toolbar?: ReactNode; children: ReactNode; wide?: boolean }) {
  const frame = useStageFrame();
  return (
    <section aria-label="Try it" className="relative flex h-full min-h-[360px] flex-col rounded-[24px] border border-card bg-panel">
      <div className="flex min-h-12 items-center justify-between gap-3 px-3 pt-3">
        {toolbar ?? <span />}
        {onReset && <ResetButton onReset={onReset} />}
      </div>
      <div {...frame} className={wide ? "flex-1 px-4 pt-2 sm:px-8" : "flex flex-1 flex-col items-center justify-center px-4 pb-1 pt-2 sm:pb-3"}>
        {children}
      </div>
      <StageControlRow />
    </section>
  );
}
