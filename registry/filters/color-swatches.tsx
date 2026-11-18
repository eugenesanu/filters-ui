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
// Forced colours drop fills, so a chosen swatch takes the system highlight. Its colours stay as given: left to the
// browser, its name would sit on a backplate in the page colour.
const FORCED_ON =
  "forced-colors:bg-[Highlight] forced-colors:text-[HighlightText] forced-colors:[forced-color-adjust:none] forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[CanvasText]";

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
  // An option turned off under the pointer or keyboard would become disabled at 0, or leave a folded list, and drop
  // focus; it stays as it is until focus and the pointer have both left it.
  const [kept, setKept] = useState<V | null>(null);
  const toggle = (v: V, button: HTMLButtonElement) => {
    const on = value.includes(v);
    setKept(on && (document.activeElement === button || button.matches(":hover")) ? v : null);
    onChange(on ? value.filter((x) => x !== v) : [...value, v]);
  };

  const [all, setAll] = useState(false);

  // Its own status, or the loading frame of an item around it, such as a block's card.
  const loading = useLoading().loading || status === "loading";
  const { folds, shown } = foldOptions(options, {
    collapsedCount,
    expanded: all,
    isOn: (o) => value.includes(o.value),
    isKept: (o) => kept === o.value,
    loading,
  });

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
                // Nothing has this colour with the other filters as they are.
                const none = option.count === 0 && !on && !loading;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${option.label}, ${countLabel(option.count)}`}
                    disabled={option.count === 0 && !on && kept !== option.value}
                    onBlur={(event) => kept === option.value && !event.currentTarget.matches(":hover") && setKept(null)}
                    onPointerLeave={(event) => kept === option.value && document.activeElement !== event.currentTarget && setKept(null)}
                    onClick={(event) => toggle(option.value, event.currentTarget)}
                    data-state={on ? "on" : "off"}
                    className={cn(
                      SWATCH,
                      "group/swatch relative cursor-pointer",
                      "transition-[background-color,scale,opacity] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] active:duration-75 motion-reduce:transition-none",
                      "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
                      on ? "bg-[var(--fu-wash,rgb(255_255_255/0.08))]" : "enabled:hover:bg-[var(--fu-wash,rgb(255_255_255/0.08))]",
                      "disabled:cursor-not-allowed",
                      none && "opacity-40 disabled:hover:opacity-80",
                      on && FORCED_ON,
                    )}
                  >
                    <Dot color={option.color} on={on} />
                    <span
                      aria-hidden="true"
                      className={cn(NAME, none && "transition-opacity duration-150 motion-reduce:transition-none group-disabled/swatch:group-hover/swatch:opacity-0")}
                    >
                      <SkeletonText>{option.label}</SkeletonText>
                    </span>
                    {/* A swatch shows no count, so pointing at one that is off says why, on its name's first line. */}
                    {none && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 top-11 truncate px-1 text-center opacity-0 transition-opacity duration-150 motion-reduce:transition-none group-disabled/swatch:group-hover/swatch:opacity-100"
                      >
                        {countLabel(0)}
                      </span>
                    )}
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
          ? "border-[var(--fu-text,#F8F5F1)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--fu-text,#F8F5F1)_18%,transparent)] forced-colors:border-[HighlightText]"
          : loading
            ? "border-transparent"
            : "border-[var(--fu-control-border,#737373)] shadow-[0_0_0_0_color-mix(in_srgb,var(--fu-text,#F8F5F1)_18%,transparent)] group-enabled/swatch:group-hover/swatch:border-[color-mix(in_srgb,var(--fu-control-border,#737373),var(--fu-text,#F8F5F1))]",
        // A swatch's paint is its meaning, so forced colours keep it.
        loading ? SKELETON_FILL : "forced-colors:[forced-color-adjust:none]",
        arriving && ARRIVING,
      )}
      style={loading ? undefined : { backgroundColor: color }}
    />
  );
}
