"use client";

import { useId, useRef, useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { formatsFor } from "../lib/format";
import { RangeHistogram } from "./range-histogram";
import type { RangeValue } from "../ui/range-chart";
import { Segmented } from "../ui/segmented";
import { TextField } from "../ui/text-field";
import { TextSwap } from "../ui/text-swap";

/**
 * A budget, set one of two ways. "total": a price range, null for an open end. "monthly": what one can pay each month
 * over a term in months, after a down payment; it stands for a top price worked out with an interest rate.
 */
export type BudgetValue =
  | { by: "total"; range: RangeValue }
  | { by: "monthly"; monthly: number | null; term: number; down: number };

export type BudgetProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> & {
  value: BudgetValue;
  onChange: (value: BudgetValue) => void;
  /** The price scale: bottom, top and the step that handles and typed prices snap to. */
  min: number;
  max: number;
  step: number;
  /** Items per price bar, spread evenly from min to max. Both ways show them. */
  buckets?: readonly number[];
  /** Yearly interest rate in percent, e.g. 6.9. Shown as an example, never as an offer. */
  rate: number;
  /** Loan lengths in months. */
  terms?: readonly number[];
  /** Money as text, e.g. "$45,000". Default: whole units of `currency` in the locale. */
  format?: (value: number) => string;
  /** ISO 4217 code for the default money format. Default "USD". */
  currency?: string;
  /** Formats money, the rate and the terms, and reads typed money, e.g. "de-DE" reads "45.000". Default "en-US". */
  locale?: string;
  /** Accessible name of the two ways, e.g. "Budget". */
  label?: string;
};

/**
 * The top price a monthly payment buys: what the payments repay over the term at the yearly rate, plus the down payment,
 * rounded down to a hundred.
 */
export function topPrice(monthly: number, term: number, down: number, rate: number) {
  const r = rate / 100 / 12;
  const loan = r === 0 ? monthly * term : (monthly * (1 - Math.pow(1 + r, -term))) / r;
  return Math.max(0, Math.floor((loan + down) / 100) * 100);
}

/** The price range a budget allows, [low, high], with null for an open end. */
export function budgetRange(value: BudgetValue, rate: number): RangeValue {
  if (value.by === "total") return value.range;
  return value.monthly === null ? [null, null] : [null, topPrice(value.monthly, value.term, value.down, rate)];
}


const SMOOTH = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const FOCUS_RING = "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]";

type Way = "total" | "monthly";

/**
 * Two radio cards: Total price holds a price chart with typed fields; Monthly payment takes an amount, a term and a down
 * payment and turns them into a top price, drawn as a line across the same bars. The picked card opens; the other folds.
 */
export function Budget({
  value,
  onChange,
  min,
  max,
  step,
  buckets,
  rate,
  terms = [36, 48, 60, 72],
  format: formatProp,
  currency = "USD",
  locale,
  label = "Budget",
  className,
  ...props
}: BudgetProps) {
  const format = formatProp ?? formatsFor(locale, { currency }).price;
  const id = useId();
  // Each way keeps what was set in it, so switching back finds it as it was.
  const [kept, setKept] = useState<{ total: BudgetValue & { by: "total" }; monthly: BudgetValue & { by: "monthly" } }>(() => ({
    total: value.by === "total" ? value : { by: "total", range: [null, null] },
    monthly: value.by === "monthly" ? value : { by: "monthly", monthly: null, term: terms[Math.min(2, terms.length - 1)], down: 0 },
  }));
  if (kept[value.by] !== value) setKept({ ...kept, [value.by]: value });

  // Worked out from the kept monthly budget, so the folded card still holds its top price.
  const monthly = value.by === "monthly" ? value : kept.monthly;
  const ceiling = monthly.monthly !== null ? topPrice(monthly.monthly, monthly.term, monthly.down, rate) : null;

  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const ways: { key: Way; title: string; line: string }[] = [
    { key: "monthly", title: "Monthly payment", line: "We turn it into a top price." },
    { key: "total", title: "Total price", line: "Set the lowest and highest price." },
  ];

  const pick = (way: Way) => {
    if (way === value.by) return;
    // Total price with no range of its own yet starts at the monthly top price as its highest price, so the budget stays.
    if (way === "total" && kept.total.range[0] === null && kept.total.range[1] === null && ceiling !== null) {
      const high = Math.max(min, Math.floor(ceiling / step) * step);
      onChange({ by: "total", range: [null, high >= max ? null : high] });
      return;
    }
    onChange(kept[way]);
  };
  const onKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.target as HTMLElement).matches("[role=radio]")) return;
    if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const next: Way = value.by === "total" ? "monthly" : "total";
    radios.current[ways.findIndex((way) => way.key === next)]?.focus();
    pick(next);
  };


  const bodyOf = (way: Way): ReactNode =>
    way === "total" ? (
      <RangeHistogram
        min={min}
        max={max}
        step={step}
        value={kept.total.range}
        onChange={(range) => onChange({ by: "total", range })}
        buckets={buckets}
        format={format}
        locale={locale}
        labels={{ low: "Lowest price", high: "Highest price" }}
      />
    ) : (
      <MonthlyBody
        id={id}
        value={kept.monthly}
        onChange={onChange}
        ceiling={ceiling}
        min={min}
        max={max}
        buckets={buckets}
        rate={rate}
        terms={terms}
        format={format}
        locale={locale}
      />
    );

  return (
    <div onKeyDown={onKeys} className={cn("flex flex-col gap-2 pt-0.5", className)} {...props}>
      {/* The group owns only the two radios, not the fields inside the open card. */}
      <div role="radiogroup" aria-label={label} aria-owns={ways.map((way) => `${id}-${way.key}-radio`).join(" ")} className="contents" />
      {ways.map((way, i) => {
        const on = value.by === way.key;
        return (
          <div
            key={way.key}
            data-state={on ? "on" : "off"}
            className={cn(
              "group/way rounded-[16px] border transition-[border-color,background-color] duration-[480ms] motion-reduce:transition-none",
              SMOOTH,
              on
                ? "border-[var(--fu-accent-soft,#8FAAFF)] bg-[var(--fu-selected,#1F2747)] forced-colors:border-[Highlight]"
                : "border-[var(--fu-surface-3,#2A2A2A)] hover:border-[var(--fu-line,#404040)] hover:bg-[var(--fu-item-hover,#2A2A2A)]",
            )}
          >
            <button
              ref={(node) => {
                radios.current[i] = node;
              }}
              id={`${id}-${way.key}-radio`}
              type="button"
              role="radio"
              aria-checked={on}
              aria-describedby={`${id}-${way.key}-line`}
              tabIndex={on ? 0 : -1}
              onClick={() => pick(way.key)}
              className={cn(
                "flex w-full cursor-pointer items-start gap-3 rounded-[15px] p-3 text-start",
                "outline-none focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
                on && "cursor-default",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "relative mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] transition-[border-color,background-color] duration-200 motion-reduce:transition-none",
                  on
                    ? "border-[var(--fu-accent,#3B57E6)] bg-[var(--fu-accent,#3B57E6)]"
                    : "border-[var(--fu-control-border,#737373)] group-hover/way:border-[var(--fu-control-hover,#A3A3A3)]",
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full bg-[var(--fu-on-accent,#FFFFFF)] transition-[scale,opacity] duration-[320ms] motion-reduce:transition-none",
                    "forced-colors:bg-[CanvasText] forced-colors:[forced-color-adjust:none]",
                    SMOOTH,
                    on ? "scale-100 opacity-100" : "scale-0 opacity-0",
                  )}
                />
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[15px] leading-6 font-medium transition-colors duration-200",
                    on ? "text-[var(--fu-accent-pale,#D1DDFF)]" : "text-[var(--fu-text,#F8F5F1)]",
                  )}
                >
                  {way.title}
                </span>
                {/* The note says what a way does until it is picked; then it folds away and the way's own fields say it. */}
                <span
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-[480ms] motion-reduce:transition-none",
                    SMOOTH,
                    on ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
                  )}
                >
                  <span className="min-h-0 overflow-hidden">
                    <span id={`${id}-${way.key}-line`} className="block text-[13px] leading-5 text-[var(--fu-dim,#929292)]">
                      {way.line}
                    </span>
                  </span>
                </span>
              </span>
            </button>
            <div
              inert={!on}
              className={cn(
                "grid transition-[grid-template-rows] duration-[480ms] motion-reduce:transition-none",
                SMOOTH,
                on ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className={cn(
                    "px-3 pb-3 transition-[opacity,filter,translate] duration-[480ms] motion-reduce:transition-none",
                    SMOOTH,
                    on ? "translate-y-0 opacity-100 blur-none delay-[120ms]" : "translate-y-1.5 opacity-0 blur-[6px]",
                  )}
                >
                  {bodyOf(way.key)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type MonthlyBodyProps = {
  id: string;
  value: BudgetValue & { by: "monthly" };
  onChange: (value: BudgetValue) => void;
  ceiling: number | null;
  min: number;
  max: number;
  buckets?: readonly number[];
  rate: number;
  terms: readonly number[];
  format: (value: number) => string;
  locale?: string;
};

function MonthlyBody({ id, value, onChange, ceiling, min, max, buckets, rate, terms, format, locale }: MonthlyBodyProps) {
  const set = (patch: Partial<BudgetValue & { by: "monthly" }>) => onChange({ ...value, ...patch });
  const formats = formatsFor(locale);
  const rateText = formats.percent(rate);
  const read = (text: string) => {
    const typed = formats.readNumber(text);
    return typed === null ? null : Math.round(typed);
  };
  return (
    <div className="pt-1">
      <p aria-live="polite" className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] leading-5 text-[var(--fu-accent-soft,#8FAAFF)]">Top price</span>
        <span className="text-[20px] leading-7 font-semibold text-[var(--fu-text,#F8F5F1)] tabular-nums">
          <TextSwap>{ceiling === null ? "–" : format(ceiling)}</TextSwap>
          {ceiling === null && <span className="sr-only">, type what you can pay each month</span>}
        </span>
      </p>
      <CeilingBars buckets={buckets} min={min} max={max} ceiling={ceiling} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MoneyField label="Each month" value={value.monthly} placeholder={format(0)} onCommit={(monthly) => set({ monthly })} format={format} read={read} />
        <MoneyField label="Down payment" value={value.down || null} placeholder={format(0)} onCommit={(down) => set({ down: down ?? 0 })} format={format} read={read} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span id={`${id}-term`} className="shrink-0 text-[13px] leading-5 text-[var(--fu-mute,#BDBDBD)]">
          Months
        </span>
        <Segmented
          label="Term in months"
          aria-describedby={`${id}-term`}
          options={terms.map((t) => ({ value: t, label: formats.plain(t) }))}
          value={value.term}
          onChange={(term) => set({ term })}
          className="min-w-0 flex-1 bg-[var(--fu-well,rgb(0_0_0/0.22))]"
        />
      </div>
      <p className="mt-3 text-[12px] leading-4 text-[var(--fu-dim,#929292)]">
        Example estimate at {rateText} a year.
      </p>
    </div>
  );
}

// The price bars with the top price drawn across them. When it moves, the bars it passes light or dim one after another.
function CeilingBars({ buckets, min, max, ceiling }: { buckets?: readonly number[]; min: number; max: number; ceiling: number | null }) {
  const [last, setLast] = useState<{ now: number | null; before: number | null }>({ now: ceiling, before: ceiling });
  if (last.now !== ceiling) setLast({ now: ceiling, before: last.now });
  if (!buckets?.length) return null;

  const span = max - min || 1;
  const at = (price: number | null) => (price === null ? 0 : Math.min(1, Math.max(0, (price - min) / span)));
  const fraction = at(ceiling);
  const from = at(last.before);
  const tallest = Math.max(1, ...buckets);
  const n = buckets.length;

  return (
    <div aria-hidden="true" className="relative mt-2">
      <div className="flex h-12 items-end gap-[2px]">
        {buckets.map((count, i) => {
          const cover = Math.min(1, Math.max(0, fraction * n - i));
          const lit = cover > 0 ? Math.round((0.35 + 0.65 * cover) * 100) : 0;
          // A bar waits for the line to reach it, so the light runs along the bars instead of switching at once.
          const centre = (i + 0.5) / n;
          const travel = Math.abs(centre - from) / Math.max(0.05, Math.abs(fraction - from));
          const delay = Math.round(Math.min(1, travel) * 360);
          return (
            <span
              key={i}
              className="min-w-0 flex-1 rounded-t-[3px] transition-[background-color] duration-[260ms] motion-reduce:transition-none"
              style={{
                height: `${Math.max(count ? 8 : 3, (count / tallest) * 100)}%`,
                backgroundColor: `color-mix(in srgb, var(--fu-accent-soft,#8FAAFF) ${lit}%, var(--fu-rail,#4A4A4A))`,
                transitionDelay: `${delay}ms`,
              }}
            />
          );
        })}
      </div>
      <span
        className={cn(
          "pointer-events-none absolute -top-1 bottom-0 w-0.5 -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-[var(--fu-accent-pale,#D1DDFF)]",
          "transition-[left,right,opacity] duration-[480ms] motion-reduce:transition-none",
          SMOOTH,
          ceiling === null && "opacity-0",
        )}
        style={{ insetInlineStart: `${fraction * 100}%` } as CSSProperties}
      />
      <div className="h-1 rounded-[2px] bg-[var(--fu-rail,#4A4A4A)]">
        <div
          className={cn("h-full rounded-[2px] bg-[var(--fu-accent-soft,#8FAAFF)] transition-[width] duration-[480ms] motion-reduce:transition-none", SMOOTH)}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
}

type MoneyFieldProps = {
  label: string;
  placeholder: string;
  value: number | null;
  format: (value: number) => string;
  read: (text: string) => number | null;
  onCommit: (value: number | null) => void;
};

// Applies as you type, so the top price moves with each digit; leaving the field tidies the text.
function MoneyField({ label, placeholder, value, format, read, onCommit }: MoneyFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="min-w-0">
      <span aria-hidden="true" className="mb-1.5 block text-[13px] leading-5 text-[var(--fu-mute,#BDBDBD)]">
        {label}
      </span>
      <TextField
      label={label}
      placeholder={placeholder}
      inputMode="numeric"
      autoComplete="off"
      enterKeyHint="done"
      value={draft ?? (value === null ? "" : format(value))}
      onChange={(text) => {
        setDraft(text);
        if (!text.trim()) onCommit(null);
        else {
          const typed = read(text);
          if (typed !== null) onCommit(typed);
        }
      }}
      onClear={() => {
        setDraft(null);
        onCommit(null);
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          setDraft(null);
        }
      }}
      className="pe-2"
      inputClassName="tabular-nums"
      />
    </div>
  );
}
