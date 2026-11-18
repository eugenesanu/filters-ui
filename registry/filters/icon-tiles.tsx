"use client";

import { useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { resultsLabel } from "../lib/format";
import { CountPill } from "../ui/count-pill";
import { foldOptions, ShowAllButton } from "../ui/show-all";
import { ARRIVING, placeholderLabels, Skeleton, SkeletonText, useLoading } from "../ui/skeleton";
import { StatusFrame, type StateProps } from "../ui/status-frame";

export type IconTileOption<V extends string> = {
  value: V;
  label: string;
  /** Any SVG. It draws in currentColor; `var(--tile-bg)` is the tile's own background, for cut-outs. */
  icon: ReactNode;
  count: number;
};

export type IconTilesProps<V extends string> = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> &
  StateProps & {
    options: readonly IconTileOption<V>[];
    value: readonly V[];
    onChange: (value: V[]) => void;
    /** Accessible name of the group. */
    label: string;
    formatCount?: (n: number) => string;
    /** Screen-reader words for a count: "6 results". */
    countLabel?: (n: number) => string;
    /** Formats the counts and their spoken words by default, e.g. "de-DE". Default "en-US". */
    locale?: string;
    /** How many tiles show before "Show all N". Tiles that are on always show. Default 8. */
    collapsedCount?: number;
  };

const TILE = "flex min-w-0 flex-col gap-1.5 rounded-[16px] border px-3 py-2.5 text-start font-[inherit]";
// A long name wraps at its spaces, with the count beside its first line; a single word too long for the tile ends in
// an ellipsis (the tile's accessible name keeps it whole), so a word is never broken in two.
const NAME_ROW = "flex min-w-0 items-start justify-between gap-1";
const NAME = "min-w-0 overflow-hidden text-[14px] leading-5 text-ellipsis text-[var(--fu-text,#F8F5F1)]";

/** Placeholder tiles while the options are on their way. */
const LOADING_TILES = 4;

/**
 * A two-column grid of toggle tiles, each an icon over a name and a count. Several can be on. A long list shows its
 * first collapsedCount tiles, the ones that are on, and "Show all N" for the rest.
 */
export function IconTiles<V extends string>({
  options,
  value,
  onChange,
  label,
  formatCount,
  countLabel: countLabelProp,
  locale,
  collapsedCount = 8,
  status = "ready",
  onRetry,
  errorText,
  emptyText,
  disabled = false,
  className,
  ...props
}: IconTilesProps<V>) {
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
        <div className="grid grid-cols-2 gap-2">
          {loading && options.length === 0
            ? placeholderLabels(LOADING_TILES).map((name, i) => (
                <span key={i} className={cn(TILE, "border-[var(--fu-line,#404040)]")}>
                  <TileIcon>{null}</TileIcon>
                  <span className={NAME_ROW}>
                    <span className={NAME}>
                      <SkeletonText>{name}</SkeletonText>
                    </span>{" "}
                    <CountPill variant="square" count={0} className="mt-px" />
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
                    onBlur={(event) => kept === option.value && !event.currentTarget.matches(":hover") && setKept(null)}
                    onPointerLeave={(event) => kept === option.value && document.activeElement !== event.currentTarget && setKept(null)}
                    onClick={(event) => toggle(option.value, event.currentTarget)}
                    data-state={on ? "on" : "off"}
                    className={cn(
                      TILE,
                      "group/tile cursor-pointer",
                      "bg-[var(--tile-bg)] [--tile-bg:var(--fu-card,#1F1F1F)]",
                      "transition-[background-color,border-color,color,scale,opacity] duration-200 ease-[cubic-bezier(0.42,0,0.58,1)] active:scale-[0.97] active:duration-75 motion-reduce:transition-none",
                      "[&_svg_*]:transition-[fill,stroke] [&_svg_*]:duration-200 motion-reduce:[&_svg_*]:transition-none",
                      "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
                      // While loading, a tile that is on stays on; the others take a quieter edge.
                      on
                        ? "border-[var(--fu-accent-soft,#8FAAFF)] text-[var(--fu-accent-soft,#8FAAFF)] [--tile-bg:var(--fu-selected,#1F2747)]"
                        : loading
                          ? "border-[var(--fu-line,#404040)] text-[var(--fu-mute,#BDBDBD)]"
                          : "border-[var(--fu-control-border,#737373)] text-[var(--fu-mute,#BDBDBD)] enabled:hover:border-[var(--fu-control-hover,#A3A3A3)] enabled:hover:text-[var(--fu-accent-soft,#8FAAFF)] enabled:hover:[--tile-bg:var(--fu-item-hover,#2A2A2A)]",
                      "disabled:cursor-not-allowed",
                      option.count === 0 && !on && !loading && "opacity-40",
                    )}
                  >
                    <TileIcon>{option.icon}</TileIcon>
                    <span aria-hidden="true" className={NAME_ROW}>
                      <span className={NAME}>
                        <SkeletonText>{option.label}</SkeletonText>
                      </span>{" "}
                      <CountPill variant="square" on={on} count={option.count} format={formatCount} locale={locale} className="mt-px" />
                    </span>
                  </button>
                );
              })}
          {folds && <ShowAllButton total={options.length} expanded={all} onToggle={() => setAll(!all)} locale={locale} className="col-span-2 justify-self-start" />}
        </div>
      </StatusFrame>
    </div>
  );
}

/** The icon row: a rounded placeholder of the icon's height while loading; the icon fades in once when it arrives. */
function TileIcon({ children }: { children: ReactNode }) {
  const { loading, arriving } = useLoading();
  return (
    <span key={loading ? "skeleton" : "icon"} aria-hidden="true" className={cn("flex h-7 justify-center [&>svg]:h-7 [&>svg]:w-auto", arriving && ARRIVING)}>
      {loading ? <Skeleton className="h-7 w-16 rounded-[10px]" /> : children}
    </span>
  );
}
