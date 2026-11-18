"use client";

import { useState } from "react";
import { CARS } from "@/registry/demo/cars";
import { carFormats, matchingCars, type CarFilters } from "@/registry/demo/cars-facets";
import { carVocabulary, carVocabularyFor } from "@/registry/demo/cars-vocabulary";
import { SentenceSearch } from "@/registry/filters/sentence-search";
import { readSentence } from "@/registry/lib/sentence";
import { SENTENCE_PRESET } from "@/components/tile/presets";
import { useStage, useStageStatus } from "@/components/stage/stage-controls";
import { StageCount } from "@/components/stage/stage-count";
import { ResetButton, StagePanel } from "@/components/stage/stage-panel";
import { longVocabulary } from "@/components/stage/long-names";

/** Sentences a visitor can try; none needs a place. The last one is misspelt on purpose. */
const SENTENCES = ["blue suv under 30k", "hybrid with 7 seats", "rav4 2020 or newer", "cheap truck", "telsa"];

const presetSentence = () => readSentence(carVocabulary, CARS, SENTENCE_PRESET).value;

export function SentenceStage() {
  const { locale } = useStage();
  const stage = useStageStatus();
  const { state, ...states } = stage;
  const local = carVocabularyFor(locale);
  const [filters, setFilters] = useState<CarFilters>(presetSentence);
  const [round, setRound] = useState(0);
  const [typed, setTyped] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const matches = matchingCars(filters).length;

  // Loading and errors show in the list, so switching to either opens it. The list the stage opened sits in the flow,
  // so it moves the count, Reset and the stage settings down instead of covering them. Its room stays while the state
  // does, or while it is open, so a press on a control below it, which closes it, does not pull that control away.
  const [shownState, setShownState] = useState(state);
  const [pushed, setPushed] = useState(false);
  if (state !== shownState) {
    setShownState(state);
    if (state === "loading" || state === "error") {
      setOpen(true);
      setPushed(true);
    }
  }
  if (pushed && !open && state !== "loading" && state !== "error") setPushed(false);

  const reset = () => {
    setFilters(presetSentence());
    setTyped(null);
    setOpen(false);
    setRound((n) => n + 1);
  };

  return (
    <StagePanel
      wide
      toolbar={
        <div role="group" aria-label="Try a sentence" className="flex min-w-0 items-start gap-x-1 ps-2 text-[14px] leading-5">
          <span className="me-1 flex h-9 shrink-0 items-center text-dim">Try:</span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-2">
            {SENTENCES.map((sentence) => (
              <button
                key={sentence}
                type="button"
                onClick={() => {
                  setFilters(carVocabulary.empty);
                  setTyped(sentence);
                  setOpen(true);
                  setRound((n) => n + 1);
                }}
                className="relative inline-flex h-9 cursor-pointer items-center whitespace-nowrap rounded-[10px] px-2 text-dim transition-[color,background-color] duration-200 ease-smooth hover:bg-wash hover:text-text pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1"
              >
                {sentence}
              </button>
            ))}
          </span>
        </div>
      }
    >
      {/* On phones the open list sits in the flow, so it grows the stage instead of covering the copy panel below. */}
      <div
        className={`mx-auto flex w-full max-w-[600px] flex-col pt-2 sm:pt-[clamp(8px,6vh,72px)] max-sm:[&_[data-state=open]:has(>[data-status-frame])]:static ${
          pushed ? "[&_[data-state]:has(>[data-status-frame])]:static" : ""
        }`}
      >
        <SentenceSearch
          key={round}
          vocabulary={state === "long-labels" ? longVocabulary(local) : local}
          items={CARS}
          value={filters}
          onChange={setFilters}
          label="Describe the car you want"
          countLabel={carFormats(locale).carCount}
          locale={locale}
          defaultText={typed ?? ""}
          open={open}
          onOpenChange={setOpen}
          autoFocus={typed !== null}
          {...states}
        />
        <div className="mt-3 flex items-center justify-between gap-3 ps-4">
          <StageCount matches={matches} total={CARS.length} stage={stage} live={false} />
          <ResetButton onReset={reset} className="-me-3" />
        </div>
      </div>
    </StagePanel>
  );
}
