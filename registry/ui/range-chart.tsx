"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type PointerEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { isRtl, readingKey } from "../lib/direction";
import { formatsFor } from "../lib/format";
import { EmptyNote } from "./empty-note";
import { SKELETON_FILL, useLoading } from "./skeleton";

/** [low, high]. null is an open end: no lower or no upper limit. */
export type RangeValue = [number | null, number | null];

type Handle = "low" | "high";

export type RangeChartProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
  min: number;
  max: number;
  step: number;
  value: RangeValue;
  onChange: (value: RangeValue) => void;
  /** Item count per bar, spread evenly from min to max. Leave out for a plain slider. */
  buckets?: readonly number[];
  /** Tooltip and screen-reader text for a value. Gets the handle too, for scales where the high handle reads one step back. */
  format?: (value: number, handle: "low" | "high") => string;
  /** Tooltip text while the high end is open. Default: the top value and a plus ("$100,000+"). */
  openLabel?: string;
  /** One handle, for an upper limit only. The low end of `value` is ignored; the handle stops one step above min. */
  single?: boolean;
  /** Accessible names of the handles. */
  labels?: { low?: string; high?: string };
  /** Bar width as a share of its slot, so a chart with few bars can keep the rhythm of a denser one. Default 1. */
  barScale?: number;
  /** Formats values when no format is given, e.g. "de-DE". */
  locale?: string;
  disabled?: boolean;
  /**
   * Draws pulsing columns in a calm hill and a pulsing rail, with no handles, in the space the chart takes.
   * Default: the nearest StatusFrame's loading state.
   */
  loading?: boolean;
  /** Shown, quiet, in the bars' place when buckets is an empty list. Default "No items to show." */
  emptyText?: ReactNode;
};

const HANDLE = 20;
/** Columns a loading chart draws when it has no buckets yet. */
const PLACEHOLDER_BARS = 20;

// A loading column's height in percent: a soft hill, highest a third of the way along, as many prices are.
const hillAt = (i: number, n: number) => {
  const x = (i + 0.5) / n;
  return Math.round(18 + 64 * Math.exp(-(((x - 0.38) / 0.24) ** 2)));
};
// A press on a handle becomes a drag only after it travels this far, so a click does not show the tooltip.
const DRAG_FROM = 3;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

// A handle stops at the end of the track, so the bars, the fill and the tooltip share the handle's travel.
const along = (fraction: number) => `calc(${HANDLE / 2}px + (100% - ${HANDLE}px) * ${fraction})`;

type Drag = { handle: Handle; fraction: number; moving: boolean };

/**
 * A bar chart of how many items sit along a range, with one or two handles on a track under it.
 * Each handle is backed by a visually hidden native range input for keyboards and screen readers. Right to left, the
 * scale runs from the right: the minimum sits at the right end and the Left arrow raises a value.
 */
export function RangeChart({
  min,
  max,
  step,
  value,
  onChange,
  buckets,
  format: formatProp,
  openLabel,
  single = false,
  labels,
  barScale = 1,
  locale,
  disabled = false,
  loading: loadingProp,
  emptyText = "No items to show.",
  className,
  ...props
}: RangeChartProps) {
  const status = useLoading();
  const loading = loadingProp ?? status.loading;
  const format: (value: number, handle: Handle) => string = formatProp ?? formatsFor(locale).number;
  const root = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const grip = useRef<{ x: number; shift: number; handle: Handle; stacked: boolean; box: DOMRect } | null>(null);
  const pressed = useRef(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [lastHeld, setLastHeld] = useState<Handle>("high");
  const [tipHalf, setTipHalf] = useState(0);

  const span = max - min || 1;
  const snap = (v: number) => clamp(min + Math.round((v - min) / step) * step, min, max);
  const low = single ? min : clamp(value[0] ?? min, min, max);
  const high = clamp(value[1] ?? max, Math.min(low + step, max), max);
  const values = { low, high };
  const fractionOf = (v: number) => (v - min) / span;
  const stepFraction = step / span;

  const emit = (nextLow: number, nextHigh: number) => {
    const next: RangeValue = [single || nextLow <= min ? null : nextLow, nextHigh >= max ? null : nextHigh];
    if (next[0] !== value[0] || next[1] !== value[1]) onChange(next);
  };

  // Handles never cross: each stops one step short of the other. Returns where the handle landed.
  const moveTo = (handle: Handle, v: number) => {
    if (handle === "low") {
      const next = Math.min(snap(v), high - step);
      emit(next, high);
      return next;
    }
    const next = Math.max(snap(v), low + step);
    emit(low, next);
    return next;
  };

  // A drag passes the box it measured at press, so moves do not force a layout read each event.
  const fractionAt = (clientX: number, box = root.current?.getBoundingClientRect()) => {
    if (!box) return 0;
    const fromStart = isRtl(root.current) ? box.right - clientX : clientX - box.left;
    return clamp((fromStart - HANDLE / 2) / (box.width - HANDLE), 0, 1);
  };

  // Where each handle is drawn: a dragged one sits under the pointer, the other at its value.
  const shown = { low: fractionOf(low), high: fractionOf(high) };
  if (drag) shown[drag.handle] = drag.fraction;

  const nearest = (v: number): Handle => {
    if (single || v > high) return "high";
    if (v < low) return "low";
    return v - low < high - v ? "low" : "high";
  };

  // A press on a bar gives the nearest handle that bar's outer edge, so the bar stays in the range.
  // A press on the rail moves the nearest handle to the step under the pointer.
  const land = (clientX: number, onBar: boolean) => {
    const at = min + fractionAt(clientX) * span;
    if (onBar && buckets?.length) {
      const size = span / buckets.length;
      const bar = clamp(Math.floor((at - min) / size), 0, buckets.length - 1);
      const handle = nearest(min + (bar + 0.5) * size);
      return { handle, value: moveTo(handle, min + (handle === "low" ? bar : bar + 1) * size) };
    }
    const handle = nearest(at);
    return { handle, value: moveTo(handle, at) };
  };

  const press = (event: PointerEvent<HTMLDivElement>) => {
    pressed.current = false;
    if (disabled || event.button !== 0) return;
    const target = event.target as HTMLElement;
    const handle = target.closest<HTMLElement>("[data-handle]")?.dataset.handle as Handle | undefined;
    // A finger landing off a handle may be starting a scroll, so a tap waits for its click.
    if (!handle && event.pointerType === "touch") return;
    event.preventDefault();
    pressed.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    const box = event.currentTarget.getBoundingClientRect();
    const landed = handle ? null : land(event.clientX, !!target.closest("[data-bars]"));
    const held = handle ?? landed!.handle;
    const startFraction = fractionOf(handle ? values[handle] : landed!.value);
    // Handles one step apart overlap, so the first move picks which one is pulled out of the stack.
    const stacked = !!handle && !single && high - low <= step;
    grip.current = { x: event.clientX, shift: startFraction - fractionAt(event.clientX, box), handle: held, stacked, box };
    setLastHeld(held);
    setDrag({ handle: held, fraction: startFraction, moving: false });
    (root.current?.querySelector(`input[data-for="${held}"]`) as HTMLInputElement | null)?.focus({ preventScroll: true });
  };

  const follow = (event: PointerEvent<HTMLDivElement>) => {
    const g = grip.current;
    if (!g || !drag) return;
    if (!drag.moving && Math.abs(event.clientX - g.x) < DRAG_FROM) return;
    if (g.stacked) {
      const pulled: Handle = event.clientX < g.x !== isRtl(root.current) ? "low" : "high";
      g.stacked = false;
      if (pulled !== g.handle) {
        g.shift += fractionOf(values[pulled]) - fractionOf(values[g.handle]);
        g.handle = pulled;
        setLastHeld(pulled);
        (root.current?.querySelector(`input[data-for="${pulled}"]`) as HTMLInputElement | null)?.focus({ preventScroll: true });
      }
    }
    const [floor, ceiling] =
      g.handle === "low" ? [0, fractionOf(high) - stepFraction] : [fractionOf(low) + stepFraction, 1];
    const fraction = clamp(fractionAt(event.clientX, g.box) + g.shift, floor, ceiling);
    setDrag({ handle: g.handle, fraction, moving: true });
    moveTo(g.handle, min + fraction * span);
  };

  const release = () => {
    grip.current = null;
    setDrag(null);
  };

  const dragging = !!drag?.moving;
  const tipHandle = drag?.handle ?? lastHeld;
  // An open end is no limit, so it does not read as the end value.
  const textOf = (handle: Handle) =>
    handle === "high" && value[1] === null ? (openLabel ?? `${format(max, "high")}+`) : format(values[handle], handle);
  const tipText = textOf(tipHandle);

  useLayoutEffect(() => {
    if (tip.current) setTipHalf(tip.current.offsetWidth / 2);
  }, [tipText]);

  const tallest = Math.max(1, ...(buckets ?? []));
  // While a handle is dragged, the bars it passes rise a little, in a soft wave centred on the handle.
  const bumpAt = dragging && drag && buckets?.length ? drag.fraction * buckets.length - 0.5 : null;
  const bumpOf = (i: number) => {
    if (bumpAt === null) return 1;
    const near = Math.max(0, 1 - Math.abs(i - bumpAt) / 2.4);
    return 1 + 0.22 * near * near;
  };
  const lowShown = single ? 0 : shown.low;
  const handles: Handle[] = single ? ["high"] : ["low", "high"];
  const columns = buckets?.length || PLACEHOLDER_BARS;

  return (
    <div
      ref={root}
      data-dragging={dragging || undefined}
      data-disabled={disabled || undefined}
      className={cn(
        "group/range relative cursor-pointer touch-pan-y select-none [-webkit-tap-highlight-color:transparent]",
        "data-[dragging]:cursor-grabbing data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className,
      )}
      onPointerDown={press}
      onPointerMove={follow}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onClick={(event) => {
        if (!pressed.current && !disabled) land(event.clientX, !!(event.target as HTMLElement).closest("[data-bars]"));
        pressed.current = false;
      }}
      {...props}
    >
      {buckets && buckets.length === 0 && !loading && (
        <EmptyNote className="mx-[10px] h-14 justify-center">{emptyText}</EmptyNote>
      )}
      {buckets && (buckets.length > 0 || loading) && (
        <div
          data-bars
          aria-hidden
          className="mx-[10px] flex h-14 items-end gap-[2px]"
          // Many bars close their gaps up, a 2px gap at most and a quarter of a bar's slot at least, so bars never vanish.
          style={columns > 40 ? { gap: `min(2px, calc(100% / ${columns * 4}))` } : undefined}
        >
          {loading
            ? Array.from({ length: columns }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "min-w-0 flex-1 rounded-t-[3px]",
                    SKELETON_FILL,
                    "transition-[height,background-color] duration-[420ms,200ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                  )}
                  style={{ height: `${hillAt(i, columns)}%` }}
                />
              ))
            : buckets.map((count, i) => {
                const start = i / buckets.length;
                const end = (i + 1) / buckets.length;
                const cover = clamp((Math.min(end, shown.high) - Math.max(start, lowShown)) / (end - start), 0, 1);
                const lit = cover > 0 ? Math.round((0.35 + 0.65 * cover) * 100) : 0;
                const narrow = barScale !== 1;
                const bar = (
                  <span
                    key={i}
                    className={cn(
                      "min-w-0 rounded-t-[3px]",
                      narrow ? "flex-none" : "flex-1",
                      "origin-bottom [scale:1_var(--bump,1)] motion-reduce:[scale:none]",
                      "transition-[height,background-color,scale] duration-[420ms,200ms,360ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                      "group-data-[dragging]/range:duration-[420ms,0ms,140ms]",
                    )}
                    style={{
                      "--bump": bumpOf(i),
                      height: `${Math.max(count ? 8 : 3, (count / tallest) * 100)}%`,
                      backgroundColor: `color-mix(in srgb, var(--fu-accent-soft,#8FAAFF) ${lit}%, var(--fu-rail,#4A4A4A))`,
                      // The bar a denser chart would draw: its slot plus one 2px gap, scaled, less the gap.
                      width: narrow ? `calc((100% + 2px) * ${barScale} - 2px)` : undefined,
                    } as CSSProperties}
                  />
                );
                return narrow ? (
                  <span key={i} className="flex h-full min-w-0 flex-1 items-end justify-center">
                    {bar}
                  </span>
                ) : (
                  bar
                );
              })}
        </div>
      )}

      <div className="relative h-6">
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 top-[10px] h-1 rounded-[2px] transition-[background-color] duration-200 motion-reduce:transition-none",
            loading ? SKELETON_FILL : "bg-[var(--fu-rail,#4A4A4A)]",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "absolute top-[10px] h-1 rounded-[2px] bg-[var(--fu-accent-soft,#8FAAFF)]",
            // While loading the fill and handles are hidden; they fade in with the data.
            loading && "opacity-0",
            "transition-[left,right,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            "group-data-[dragging]/range:transition-none",
          )}
          style={{ insetInlineStart: single ? 0 : along(lowShown), insetInlineEnd: along(1 - shown.high) }}
        />
        {handles.map((handle) => {
          const grabbed = drag?.handle === handle;
          const label = labels?.[handle] ?? (handle === "low" ? "Minimum" : "Maximum");
          return (
            <span key={handle} className="contents">
              <input
                type="range"
                data-for={handle}
                aria-label={label}
                aria-valuetext={
                  handle === "high" && value[1] === null ? "No maximum" : handle === "low" && value[0] === null ? "No minimum" : format(values[handle], handle)
                }
                min={single ? min + step : min}
                max={max}
                step={step}
                value={values[handle]}
                disabled={disabled}
                onChange={(event) => moveTo(handle, Number(event.target.value))}
                // Left and Right follow the screen in RTL too, the same in every browser.
                onKeyDown={(event) => {
                  const key = readingKey(event.key, event.currentTarget);
                  if (key === event.key) return;
                  event.preventDefault();
                  moveTo(handle, values[handle] + (key === "ArrowRight" ? step : -step));
                }}
                className="peer pointer-events-none absolute inset-0 m-0 h-full w-full opacity-0"
              />
              <span
                data-handle={handle}
                data-grabbed={grabbed || undefined}
                className={cn(
                  loading && "opacity-0",
                  "absolute top-[2px] -ms-[10px] size-5 cursor-grab touch-none rounded-full bg-[var(--fu-handle,#F8F5F1)]",
                  "shadow-[0_0_0_0_color-mix(in_srgb,var(--fu-accent-soft,#8FAAFF)_28%,transparent),0_0_0_1px_var(--fu-handle-edge,rgb(0_0_0/0.25)),0_2px_6px_var(--fu-shadow,rgb(0_0_0/0.5))]",
                  "transition-[left,scale,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                  "before:absolute before:-inset-[10px] before:rounded-full before:content-['']",
                  "hover:scale-[1.15]",
                  "peer-focus-visible:z-[1] data-[grabbed]:z-[1] data-[grabbed]:scale-[1.15] data-[grabbed]:cursor-grabbing",
                  "data-[grabbed]:shadow-[0_0_0_6px_color-mix(in_srgb,var(--fu-accent-soft,#8FAAFF)_28%,transparent),0_0_0_1px_var(--fu-handle-edge,rgb(0_0_0/0.25)),0_2px_6px_var(--fu-shadow,rgb(0_0_0/0.5))]",
                  "group-data-[dragging]/range:data-[grabbed]:transition-[scale,box-shadow]",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-solid peer-focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
                )}
                style={{ insetInlineStart: along(shown[handle]) }}
              />
            </span>
          );
        })}
      </div>

      <span
        ref={tip}
        aria-hidden
        data-state={dragging ? "open" : "closed"}
        className={cn(
          "pointer-events-none absolute bottom-10 z-[2] -translate-x-1/2 rtl:translate-x-1/2 rounded-[8px] px-2 py-1 whitespace-nowrap",
          "bg-[var(--fu-text,#F8F5F1)] text-[13px] leading-[18px] font-medium text-[var(--fu-surface-1,#171717)] tabular-nums",
          "transition-[opacity,translate] duration-150 ease-in-out motion-reduce:transition-none",
          "data-[state=closed]:translate-y-1 data-[state=closed]:opacity-0",
        )}
        style={
          {
            insetInlineStart: `clamp(${tipHalf}px, ${along(shown[tipHandle])}, calc(100% - ${tipHalf}px))`,
          } as CSSProperties
        }
      >
        {tipText}
      </span>
    </div>
  );
}
