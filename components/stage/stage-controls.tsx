"use client";

import { createContext, useContext, useId, useSyncExternalStore, type ReactNode } from "react";
import { specOf, type StageSpec } from "@/components/stage/stage-specs";

// The demo controls under every stage. Each control is one URL parameter (?dir=rtl&locale=de-DE), so a state can be
// linked and checked by a script. A new control adds a key to StageValues, an entry to CONTROLS and, when only some
// items take it, a field to StageSpec.

export const STAGE_LOCALES = ["en-US", "de-DE", "ar-EG"] as const;
/** Locales written right to left. */
const RTL_LOCALES = new Set<string>(["ar-EG"]);

export type StageValues = {
  dir: "ltr" | "rtl";
  locale: (typeof STAGE_LOCALES)[number];
};

/** What a stage hands an example's default export: only the values its spec takes. */
export type StageProps = { locale?: string };

type Control<K extends keyof StageValues = keyof StageValues> = {
  key: K;
  label: string;
  options: readonly { value: StageValues[K]; label: string }[];
  /** Left out: the control shows on every stage. */
  shownFor?: (spec: StageSpec) => boolean;
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
    shownFor: (spec) => spec.locale,
  },
];

export const STAGE_DEFAULTS: StageValues = { dir: "ltr", locale: "en-US" };

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

function setValue<K extends keyof StageValues>(key: K, value: StageValues[K]) {
  const url = new URL(window.location.href);
  if (value === STAGE_DEFAULTS[key]) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(CHANGED));
}

type Stage = { values: StageValues; spec: StageSpec };
const StageContext = createContext<Stage>({ values: STAGE_DEFAULTS, spec: { locale: false } });

/** Reads the stage controls from the URL and hands them to every stage below. */
export function StageControlsProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const values = valuesOf(useSyncExternalStore(subscribe, urlSearch, noSearch));
  return <StageContext.Provider value={{ values, spec: specOf(slug) }}>{children}</StageContext.Provider>;
}

/** The stage's current values. `locale` is en-US for an item whose spec does not take it. */
export function useStage(): StageValues {
  const { values, spec } = useContext(StageContext);
  return spec.locale ? values : { ...values, locale: STAGE_DEFAULTS.locale };
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

function ControlGroup<K extends keyof StageValues>({ control, value }: { control: Control<K>; value: StageValues[K] }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex items-center gap-0.5">
      <span id={id} className="me-1 text-dim max-sm:sr-only">
        {control.label}
      </span>
      {control.options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => setValue(control.key, option.value)}
            className={`${OPTION} ${on ? "text-text" : "text-dim hover:bg-wash hover:text-text"}`}
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
  const { values, spec } = useContext(StageContext);
  const shown = CONTROLS.filter((control) => !control.shownFor || control.shownFor(spec));
  return (
    <div role="group" aria-label="Stage settings" className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 px-3 pb-3 text-[13px] leading-5">
      {shown.map((control) => (
        <ControlGroup key={control.key} control={control} value={values[control.key]} />
      ))}
    </div>
  );
}
