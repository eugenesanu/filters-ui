"use client";

import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { formatsFor } from "../lib/format";
import { SCROLL } from "../lib/scroll";
import { BodyIcon } from "../demo/body-icons";
import { BODIES, CARS, COLORS, COLOR_PAINTS, DRIVES, FUELS, type Car, type Condition, type Transmission } from "../demo/cars";
import {
  CAR_FACET_TITLES,
  EMPTY_CAR_FILTERS,
  FACET_FIELDS,
  KM_MAX,
  KM_STEP,
  MAKES_UP_FRONT,
  PRICE_MAX,
  PRICE_MIN,
  PRICE_STEP,
  YEARS,
  bodyCounts,
  clearFacet,
  colorCounts,
  conditionOptions,
  driveCounts,
  carFormats,
  fuelCounts,
  kmBuckets,
  makeOptions,
  matchingCars,
  priceBuckets,
  seatOptions,
  summaryOf,
  transmissionOptions,
  yearBuckets,
  type CarFacet,
  type CarFilters,
} from "../demo/cars-facets";
import { ChipGroup } from "../filters/chip-group";
import { ColorSwatches } from "../filters/color-swatches";
import { IconTiles } from "../filters/icon-tiles";
import { RangeHistogram } from "../filters/range-histogram";
import { RangeSelect } from "../filters/range-select";
import { SearchableList } from "../filters/searchable-list";
import { SegmentedChoice } from "../filters/segmented-choice";
import { UpperLimit } from "../filters/upper-limit";
import { ShowButton } from "../ui/filters-head";
import { ChevronDownIcon } from "../ui/icons";
import { StatusFrame, StatusLine, useFocusKept, type StateProps } from "../ui/status-frame";
import { TextSwap } from "../ui/text-swap";

/** Sidebar order: the filters people reach for first come first. */
export const FILTER_PANEL_FACETS: CarFacet[] = ["price", "make", "body", "year", "km", "fuel", "seats", "transmission", "drive", "condition", "color"];

/** The height of a row's head; an open head stays pinned at the top of the scroll area while its body scrolls under it. */
const HEAD = 56;
/** The height of the bottom fade, which an opening body is scrolled clear of. */
const FADE = 56;

const SMOOTH = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]";

// The summary and Clear share one slot and trade places over 150ms through a 2px blur and 4px shift, as on FilterCard.
const SWAP = "transition-[opacity,filter,translate] duration-150 ease-in-out motion-reduce:transition-none";
const GONE_UP = "opacity-0 blur-[2px] -translate-y-1";
const GONE_DOWN = "opacity-0 blur-[2px] translate-y-1";
const SHOWN = "opacity-100 blur-none translate-y-0";

// Rose along the top, violet down the left, amber to teal down the right; each fades out about 28px in from the edge.
const EDGE_LIGHT = {
  top: "linear-gradient(90deg, color-mix(in srgb, var(--fu-glow-rose,#EC8092) 20%, transparent), color-mix(in srgb, var(--fu-glow-rose,#EC8092) 13%, transparent) 50%, color-mix(in srgb, var(--fu-glow-amber,#F59E6C) 16%, transparent))",
  left: "linear-gradient(180deg, color-mix(in srgb, var(--fu-glow-rose,#EC8092) 20%, transparent), color-mix(in srgb, var(--fu-glow-violet,#8A6CFF) 17%, transparent) 35%, color-mix(in srgb, var(--fu-glow-violet,#8A6CFF) 15%, transparent) 75%, color-mix(in srgb, var(--fu-glow-blue,#4C6BFF) 8%, transparent))",
  right: "linear-gradient(180deg, color-mix(in srgb, var(--fu-glow-amber,#F59E6C) 17%, transparent), color-mix(in srgb, var(--fu-glow-teal,#2DD4BF) 13%, transparent) 45%, color-mix(in srgb, var(--fu-glow-teal,#2DD4BF) 11%, transparent) 80%, color-mix(in srgb, var(--fu-glow-blue,#4C6BFF) 5%, transparent))",
};
// Alpha masks: only the opacity of these stops counts, not their colour.
const MASK_DOWN = "linear-gradient(180deg, #000, rgb(0 0 0 / 0.4) 35%, transparent)";
const MASK_RIGHT = "linear-gradient(90deg, #000, rgb(0 0 0 / 0.4) 35%, transparent)";
const MASK_LEFT = "linear-gradient(270deg, #000, rgb(0 0 0 / 0.4) 35%, transparent)";

/** The rim, and with glow a faint coloured light along the edges. Drawn over the rows, so pinned heads never hide it. */
function Edge({ glow }: { glow: boolean }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[inherit]">
      <span
        className={cn(
          "absolute inset-0 rounded-[inherit]",
          glow ? "shadow-[inset_0_0_0_1px_var(--fu-line,#404040)]" : "shadow-[inset_0_0_0_1px_var(--fu-card-border,#2A2A2A)]",
        )}
      />
      {glow && (
        <>
          <span className="absolute inset-x-0 top-0 h-14" style={{ backgroundImage: EDGE_LIGHT.top, maskImage: MASK_DOWN }} />
          {/* physical: the glow is lighting, not reading order, so its colours stay on the same sides in RTL. Brackets, so shadcn's rtl option leaves both alone. */}
          <span className="absolute inset-y-0 [left:0] w-12" style={{ backgroundImage: EDGE_LIGHT.left, maskImage: MASK_RIGHT }} />
          {/* physical: as above. */}
          <span className="absolute inset-y-0 [right:0] w-12" style={{ backgroundImage: EDGE_LIGHT.right, maskImage: MASK_LEFT }} />
        </>
      )}
    </span>
  );
}

type RowProps = {
  title: string;
  summary: string | null;
  /** Left out while the panel is disabled: the row then offers no Clear. */
  onClear?: () => void;
  open: boolean;
  onToggle: (row: HTMLElement) => void;
  onHeadKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  headingLevel: 3 | 4 | 5;
  children: ReactNode;
};

/**
 * One filter as a row: a 56px head (title, the value in words or Clear, chevron) over a body that opens with the
 * FilterCard motion. While open, the head takes a lighter wash and stays pinned as its body scrolls under it.
 */
function PanelRow({ title, summary, onClear, open, onToggle, onHeadKeyDown, headingLevel, children }: RowProps) {
  const id = useId();
  const headId = `${id}-head`;
  const bodyId = `${id}-body`;
  const head = useRef<HTMLButtonElement>(null);
  const row = useRef<HTMLElement>(null);
  const set = Boolean(summary);
  const Heading = `h${headingLevel}` as const;

  // The last summary stays in place while it fades out after a clear.
  const [lastSummary, setLastSummary] = useState(summary ?? "");
  if (summary && summary !== lastSummary) setLastSummary(summary);

  return (
    <section ref={row} data-panel-row="" data-state={open ? "open" : "closed"} className="relative">
      <div
        className={cn(
          "group/head sticky top-0 z-10 transition-[background-color] motion-reduce:transition-none",
          SMOOTH,
          // An open row's head keeps the panel's own surface: it stays in place while its filter scrolls under it, so
          // it has to cover what passes, and no more than that.
          open ? "bg-[var(--fu-card,#1F1F1F)] duration-[480ms]" : "duration-200 [@media(hover:hover)]:hover:bg-[var(--fu-card-hover,#262626)]",
        )}
      >
        <Heading className="m-0 text-[16px] font-semibold leading-6 text-[var(--fu-text,#F8F5F1)]">
          <button
            ref={head}
            type="button"
            id={headId}
            data-panel-row-head=""
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => row.current && onToggle(row.current)}
            onKeyDown={onHeadKeyDown}
            className={cn(
              "flex w-full cursor-pointer items-center gap-4 rounded-[16px] px-5 text-start font-[inherit] text-inherit [-webkit-tap-highlight-color:transparent]",
              FOCUS,
              "focus-visible:-outline-offset-4",
            )}
            style={{ height: HEAD }}
          >
            <span className="min-w-0 truncate">{title}</span>
            {set && <span className="sr-only">, {summary}</span>}
            {set && (
              // Half the head's width, as the visible slot: 50% here would be half the button's box, 40px narrower.
              <span aria-hidden="true" className="invisible ms-auto min-w-0 max-w-[calc((100%+40px)*0.5)] shrink-0 truncate text-[16px] font-normal">
                {summary}
              </span>
            )}
            <ChevronDownIcon
              size={22}
              className={cn(
                "shrink-0 text-[var(--fu-mute,#BDBDBD)] transition-[rotate,color] duration-[480ms] motion-reduce:transition-none",
                SMOOTH,
                !set && "ms-auto",
                open && "rotate-180",
                "[@media(hover:hover)]:group-hover/head:text-[var(--fu-text,#F8F5F1)]",
              )}
            />
          </button>
        </Heading>

        <div
          inert={!set}
          className="group/slot pointer-events-none absolute top-0 inset-e-[58px] grid max-w-[50%] items-center justify-items-end text-[16px] leading-6 text-[var(--fu-accent-soft,#8FAAFF)]"
          style={{ height: HEAD }}
        >
          <span
            aria-hidden="true"
            className={cn(
              "max-w-full truncate [grid-area:1/1]",
              SWAP,
              set && !open ? SHOWN : GONE_UP,
              // Hovering a closed row, or tabbing to its Clear, offers Clear in the summary's place.
              set && !open && onClear && "[@media(hover:hover)]:group-hover/head:opacity-0 [@media(hover:hover)]:group-hover/head:blur-[2px] [@media(hover:hover)]:group-hover/head:-translate-y-1",
              set && !open && onClear && "group-focus-within/slot:opacity-0 group-focus-within/slot:blur-[2px] group-focus-within/slot:-translate-y-1",
            )}
          >
            {summary || lastSummary}
          </span>
          {onClear && (
            <button
              type="button"
              tabIndex={set ? 0 : -1}
              aria-label={`Clear ${title.toLowerCase()}`}
              onClick={() => {
                onClear();
                head.current?.focus();
              }}
              className={cn(
                "relative cursor-pointer rounded-[6px] font-medium [grid-area:1/1] [-webkit-tap-highlight-color:transparent]",
                // The press area runs the full height of the head.
                "before:absolute before:-inset-x-2 before:-inset-y-4 before:content-['']",
                FOCUS,
                "focus-visible:outline-offset-2",
                SWAP,
                set && open ? cn(SHOWN, "pointer-events-auto") : GONE_DOWN,
                set &&
                  !open &&
                  "[@media(hover:hover)]:pointer-events-auto [@media(hover:hover)]:group-hover/head:opacity-100 [@media(hover:hover)]:group-hover/head:blur-none [@media(hover:hover)]:group-hover/head:translate-y-0",
                set && !open && "focus-visible:opacity-100 focus-visible:blur-none focus-visible:translate-y-0",
              )}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div
        id={bodyId}
        role="region"
        aria-labelledby={headId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-[480ms] motion-reduce:transition-none",
          SMOOTH,
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "px-5 pt-1.5 pb-5 transition-[opacity,filter,translate] motion-reduce:transition-none",
              open
                ? "translate-y-0 opacity-100 blur-none delay-[120ms] duration-[460ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                : cn("translate-y-1.5 opacity-0 blur-[6px] duration-[480ms]", SMOOTH),
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export type FilterPanelProps = Omit<HTMLAttributes<HTMLElement>, "onChange"> &
  Omit<StateProps, "emptyText"> & {
  cars?: readonly Car[];
  defaultFilters?: CarFilters;
  /** Rows open on first render. Several may be open at once. */
  defaultOpen?: CarFacet[];
  onShow?: (cars: Car[]) => void;
  /** Level of the Filters heading; row headings sit one below. Default 2. */
  headingLevel?: 2 | 3 | 4;
  /** A faint coloured light along the panel's edges. Default false. */
  glow?: boolean;
  /** Numbers, prices and distances follow it, e.g. "de-DE". Default "en-US". */
  locale?: string;
};

/**
 * Every car filter as a row in one tall panel, like a search page's sidebar: a head (Filters, how many are set,
 * Clear all), the rows between soft fades, and Show N cars pinned at the bottom. Closed rows keep their value in
 * words, so the closed panel reads as the whole search. Give it a height (or a max height) and the rows scroll.
 * status and disabled reach every row's filter through a frame of its own, quiet, as the head says the state once:
 * loading draws each filter's placeholders and the number in Show; an error shows its line in each open row and once
 * under the head, with the one Retry; disabled turns every filter off and leaves Clear and Clear all out.
 */
export function FilterPanel({
  cars = CARS,
  defaultFilters = EMPTY_CAR_FILTERS,
  defaultOpen = [],
  onShow,
  headingLevel = 2,
  glow = false,
  locale,
  status = "ready",
  onRetry,
  errorText = "Couldn't load the cars.",
  disabled = false,
  className,
  ...props
}: FilterPanelProps) {
  const titleId = useId();
  const root = useRef<HTMLElement>(null);
  const dragged = useRef(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [open, setOpen] = useState<CarFacet[]>(defaultOpen);
  const scroller = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const topFade = useRef<HTMLDivElement>(null);
  const bottomFade = useRef<HTMLDivElement>(null);
  // A row just closed from its pinned place, held flush with the top until the panel scrolls.
  const held = useRef<HTMLElement | null>(null);
  const follow = useRef(0);

  const f = carFormats(locale);
  const matches = matchingCars(filters, cars);
  const setCount = FILTER_PANEL_FACETS.filter((facet) => summaryOf(filters, facet, locale) !== null).length;
  const [lastSetCount, setLastSetCount] = useState(setCount || 1);
  if (setCount > 0 && setCount !== lastSetCount) setLastSetCount(setCount);

  const set = (patch: Partial<CarFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const heads = () => [...(list.current?.querySelectorAll<HTMLButtonElement>("[data-panel-row-head]") ?? [])];

  // Clear all hides once nothing is set, so focus moves to the first row rather than dropping to the page.
  const clearAll = () => {
    setFilters(EMPTY_CAR_FILTERS);
    heads()[0]?.focus();
  };

  // Up and Down move between row heads, Home and End jump to the first and last, as in a WAI accordion.
  const onHeadKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const all = heads();
    const at = all.indexOf(event.currentTarget);
    const target =
      event.key === "ArrowDown" ? all[at + 1] : event.key === "ArrowUp" ? all[at - 1] : event.key === "Home" ? all[0] : event.key === "End" ? all.at(-1) : undefined;
    if (!target) return;
    event.preventDefault();
    target.focus();
  };

  const toggle = (facet: CarFacet, row: HTMLElement) => {
    const node = scroller.current;
    if (!node) return;
    cancelAnimationFrame(follow.current);
    const headTop = row.offsetTop + row.clientTop;
    if (open.includes(facet)) {
      // Closing a pinned head would carry it up out of view with its body; scroll to it so it stays where it was pinned.
      if (headTop < node.scrollTop) {
        node.scrollTop = headTop;
        held.current = row;
      }
      setOpen((rows) => rows.filter((f) => f !== facet));
      return;
    }
    setOpen((rows) => [...rows, facet]);
    // As the body grows, scroll along so its end stays clear of the bottom fade, but never past its head reaching the top.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const until = performance.now() + (reduced ? 0 : 560);
    const step = () => {
      const want = Math.min(headTop, row.offsetTop + row.offsetHeight - node.clientHeight + FADE);
      if (want > node.scrollTop + 0.5) node.scrollTop = want;
      if (performance.now() < until) follow.current = requestAnimationFrame(step);
    };
    follow.current = requestAnimationFrame(step);
  };

  // The fades follow the scroll without re-rendering the rows. Under a pinned head the top fade starts below it.
  useEffect(() => {
    const node = scroller.current;
    const inner = list.current;
    if (!node || !inner) return;
    const measure = () => {
      const top = node.scrollTop;
      let below = 0;
      for (const row of inner.querySelectorAll<HTMLElement>("[data-panel-row][data-state=open]")) {
        const end = row.offsetTop + row.offsetHeight;
        if (row.offsetTop <= top + 1 && end > top) below = Math.max(0, Math.min(HEAD, end - top));
      }
      if (held.current) {
        if (Math.abs(held.current.offsetTop + held.current.clientTop - top) <= 1) below = HEAD;
        else held.current = null;
      }
      if (topFade.current) {
        topFade.current.style.top = `${below}px`;
        topFade.current.dataset.shown = String(top > 1);
      }
      if (bottomFade.current) bottomFade.current.dataset.shown = String(top + node.clientHeight < node.scrollHeight - 1);
    };
    measure();
    // A wheel or touch hands the scroll back to the person while an opening row is being followed.
    const stop = () => cancelAnimationFrame(follow.current);
    node.addEventListener("scroll", measure, { passive: true });
    node.addEventListener("wheel", stop, { passive: true });
    node.addEventListener("touchstart", stop, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    observer.observe(inner);
    return () => {
      node.removeEventListener("scroll", measure);
      node.removeEventListener("wheel", stop);
      node.removeEventListener("touchstart", stop);
      observer.disconnect();
      stop();
    };
  }, []);

  const bodyOf = (facet: CarFacet, filters: CarFilters): ReactNode => {
    switch (facet) {
      case "price":
        return (
          <RangeHistogram
            locale={locale}
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            value={[filters.priceMin, filters.priceMax]}
            onChange={([priceMin, priceMax]) => set({ priceMin, priceMax })}
            buckets={priceBuckets(filters, cars)}
            format={f.money}
            labels={{ low: "Lowest price", high: "Highest price" }}
          />
        );
      case "make":
        return (
          <SearchableList
            locale={locale}
            variant="panel"
            label="Make and model"
            noun="makes"
            collapsedCount={MAKES_UP_FRONT}
            options={makeOptions(filters, cars)}
            value={filters.makes.map((p) => ({ value: p.make, children: p.models }))}
            onChange={(picks) => set({ makes: picks.map((p) => ({ make: p.value, models: p.children })) })}
            countLabel={f.carCount}
          />
        );
      case "body": {
        const counts = bodyCounts(filters, cars);
        return (
          <IconTiles
            locale={locale}
            label="Body style"
            options={BODIES.map((b) => ({ value: b, label: b, icon: <BodyIcon body={b} />, count: counts.get(b) ?? 0 }))}
            value={filters.bodies}
            onChange={(bodies) => set({ bodies })}
            countLabel={f.carCount}
          />
        );
      }
      case "year":
        return (
          <RangeSelect
            locale={locale}
            options={YEARS}
            value={[filters.yearMin, filters.yearMax]}
            onChange={([yearMin, yearMax]) => set({ yearMin, yearMax })}
            buckets={yearBuckets(filters, cars)}
            pickerOrder="descending"
            labels={{ low: "From year", high: "To year" }}
          />
        );
      case "km":
        return (
          <UpperLimit
            locale={locale}
            min={0}
            max={KM_MAX}
            step={KM_STEP}
            value={filters.kmMax}
            onChange={(kmMax) => set({ kmMax })}
            buckets={kmBuckets(filters, cars)}
            format={f.km}
            label="Maximum kilometres"
          />
        );
      case "fuel": {
        const counts = fuelCounts(filters, cars);
        return (
          <ChipGroup
            locale={locale}
            label="Fuel"
            options={FUELS.map((v) => ({ value: v, label: v, count: counts.get(v) ?? 0 }))}
            value={filters.fuels}
            onChange={(fuels) => set({ fuels })}
            countLabel={f.carCount}
          />
        );
      }
      case "seats":
        return (
          <SegmentedChoice<number | null>
            locale={locale}
            label="Seats"
            options={seatOptions(filters, cars, locale)}
            value={filters.seatsMin}
            onChange={(seatsMin) => set({ seatsMin })}
            countLabel={f.carCount}
          />
        );
      case "transmission":
        return (
          <SegmentedChoice<Transmission | null>
            locale={locale}
            label="Transmission"
            fit="content"
            options={transmissionOptions(filters, cars)}
            value={filters.transmission}
            onChange={(transmission) => set({ transmission })}
            countLabel={f.carCount}
          />
        );
      case "drive": {
        const counts = driveCounts(filters, cars);
        return (
          <ChipGroup
            locale={locale}
            label="Drivetrain"
            options={DRIVES.map((v) => ({ value: v, label: v, count: counts.get(v) ?? 0 }))}
            value={filters.drives}
            onChange={(drives) => set({ drives })}
            countLabel={f.carCount}
          />
        );
      }
      case "condition":
        return (
          <SegmentedChoice<Condition | null>
            locale={locale}
            label="New or used"
            options={conditionOptions(filters, cars)}
            value={filters.condition}
            onChange={(condition) => set({ condition })}
            countLabel={f.carCount}
          />
        );
      case "color": {
        const counts = colorCounts(filters, cars);
        return (
          <ColorSwatches
            locale={locale}
            label="Colour"
            options={COLORS.map((c) => ({ value: c, label: c, color: COLOR_PAINTS[c], count: counts.get(c) ?? 0 }))}
            value={filters.colors}
            onChange={(colors) => set({ colors })}
            countLabel={f.carCount}
          />
        );
      }
    }
  };

  const framed = (facet: CarFacet, from: CarFilters) => (
    <StatusFrame status={status} errorText={errorText} disabled={disabled} announce={false}>
      {bodyOf(facet, from)}
    </StatusFrame>
  );
  // While a handle is dragged, a row whose own filter did not change draws from the deferred filters, so only the
  // dragged row renders at once and the others' counts follow when the main thread is free. Taps and keys update every row together.
  const dragging = dragged.current;
  const later = useDeferredValue(filters);
  const from = dragging ? later : filters;
  const settled = useMemo(() => new Map(FILTER_PANEL_FACETS.map((facet) => [facet, framed(facet, from)])), [from, cars, locale, status, errorText, disabled]);
  const bodyFor = (facet: CarFacet) => (dragging && FACET_FIELDS[facet].some((key) => filters[key] !== later[key]) ? framed(facet, filters) : settled.get(facet));

  const Heading = `h${headingLevel}` as const;
  const rowLevel = (headingLevel + 1) as 3 | 4 | 5;
  const anySet = setCount > 0;
  // Clear all hides while disabled, as when nothing is set.
  const canClear = anySet && !disabled;
  // A Clear that leaves while disabled, or Retry once it reloads: focus that sat on it moves to the panel.
  useFocusKept(root, `${status}|${disabled}`);

  return (
    <section
      ref={root}
      aria-labelledby={titleId}
      // Retry hands focus to the panel, which stays while it reloads.
      tabIndex={-1}
      data-status-frame=""
      className={cn(
        "not-prose relative isolate flex min-h-0 w-full flex-col overflow-hidden rounded-[24px] bg-[var(--fu-card,#1F1F1F)] text-[var(--fu-text,#F8F5F1)]",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
        className,
      )}
      onPointerMoveCapture={(event) => (dragged.current = event.buttons !== 0)}
      onPointerUpCapture={() => (dragged.current = false)}
      onPointerCancelCapture={() => (dragged.current = false)}
      onClickCapture={() => (dragged.current = false)}
      onKeyDownCapture={() => (dragged.current = false)}
      {...props}
    >
      <div data-panel-head="" className="flex h-[60px] shrink-0 items-center gap-3 border-b border-[var(--fu-line,#404040)] pe-3 ps-5">
        <Heading id={titleId} className="m-0 flex min-w-0 items-baseline gap-2 text-[22px] font-semibold leading-7 text-[var(--fu-text,#F8F5F1)]">
          Filters
          <span
            aria-hidden="true"
            className={cn("font-normal tabular-nums text-[var(--fu-dim,#929292)]", SWAP, anySet ? SHOWN : GONE_DOWN)}
          >
            <TextSwap>{formatsFor(locale).number(anySet ? setCount : lastSetCount)}</TextSwap>
          </span>
          {anySet && <span className="sr-only">, {formatsFor(locale).number(setCount)} set</span>}
        </Heading>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {f.carCount(matches.length)}
        </span>
        <button
          type="button"
          inert={!canClear}
          onClick={clearAll}
          className={cn(
            "relative ms-auto inline-flex h-9 shrink-0 cursor-pointer items-center rounded-[10px] px-2.5 text-[16px] font-medium leading-5 text-[var(--fu-accent-soft,#8FAAFF)] [-webkit-tap-highlight-color:transparent]",
            "hover:text-[var(--fu-accent-pale,#D1DDFF)] pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1 pointer-coarse:after:content-['']",
            FOCUS,
            "focus-visible:outline-offset-0",
            SWAP,
            "transition-[opacity,filter,translate,color]",
            canClear ? SHOWN : GONE_DOWN,
          )}
        >
          Clear all
        </button>
      </div>
      <StatusLine
        status={status}
        onRetry={onRetry}
        errorText={errorText}
        className="shrink-0 justify-start gap-x-4 border-b border-[var(--fu-line,#404040)] px-5 py-3"
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scroller}
          className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-pt-14 scroll-pb-12", SCROLL)}
        >
          <div ref={list} className="relative divide-y divide-[var(--fu-line,#404040)]">
            {FILTER_PANEL_FACETS.map((facet) => (
              <PanelRow
                key={facet}
                title={CAR_FACET_TITLES[facet]}
                summary={summaryOf(filters, facet, locale)}
                onClear={disabled ? undefined : () => setFilters((f) => clearFacet(f, facet))}
                open={open.includes(facet)}
                onToggle={(row) => toggle(facet, row)}
                onHeadKeyDown={onHeadKeyDown}
                headingLevel={rowLevel}
              >
                {bodyFor(facet)}
              </PanelRow>
            ))}
          </div>
        </div>
        <div
          ref={topFade}
          aria-hidden="true"
          data-shown="false"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-linear-to-b from-[var(--fu-card,#1F1F1F)] to-transparent opacity-0 transition-opacity duration-200 data-[shown=true]:opacity-100 motion-reduce:transition-none"
        />
        <div
          ref={bottomFade}
          aria-hidden="true"
          data-shown="false"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-14 bg-linear-to-t from-[var(--fu-card,#1F1F1F)] to-transparent opacity-0 transition-opacity duration-200 data-[shown=true]:opacity-100 motion-reduce:transition-none"
        />
      </div>

      <div className="shrink-0 border-t border-[var(--fu-line,#404040)] p-4">
        <ShowButton label={`Show ${f.carCount(matches.length)}`} onClick={onShow && (() => onShow(matches))} loading={status === "loading"} className="h-11 w-full" />
      </div>

      <Edge glow={glow} />
    </section>
  );
}
