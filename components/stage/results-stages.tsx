"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from "react";
import { StageControlRow, useStage, useStageFrame } from "@/components/stage/stage-controls";
import { formatsFor } from "@/registry/lib/format";
import { CARS, type Car } from "@/registry/demo/cars";
import {
  CAR_FACET_TITLES,
  carFormats,
  EMPTY_CAR_FILTERS,
  clearFacet,
  matchingCars,
  summaryOf,
  type CarFacet,
  type CarFilters,
} from "@/registry/demo/cars-facets";
import { AppliedFilters, type AppliedFilter } from "@/registry/filters/applied-filters";
import { NoResults } from "@/registry/filters/no-results";
import { CheckIcon, PlusIcon } from "@/registry/ui/icons";
import { TextSwap } from "@/registry/ui/text-swap";
import { carMatches, carRelax } from "@/components/stage/car-relax";

const CAR_NOUN = { one: "car", other: "cars" };

/** The order chips take in the row, whatever order the filters were set in. */
const CHIP_ORDER: CarFacet[] = ["price", "year", "km", "condition", "make", "body", "fuel", "drive", "transmission", "color", "seats"];

const chipsOf = (f: CarFilters, locale?: string): AppliedFilter[] =>
  CHIP_ORDER.flatMap((facet) => {
    const value = summaryOf(f, facet, locale);
    return value === null ? [] : [{ key: facet, label: CAR_FACET_TITLES[facet], value }];
  });

const RESET =
  "h-9 shrink-0 cursor-pointer rounded-[10px] px-3 text-[14px] font-medium leading-5 text-dim transition-[color,background-color] duration-200 ease-smooth hover:bg-wash hover:text-text";
const TRY =
  "relative inline-flex h-9 cursor-pointer items-center whitespace-nowrap rounded-[10px] px-2 transition-[color,background-color] duration-200 ease-smooth hover:bg-wash hover:text-text pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1";

function Frame({ toolbar, children }: { toolbar: ReactNode; children: ReactNode }) {
  const frame = useStageFrame();
  return (
    <section aria-label="Try it" className="relative flex h-full min-h-[360px] flex-col rounded-[24px] border border-card bg-panel">
      <div className="flex min-h-12 items-center justify-between gap-3 px-3 pt-3">{toolbar}</div>
      <div {...frame} className="flex-1 px-4 pb-0 pt-2 sm:px-8">
        <div className="mx-auto flex w-full max-w-[560px] flex-col pt-2 sm:pt-[clamp(8px,5vh,56px)]">{children}</div>
      </div>
      <StageControlRow />
    </section>
  );
}

function Toolbar({ name, prefix, children }: { name: string; prefix: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={name} className="flex min-w-0 items-start gap-x-1 ps-2 text-[14px] leading-5">
      <span className="me-1 flex h-9 shrink-0 items-center text-dim">{prefix}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-2">{children}</span>
    </div>
  );
}

function CountLine({ found, onReset }: { found: number; onReset: () => void }) {
  const n = formatsFor(useStage().locale).number;
  return (
    <div className="mt-3 flex items-center justify-between gap-3 ps-4">
      <p aria-live="polite" className="text-[14px] leading-5 text-dim tabular-nums">
        <TextSwap className="font-medium text-text">{n(found)}</TextSwap> of {n(CARS.length)} cars
      </p>
      <button type="button" onClick={onReset} className={`${RESET} -me-3`}>
        Reset
      </button>
    </div>
  );
}

const noop = () => () => {};

/** Rises in through a 6px blur when it mounts on the client; server HTML shows as it is. */
function Reveal({ children }: { children: ReactNode }) {
  const node = useRef<HTMLDivElement>(null);
  const client = useSyncExternalStore(noop, () => true, () => false);
  const animate = useRef(client);
  useLayoutEffect(() => {
    if (!animate.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const reveal = node.current?.animate(
      [
        { opacity: 0, transform: "translateY(6px)", filter: "blur(6px)" },
        { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
      ],
      { duration: 480, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" },
    );
    return () => reveal?.cancel();
  }, []);
  return <div ref={node}>{children}</div>;
}

const cheapestFirst = (cars: Car[]) => [...cars].sort((a, b) => a.price - b.price).slice(0, 4);

function CarList({ cars, ref }: { cars: Car[]; ref?: Ref<HTMLUListElement> }) {
  const { locale } = useStage();
  const f = carFormats(locale);
  const year = formatsFor(locale).plain;
  return (
    <ul ref={ref} tabIndex={-1} aria-label="Cheapest results" className="rounded-[24px] border border-card-border bg-card p-2 outline-none">
      {cheapestFirst(cars).map((car) => (
        <li key={car.id} className="flex h-14 items-center gap-3 px-3 tabular-nums">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium leading-5 text-text">
              {car.make} {car.model}
            </span>
            <span className="block truncate text-[13px] leading-5 text-dim">
              {year(car.year)}
              {car.km !== null && <> · {f.km(car.km)}</>}
              {car.fuel && <> · {car.fuel}</>}
            </span>
          </span>
          <span className="shrink-0 text-[15px] font-medium leading-5 text-accent-soft">{f.money(car.price)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Shows the cars, or the fixes when there are none. After a fix, focus moves to the cars it found. */
function Results({ filters, setFilters }: { filters: CarFilters; setFilters: (next: CarFilters) => void }) {
  const { locale } = useStage();
  const relax = useMemo(() => carRelax(locale), [locale]);
  const found = useMemo(() => matchingCars(filters), [filters]);
  const list = useRef<HTMLUListElement>(null);
  const fixed = useRef(false);
  useEffect(() => {
    if (fixed.current && found.length) list.current?.focus();
    fixed.current = false;
  }, [found.length]);

  return found.length === 0 ? (
    <Reveal key="none">
      <NoResults
        locale={locale}
        items={CARS}
        value={filters}
        onChange={(next) => {
          fixed.current = true;
          setFilters(next);
        }}
        matches={carMatches}
        relax={relax}
        title="No cars match"
        noun={CAR_NOUN}
      />
    </Reveal>
  ) : (
    <Reveal key="some">
      <CarList ref={list} cars={found} />
    </Reveal>
  );
}

const TRIES: { label: string; filters: Partial<CarFilters> }[] = [
  { label: "hybrid 7-seater under $20k", filters: { priceMax: 20000, fuels: ["Hybrid"], seatsMin: 7 } },
  { label: "electric 7-seater under $10k", filters: { priceMax: 10000, fuels: ["Electric"], seatsMin: 7 } },
  { label: "silver FWD SUV", filters: { bodies: ["SUV"], colors: ["Silver"], drives: ["FWD"] } },
];

const tryFilters = (i: number): CarFilters => ({ ...EMPTY_CAR_FILTERS, ...TRIES[i].filters });

/** Searches that find nothing, the chips they set, and the fixes in place of the results. */
export function NoResultsStage() {
  const { locale } = useStage();
  const [tried, setTried] = useState(0);
  const [filters, setFilters] = useState<CarFilters>(() => tryFilters(0));
  const found = matchingCars(filters).length;
  const start = (i: number) => {
    setTried(i);
    setFilters(tryFilters(i));
  };

  return (
    <Frame
      toolbar={
        <Toolbar name="Try a search" prefix="Try:">
          {TRIES.map((t, i) => (
            <button key={t.label} type="button" aria-pressed={i === tried} onClick={() => start(i)} className={`${TRY} ${i === tried ? "text-text" : "text-dim"}`}>
              {t.label}
            </button>
          ))}
        </Toolbar>
      }
    >
      <AppliedFilters
        filters={chipsOf(filters, locale)}
        onRemove={(key) => setFilters((f) => clearFacet(f, key as CarFacet))}
        onClearAll={() => setFilters(EMPTY_CAR_FILTERS)}
        className="mb-4"
      />
      <Results filters={filters} setFilters={setFilters} />
      <CountLine found={found} onReset={() => start(tried)} />
    </Frame>
  );
}

const APPLIED_START: CarFilters = { ...EMPTY_CAR_FILTERS, priceMin: 15000, priceMax: 45000, bodies: ["SUV"], fuels: ["Hybrid"], yearMin: 2020 };

/** Each label takes the locale's distance format, so "Under 60,000 km" reads "Under 60.000 km" in de-DE. */
const ADDS: { label: (km: (value: number) => string) => string; on: (f: CarFilters) => boolean; toggle: (f: CarFilters) => CarFilters }[] = [
  { label: (km) => `Under ${km(60000)}`, on: (f) => f.kmMax === 60000, toggle: (f) => ({ ...f, kmMax: f.kmMax === 60000 ? null : 60000 }) },
  { label: () => "AWD", on: (f) => f.drives.includes("AWD"), toggle: (f) => ({ ...f, drives: f.drives.includes("AWD") ? f.drives.filter((d) => d !== "AWD") : [...f.drives, "AWD"] }) },
  { label: () => "White", on: (f) => f.colors.includes("White"), toggle: (f) => ({ ...f, colors: f.colors.includes("White") ? f.colors.filter((c) => c !== "White") : [...f.colors, "White"] }) },
  { label: () => "Automatic", on: (f) => f.transmission === "Automatic", toggle: (f) => ({ ...f, transmission: f.transmission === "Automatic" ? null : "Automatic" }) },
];

const ADD_PILL =
  "relative inline-flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[9px] border ps-2 pe-2.5 text-[14px] leading-5 transition-[color,background-color,border-color] duration-200 ease-smooth pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft";

/** A results page head: a few filters to add, then the chips they make, over the cars, so chips arrive as well as leave. */
export function AppliedFiltersStage() {
  const { locale } = useStage();
  const km = carFormats(locale).km;
  const [filters, setFilters] = useState<CarFilters>(APPLIED_START);
  const found = matchingCars(filters).length;

  return (
    <Frame toolbar={<span />}>
      <div role="group" aria-label="Add a filter" className="mb-3 flex flex-wrap items-center gap-2">
        <span className="me-0.5 text-[13px] leading-5 text-dim">Add</span>
        {ADDS.map((add, i) => {
          const on = add.on(filters);
          return (
            <button
              key={i}
              type="button"
              aria-pressed={on}
              onClick={() => setFilters(add.toggle)}
              className={`${ADD_PILL} ${on ? "border-selected bg-selected text-accent-pale" : "border-line text-mute hover:border-control-border hover:text-text"}`}
            >
              {on ? <CheckIcon size={14} strokeWidth={2.5} className="text-accent-soft" /> : <PlusIcon size={14} className="text-dim" />}
              {add.label(km)}
            </button>
          );
        })}
      </div>
      <AppliedFilters
        filters={chipsOf(filters, locale)}
        onRemove={(key) => setFilters((f) => clearFacet(f, key as CarFacet))}
        onClearAll={() => setFilters(EMPTY_CAR_FILTERS)}
        className="mb-4"
      />
      <Results filters={filters} setFilters={setFilters} />
      <CountLine found={found} onReset={() => setFilters(APPLIED_START)} />
    </Frame>
  );
}
