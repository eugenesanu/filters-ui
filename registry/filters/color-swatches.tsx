"use client";

import { useState, type HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { resultsLabel } from "../lib/format";
import { foldOptions, ShowAllButton } from "../ui/show-all";
import { ARRIVING, placeholderLabels, SKELETON_FILL, SkeletonText, useLoading } from "../ui/skeleton";
import { StatusFrame, type StateProps } from "../ui/status-frame";

export type ColorSwatchOption<V extends string> = {
  value: V;
  label: string;
  /** Any CSS colour for the dot. */
  color: string;
  count: number;
};

export type ColorSwatchesProps<V extends string> = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> &
  StateProps & {
    options: readonly ColorSwatchOption<V>[];
    value: readonly V[];
    onChange: (value: V[]) => void;
    /** Accessible name of the group. */
    label: string;
    /** Screen-reader words for a count: "6 results". */
    countLabel?: (n: number) => string;
    /** Formats the counts and their spoken words by default, e.g. "de-DE". Default "en-US". */
    locale?: string;
    /** How many swatches show before "Show all N". Swatches that are on always show. Default 12. */
    collapsedCount?: number;
  };

const SWATCH = "flex min-w-0 flex-col items-center gap-1 rounded-[12px] pt-3 pb-1 font-[inherit] text-[13px] leading-[18px] text-[var(--fu-swatch-text,#EDEAE6)]";
// A long name wraps at its spaces under the dot, centred; a single word too long for the column ends in an ellipsis
// (the swatch's accessible name keeps it whole), so a word is never broken in two.
const NAME = "max-w-full overflow-hidden px-1 text-center text-ellipsis";

/** Placeholder swatches while the options are on their way. */
const LOADING_SWATCHES = 8;

/**
 * A four-column grid of colour dots with their names. Several can be on. A long list shows its first collapsedCount
 * swatches, the ones that are on, and "Show all N" for the rest.
 */
export function ColorSwatches<V extends string>({
  options,
  value,
  onChange,
  label,
  countLabel: countLabelProp,
  locale,
  collapsedCount = 12,
  status = "ready",
  onRetry,
  errorText,
  emptyText,
  disabled = false,
  className,
  ...props
}: ColorSwatchesProps<V>) {
  const countLabel = countLabelProp ?? ((n: number) => resultsLabel(n, locale));
  // An option turned off at 0 would become disabled under the pointer or keyboard and drop focus; it stays enabled until it loses focus.
  const [kept, setKept] = useState<V | null>(null);
  const toggle = (v: V, button: HTMLButtonElement) => {
    const on = value.includes(v);
    setKept(on && document.activeElement === button ? v : null);
    onChange(on ? value.filter((x) => x !== v) : [...value, v]);
  };

  const [all, setAll] = useState(false);

  const loading = status === "loading";
  const { folds, shown } = foldOptions(options, { collapsedCount, expanded: all, isOn: (o) => value.includes(o.value), loading });

  return (
    <div role="group" aria-label={label} aria-disabled={disabled || undefined} className={className} {...props}>
      <StatusFrame status={status} onRetry={onRetry} errorText={errorText} empty={options.length === 0} emptyText={emptyText} disabled={disabled}>
        <div className="grid grid-cols-4 gap-2">
          {loading && options.length === 0
            ? placeholderLabels(LOADING_SWATCHES).map((name, i) => (
                <span key={i} className={SWATCH}>
                  <Dot color="" on={false} />
                  <span className={NAME}>
                    <SkeletonText>{name.slice(0, 6)}</SkeletonText>
                  </span>
                </span>
              ))
            : shown.map((option) => {
                const on = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${option.label}, ${countLabel(option.count)}`}
                    disabled={option.count === 0 && !on && kept !== option.value}
                    onBlur={() => kept === option.value && setKept(null)}
                    onClick={(event) => toggle(option.value, event.currentTarget)}
                    data-state={on ? "on" : "off"}
                    className={cn(
                      SWATCH,
                      "group/swatch cursor-pointer",
                      "transition-[background-color,scale,opacity] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] active:duration-75 motion-reduce:transition-none",
                      "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
                      on ? "bg-[var(--fu-wash,rgb(255_255_255/0.08))]" : "enabled:hover:bg-[var(--fu-wash,rgb(255_255_255/0.08))]",
                      "disabled:cursor-default",
                      option.count === 0 && !on && !loading && "opacity-40",
                    )}
                  >
                    <Dot color={option.color} on={on} />
                    <span aria-hidden="true" className={NAME}>
                      <SkeletonText>{option.label}</SkeletonText>
                    </span>
                  </button>
                );
              })}
          {folds && <ShowAllButton total={options.length} expanded={all} onToggle={() => setAll(!all)} locale={locale} className="col-span-4 justify-self-start" />}
        </div>
      </StatusFrame>
    </div>
  );
}

/**
 * The 28px dot. While loading it is a round placeholder with no paint (a chosen one keeps its ring); the paint fades in
 * once when it arrives.
 */
function Dot({ color, on }: { color: string; on: boolean }) {
  const { loading, arriving } = useLoading();
  return (
    <span
      key={loading ? "skeleton" : "paint"}
      aria-hidden="true"
      className={cn(
        "size-7 shrink-0 rounded-full border-2",
        "transition-[border-color,box-shadow] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        on
          ? "border-[var(--fu-text,#F8F5F1)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--fu-text,#F8F5F1)_18%,transparent)]"
          : loading
            ? "border-transparent"
            : "border-[var(--fu-control-border,#737373)] shadow-[0_0_0_0_color-mix(in_srgb,var(--fu-text,#F8F5F1)_18%,transparent)] group-enabled/swatch:group-hover/swatch:border-[color-mix(in_srgb,var(--fu-control-border,#737373),var(--fu-text,#F8F5F1))]",
        loading && SKELETON_FILL,
        arriving && ARRIVING,
      )}
      style={loading ? undefined : { backgroundColor: color }}
    />
  );
}
