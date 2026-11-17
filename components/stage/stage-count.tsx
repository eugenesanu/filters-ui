"use client";

import { useStage, type StageStatus } from "@/components/stage/stage-controls";
import { formatsFor } from "@/registry/lib/format";
import { Skeleton } from "@/registry/ui/skeleton";
import { TextSwap } from "@/registry/ui/text-swap";

/** The result count under a stage's card: a placeholder while the State switch says loading, 0 when nothing can match. */
export function StageCount({
  matches,
  total,
  stage,
  noun = "cars",
  live = true,
}: {
  matches: number;
  total: number;
  stage: StageStatus;
  noun?: string;
  /** Reads changes out. Off where the filter announces its own result. */
  live?: boolean;
}) {
  const { locale } = useStage();
  const n = formatsFor(locale).number;
  const none = stage.state === "empty" || stage.state === "zero-results";
  return (
    <p aria-live={live ? "polite" : undefined} className="text-[14px] leading-5 text-dim tabular-nums">
      {stage.status === "loading" ? (
        <Skeleton className="inline-block h-3 w-6 rounded-[4px] align-[-1px]" />
      ) : (
        <TextSwap className="font-medium text-text">{n(none ? 0 : matches)}</TextSwap>
      )}{" "}
      of {n(total)} {noun}
    </p>
  );
}

