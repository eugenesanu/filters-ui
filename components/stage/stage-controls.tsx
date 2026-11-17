"use client";

import { createContext, useContext, useId, useSyncExternalStore, type ReactNode } from "react";
import { specOf, type StageSpec } from "@/components/stage/stage-specs";
import type { ItemState } from "@/registry/items";
import type { Status } from "@/registry/ui/status-frame";

// The demo controls under every stage. Each control is one URL parameter (?dir=rtl&locale=de-DE&state=loading), so a
// state can be linked and checked by a script. A new control adds a key to StageValues, an entry to CONTROLS and, when
// only some items take it, a field to StageSpec. The State control offers the states in the item's own `states` list
// (registry/items.ts), which the page hands to StageControlsProvider.

export const STAGE_LOCALES = ["en-US", "de-DE", "ar-EG"] as const;
/** Locales written right to left. */
const RTL_LOCALES = new Set<string>(["ar-EG"]);

export type StageValues = {
  dir: "ltr" | "rtl";
  locale: (typeof STAGE_LOCALES)[number];
  state: ItemState;
};

/** The State switch's words, in the order of ITEM_STATES. */
const STATE_LABELS = {
  ready: "Ready",
  loading: "Loading",
  error: "Error",
  empty: "Empty",
  "zero-results": "Zero results",
  disabled: "Disabled",
  "long-labels": "Long labels",
  "many-options": "Many options",
} as const satisfies Record<ItemState, string>;

/** What a stage hands an example's default export: only the values its spec takes. */
export type StageProps = { locale?: string };

/** What a stage knows about its item: its spec, and the states it supports. */
type ItemStage = { spec: StageSpec; states: readonly ItemState[] };

type Control<K extends keyof StageValues = keyof StageValues> = {
  key: K;
  label: string;
  options: readonly { value: StageValues[K]; label: string }[];
  /** Left out: the control shows on every stage. */
  shownFor?: (item: ItemStage) => boolean;
  /** Left out: every option shows. */
  offers?: (item: ItemStage, value: string) => boolean;
};

const CONTROLS: Control[] = [
  {
    key: "dir",
    label: "Direction",
    options: [
      { value: "ltr", label: "LTR" },
      { value: "rtl", label: "RTL" },
    ],
  },
  {
    key: "locale",
    label: "Locale",
    options: STAGE_LOCALES.map((value) => ({ value, label: value })),
    shownFor: (item) => item.spec.locale,
  },
  {
    key: "state",
    label: "State",
    options: (Object.keys(STATE_LABELS) as ItemState[]).map((value) => ({ value, label: STATE_LABELS[value] })),
    shownFor: (item) => item.states.length > 1,
    offers: (item, value) => item.states.includes(value as ItemState),
  },
];

export const STAGE_DEFAULTS: StageValues = { dir: "ltr", locale: "en-US", state: "ready" };

// The page is prerendered with the defaults; the URL is read once React hydrates, so the server's HTML always matches.
const CHANGED = "fu-stage-change";
const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
};
const urlSearch = () => window.location.search;
const noSearch = () => "";

let lastSearch = "";
let lastValues = STAGE_DEFAULTS;
function valuesOf(search: string): StageValues {
  if (search === lastSearch) return lastValues;
  const params = new URLSearchParams(search);
  const values = { ...STAGE_DEFAULTS };
  for (const control of CONTROLS) {
    const option = control.options.find((o) => o.value === params.get(control.key));
    if (option) Object.assign(values, { [control.key]: option.value });
  }
  lastSearch = search;
  lastValues = values;
  return values;
}

// A Retry in the demo loads for a moment and then shows the data, as a real fetch would. One stage per page.
const RETRY_MS = 1200;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function setValue<K extends keyof StageValues>(key: K, value: StageValues[K]) {
  if (key === "state") clearTimeout(retryTimer);
  const url = new URL(window.location.href);
  if (value === STAGE_DEFAULTS[key]) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(CHANGED));
}

function retry() {
  setValue("state", "loading");
  retryTimer = setTimeout(() => setValue("state", "ready"), RETRY_MS);
}

type Stage = ItemStage & { values: StageValues };
const StageContext = createContext<Stage>({ values: STAGE_DEFAULTS, spec: { locale: false }, states: ["ready"] });

/** Reads the stage controls from the URL and hands them to every stage below. `states` is the item's own list. */
export function StageControlsProvider({ slug, states, children }: { slug: string; states: readonly ItemState[]; children: ReactNode }) {
  const values = valuesOf(useSyncExternalStore(subscribe, urlSearch, noSearch));
  return <StageContext.Provider value={{ values, spec: specOf(slug), states }}>{children}</StageContext.Provider>;
}

/**
 * The stage's current values. `locale` is en-US for an item whose spec does not take it, and `state` is "ready" for
 * a state the item does not list.
 */
export function useStage(): StageValues {
  const { values, spec, states } = useContext(StageContext);
  return {
    ...values,
    locale: spec.locale ? values.locale : STAGE_DEFAULTS.locale,
    state: states.includes(values.state) ? values.state : STAGE_DEFAULTS.state,
  };
}

/** The stage's State switch as props: `status`, `disabled` and `onRetry` go straight onto the component. */
export type StageStatus = { state: ItemState; status: Status; disabled: boolean; onRetry: () => void };

/**
 * The State switch as the props every item takes. Retry here loads for a moment and then shows the data. The data
 * states (empty, zero-results, long-labels, many-options) are left to the stage, which passes other data
 * (components/stage/state-data.ts).
 */
export function useStageStatus(): StageStatus {
  const { state } = useStage();
  return {
    state,
    status: state === "loading" ? "loading" : state === "error" ? "error" : "ready",
    disabled: state === "disabled",
    onRetry: retry,
  };
}

/** The props an example's default export gets from its stage. */
export function useStageProps(): StageProps {
  const { values, spec } = useContext(StageContext);
  return spec.locale ? { locale: values.locale } : {};
}

/**
 * Attributes for the element that holds the live component: only what differs from the page. Tailwind's rtl: variant
 * also takes lang="ar" as right to left, so a left-to-right stage leaves a right-to-left language's lang off.
 */
export function useStageFrame(): { dir?: "rtl" | "ltr"; lang?: string } {
  const { dir, locale } = useStage();
  const lang = locale === STAGE_DEFAULTS.locale || (dir === "ltr" && RTL_LOCALES.has(locale)) ? undefined : locale;
  return { dir: dir === "rtl" ? "rtl" : undefined, lang };
}

const OPTION =
  "relative inline-flex h-8 cursor-pointer items-center rounded-[8px] px-2 transition-[color,background-color,scale] duration-200 ease-smooth active:scale-[0.96] active:duration-75 motion-reduce:transition-none pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1.5";

function ControlGroup<K extends keyof StageValues>({ control, value, item }: { control: Control<K>; value: StageValues[K]; item: ItemStage }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex flex-wrap items-center gap-0.5">
      <span id={id} className="me-1 text-dim max-sm:sr-only">
        {control.label}
      </span>
      {control.options.filter((option) => !control.offers || control.offers(item, option.value)).map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => setValue(control.key, option.value)}
            className={`${OPTION} ${on ? "bg-wash text-text" : "text-dim hover:bg-wash hover:text-text"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** The demo control row at the foot of a stage: small and quiet, so it never reads as part of the component. */
export function StageControlRow() {
  const { spec, states } = useContext(StageContext);
  const values = useStage();
  const item = { spec, states };
  const shown = CONTROLS.filter((control) => !control.shownFor || control.shownFor(item));
  return (
    <div role="group" aria-label="Stage settings" className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 pb-3 text-[13px] leading-5">
      {shown.map((control) => (
        <ControlGroup key={control.key} control={control} value={values[control.key]} item={item} />
      ))}
    </div>
  );
}
