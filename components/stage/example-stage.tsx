"use client";

import { createElement, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { exampleOf } from "@/components/stage/example-of";
import { useStage, useStageProps } from "@/components/stage/stage-controls";
import { StagePanel } from "@/components/stage/stage-panel";
import { CascadingDropdownStateStage } from "@/components/stage/cascading-dropdown-stage";
import { BarListStateStage } from "@/components/stage/bar-list-stage";
import { DropdownStateStage, SelectStateStage } from "@/components/stage/basic-states";

/**
 * An item drawn by its own example shows Ready as the example; every other state of its State switch is drawn by a
 * state stage of its own, listed here (additions only). A state stage reads useStageStatus() and draws the real
 * component with the example's kind of data, or data from components/stage/state-data.ts. Once it has shown loading or
 * an error, the state stage also draws Ready until Reset, so Retry's return to Ready keeps the same component, its focus
 * and its fade-in; an item with those states must therefore have a state stage that draws Ready as the example does.
 */
const STATE_STAGES: Record<string, ComponentType> = {
  "cascading-dropdown": CascadingDropdownStateStage,
  "bar-list": BarListStateStage,
  dropdown: DropdownStateStage,
  select: SelectStateStage,
};

/** The first control a keyboard reaches in a box, leaving out disabled and inert ones. */
function firstFocusable(node: HTMLElement) {
  const all = node.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]");
  return [...all].find((el) => el.tabIndex >= 0 && !el.matches(":disabled") && !el.closest("[inert]")) ?? null;
}

export function ExampleStage({ slug }: { slug: string }) {
  const [round, setRound] = useState(0);
  const props = useStageProps();
  const { state } = useStage();
  const [kept, setKept] = useState(false);
  if ((state === "loading" || state === "error") && !kept) setKept(true);
  const stateStage = state === "ready" && !kept ? undefined : STATE_STAGES[slug];

  // A switch between Ready (the example) and another state (its state stage) replaces the component. When that takes
  // away the control that had focus, focus moves into the new one: to its status frame while it loads, fails or is off,
  // else to its first control, else to this box. It is never left on the page.
  const live = useRef<HTMLDivElement>(null);
  const drawn = useRef(stateStage);
  const focusWasInside = useRef(false);
  if (stateStage !== drawn.current && typeof document !== "undefined") {
    focusWasInside.current = !!live.current?.contains(document.activeElement);
  }
  useLayoutEffect(() => {
    if (drawn.current === stateStage) return;
    drawn.current = stateStage;
    const node = live.current;
    if (!focusWasInside.current || !node || node.contains(document.activeElement)) return;
    focusWasInside.current = false;
    const first = firstFocusable(node);
    const frame = node.querySelector<HTMLElement>("[data-status-frame]");
    const target = frame && (frame.dataset.status !== "ready" || !first) ? frame : (first ?? node);
    target.focus({ preventScroll: true });
  });

  return (
    <StagePanel
      onReset={() => {
        setRound((n) => n + 1);
        setKept(false);
      }}
    >
      <div ref={live} tabIndex={-1} className="flex w-full flex-col items-center rounded-[16px]">
        {stateStage ? createElement(stateStage, { key: round }) : createElement(exampleOf(slug), { key: round, ...props })}
      </div>
    </StagePanel>
  );
}
