"use client";

import { useId, useRef, useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { formatsFor } from "../lib/format";
import { RangeHistogram } from "./range-histogram";
import { hillAt, type RangeValue } from "../ui/range-chart";
import { Segmented } from "../ui/segmented";
import { ARRIVING, SKELETON_FILL, SkeletonText, useLoading } from "../ui/skeleton";
import { StatusFrame, type StateProps } from "../ui/status-frame";
import { TextField } from "../ui/text-field";
import { TextSwap } from "../ui/text-swap";

/**
 * A budget, set one of two ways. "total": a price range, null for an open end. "monthly": what one can pay each month
 * over a term in months, after a down payment; it stands for a top price worked out with an interest rate.
 */
export type BudgetValue =
  | { by: "total"; range: RangeValue }
  | { by: "monthly"; monthly: number | null; term: number; down: number };

export type BudgetProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> &
  Omit<StateProps, "emptyText"> & {
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
 * payment and turns them into a top price, marked with a pin on the same bars. The picked card opens; the other folds.
 * Loading, the cards keep their titles and the open card draws its bars, top price and fields as placeholders. An error
 * shows its line and Retry in the open card in place of its fields; the cards can still be switched.
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
  status = "ready",
  onRetry,
  errorText = "Couldn't load the prices.",
  disabled = false,
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


  // Each way's body has its own frame for loading and errors, so an error stands in its card and focus stays there; only
  // the open card's frame speaks, so "Loading" is said once.
  const bodyOf = (way: Way, on: boolean): ReactNode =>
    way === "total" ? (
      <RangeHistogram
        status={status}
        onRetry={onRetry}
        errorText={errorText}
        announce={on}
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
      <StatusFrame status={status} onRetry={onRetry} errorText={errorText} announce={on}>
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
      </StatusFrame>
    );

  // The outer frame holds both cards: no input while loading, and dimmed and off while disabled. It says nothing itself.
  return (
    <div onKeyDown={onKeys} className={cn("pt-0.5", className)} {...props}>
      <StatusFrame status={status === "loading" ? "loading" : "ready"} disabled={disabled} announce={false}>
        <div className="flex flex-col gap-2">
          {/* The group owns only the two radios, not the fields inside the open card. */}
          <div
            role="radiogroup"
            aria-label={label}
            aria-owns={ways.map((way) => `${id}-${way.key}-radio`).join(" ")}
            aria-disabled={disabled || undefined}
            className="contents"
          />
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
                    ? "border-[var(--fu-accent-soft,#8FAAFF)] forced-colors:border-[Highlight]"
                    : "border-[var(--fu-line,#404040)] hover:border-[var(--fu-control-border,#737373)] hover:bg-[var(--fu-item-hover,#2A2A2A)]",
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
                      {bodyOf(way.key, on)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </StatusFrame>
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
  // The scales the two fields' drag handles move along: up to the payment that buys the top of the price scale with
  // nothing down, and up to half that price as a down payment.
  const r = rate / 100 / 12;
  const most = Math.ceil((r === 0 ? max / value.term : (max * r) / (1 - Math.pow(1 + r, -value.term))) / 50) * 50;
  return (
    <div className="pt-1">
      <p aria-live="polite" className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] leading-5 text-[var(--fu-mute,#BDBDBD)]">Top price</span>
        <span className="text-[20px] leading-7 font-semibold text-[var(--fu-text,#F8F5F1)] tabular-nums">
          <SkeletonText>
            <TextSwap>{ceiling === null ? "–" : format(ceiling)}</TextSwap>
          </SkeletonText>
          {ceiling === null && <span className="sr-only">, type what you can pay each month</span>}
        </span>
      </p>
      <CeilingBars buckets={buckets} min={min} max={max} ceiling={ceiling} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MoneyField label="Each month" value={value.monthly} placeholder={format(0)} onCommit={(monthly) => set({ monthly })} format={format} read={read} scale={{ max: most, step: 10 }} />
        <MoneyField label="Down payment" value={value.down || null} placeholder={format(0)} onCommit={(down) => set({ down: down ?? 0 })} format={format} read={read} scale={{ max: Math.ceil(max / 1000) * 500, step: 500 }} />
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

// The price bars, lit up to the top price and dim past it, with a pin standing at the cut. The bars are drawn twice,
// lit and dim, each clipped at the cut, so the bar that holds the top price splits exactly there; the clips and the pin
// glide together, so when the top price moves the light runs along the bars with it. While loading they pulse in a soft
// hill with no pin, as the price chart does, and the real bars fade in once when they arrive.
function CeilingBars({ buckets, min, max, ceiling }: { buckets?: readonly number[]; min: number; max: number; ceiling: number | null }) {
  const { loading, arriving } = useLoading();
  if (!buckets || (buckets.length === 0 && !loading)) return null;

  if (loading) {
    const columns = buckets.length || 20;
    return (
      <div aria-hidden="true" className="mt-3">
        <div className="flex h-12 items-end gap-[2px]">
          {Array.from({ length: columns }, (_, i) => (
            <span key={i} className={cn("min-w-0 flex-1 rounded-t-[3px]", SKELETON_FILL)} style={{ height: `${hillAt(i, columns)}%` }} />
          ))}
        </div>
        <div className={cn("h-1 rounded-[2px]", SKELETON_FILL)} />
      </div>
    );
  }

  const span = max - min || 1;
  const fraction = ceiling === null ? 0 : Math.min(1, Math.max(0, (ceiling - min) / span));
  const tallest = Math.max(1, ...buckets);
  // The lit side runs into the pin; the dim side starts a little past it, so the pin stands clear of the dim bars.
  const gap = ceiling === null ? 0 : 2.5;
  const layer = (lit: boolean) => {
    // Neutral, not the accent: these bars and the pin only show the top price and take no press.
    const fill = lit ? "bg-[var(--fu-control-hover,#A3A3A3)]" : "bg-[var(--fu-bar-out,#4A4A4A)]";
    return (
      <div
        className={cn(
          "transition-[clip-path] duration-[480ms] motion-reduce:transition-none",
          SMOOTH,
          lit
            ? "absolute inset-0 [clip-path:inset(0_var(--past)_0_0)] rtl:[clip-path:inset(0_0_0_var(--past))]"
            : "[clip-path:inset(0_0_0_var(--upto))] rtl:[clip-path:inset(0_var(--upto)_0_0)]",
        )}
      >
        <div className="flex h-12 items-end gap-[2px]">
          {buckets.map((count, i) => (
            <span
              key={i}
              className={cn("min-w-0 flex-1 rounded-t-[3px]", fill)}
              style={{ height: `${Math.max(count ? 8 : 3, (count / tallest) * 100)}%` }}
            />
          ))}
        </div>
        <div className={cn("h-1 rounded-[2px]", fill)} />
      </div>
    );
  };

  return (
    <div
      aria-hidden="true"
      className={cn("relative mt-3", arriving && ARRIVING)}
      style={
        {
          "--upto": `calc(${fraction * 100}% + ${gap}px)`,
          "--past": `${(1 - fraction) * 100}%`,
        } as CSSProperties
      }
    >
      {layer(false)}
      {layer(true)}
      <span
        className={cn(
          "pointer-events-none absolute -top-1.5 bottom-0 w-0.5 -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-[var(--fu-text,#F8F5F1)]",
          "forced-colors:bg-[Highlight] forced-colors:[forced-color-adjust:none]",
          "transition-[left,right,opacity] duration-[480ms] motion-reduce:transition-none",
          SMOOTH,
          ceiling === null && "opacity-0",
        )}
        style={{ insetInlineStart: `${fraction * 100}%` }}
      >
        <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-inherit" />
      </span>
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
  /** The top and the step of the scale the field's drag handle moves along, from 0. */
  scale: { max: number; step: number };
};

// Applies as you type, so the top price moves with each digit; leaving the field tidies the text. Dragging its handle
// sets the amount in steps; dragged back to 0 the field is empty again.
function MoneyField({ label, placeholder, value, format, read, onCommit, scale }: MoneyFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="min-w-0">
      <span aria-hidden="true" className="mb-1 block text-[13px] leading-5 text-[var(--fu-mute,#BDBDBD)]">
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
      drag={{
        value,
        min: 0,
        max: scale.max,
        step: scale.step,
        onChange: (dragged) => {
          setDraft(null);
          onCommit(dragged > 0 ? dragged : null);
        },
      }}
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
