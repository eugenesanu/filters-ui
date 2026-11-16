"use client";

import { useId, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { ChevronDownIcon } from "./icons";

export type FilterCardProps = Omit<HTMLAttributes<HTMLElement>, "title" | "children"> & {
  title: string;
  /** The value in words ("Under $45k"). Shown on the closed card; null or empty means the filter is unset. */
  summary?: string | null;
  /** Clears this one filter. When given, a Clear button takes the summary's place while open or hovered. */
  onClear?: () => void;
  /** Controlled open state. Leave undefined to let the card manage it. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Looks like a closed card but cannot be opened or focused, e.g. a filter whose body is not ready. */
  disabled?: boolean;
  /** Accessible name of the Clear button. Default "Clear {title}". */
  clearLabel?: string;
  /** Heading level wrapping the head button. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  bodyClassName?: string;
  children?: ReactNode;
};

const SMOOTH = "ease-[cubic-bezier(0.22,1,0.36,1)]";

// The summary and Clear share one slot and trade places over 150ms through a 2px blur and 4px shift.
const SUMMARY_HIDDEN = "opacity-0 blur-[2px] -translate-y-1";
const SUMMARY_HIDES_WHEN = [
  "group-data-[state=open]/card:opacity-0 group-data-[state=open]/card:blur-[2px] group-data-[state=open]/card:-translate-y-1",
  "group-hover/slot:opacity-0 group-hover/slot:blur-[2px] group-hover/slot:-translate-y-1",
  "group-focus-within/slot:opacity-0 group-focus-within/slot:blur-[2px] group-focus-within/slot:-translate-y-1",
].join(" ");
// Hovering anywhere on a closed card offers Clear in the summary's place.
const SUMMARY_HIDES_ON_CARD_HOVER = "group-hover/card:opacity-0 group-hover/card:blur-[2px] group-hover/card:-translate-y-1";
const CLEAR_SHOWS_ON_CARD_HOVER = "group-hover/card:opacity-100 group-hover/card:blur-none group-hover/card:translate-y-0";
// A hidden Clear takes no taps: only a pointer that can hover reveals it before a click.
const CLEAR_HIDDEN = "pointer-events-none opacity-0 blur-[2px] translate-y-1 [@media(hover:hover)]:pointer-events-auto";
const CLEAR_SHOWS_WHEN = [
  "group-data-[state=open]/card:pointer-events-auto group-data-[state=open]/card:opacity-100 group-data-[state=open]/card:blur-none group-data-[state=open]/card:translate-y-0",
  "group-hover/slot:opacity-100 group-hover/slot:blur-none group-hover/slot:translate-y-0",
  "group-focus-within/slot:opacity-100 group-focus-within/slot:blur-none group-focus-within/slot:translate-y-0",
].join(" ");

const FOCUS_RING =
  "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]";

/**
 * One filter in a rounded card: a 52px head (title, value summary or Clear, chevron) that opens a body.
 * Opening animates the height over 480ms and reveals the content from a 6px blur, 6px lower.
 */
export function FilterCard({
  title,
  summary,
  onClear,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  clearLabel,
  headingLevel = 3,
  className,
  bodyClassName,
  children,
  ...props
}: FilterCardProps) {
  const id = useId();
  const headId = `${id}-head`;
  const bodyId = `${id}-body`;
  const head = useRef<HTMLButtonElement>(null);
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const open = !disabled && (openProp ?? innerOpen);
  const set = Boolean(summary);

  // The last summary stays in place while it fades out after a clear.
  const [lastSummary, setLastSummary] = useState(summary ?? "");
  if (summary && summary !== lastSummary) setLastSummary(summary);

  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  };

  const Heading = `h${headingLevel}` as const;
  const swap = cn(
    "transition-[opacity,filter,translate] duration-150 ease-in-out motion-reduce:transition-none",
    "group-data-[state=open]/card:duration-[480ms] group-data-[state=open]/card:ease-[cubic-bezier(0.22,1,0.36,1)]",
  );

  return (
    <section
      data-state={open ? "open" : "closed"}
      data-set={set ? "true" : "false"}
      className={cn(
        "not-prose group/card relative overflow-hidden rounded-[24px] border border-[var(--fu-card-border,#2A2A2A)] bg-[var(--fu-card,#1F1F1F)] text-[var(--fu-text,#F8F5F1)]",
        "transition-[background-color,border-color,opacity] duration-200 motion-reduce:transition-none",
        "[@media(hover:hover)]:data-[state=closed]:has-[[data-filter-card-head]:enabled:hover,[data-filter-card-slot]:hover]:border-[var(--fu-line,#404040)] [@media(hover:hover)]:data-[state=closed]:has-[[data-filter-card-head]:enabled:hover,[data-filter-card-slot]:hover]:bg-[var(--fu-card-hover,#262626)]",
        // The head button sits flush in a clipped card, so its focus ring is drawn around the card.
        "has-[[data-filter-card-head]:focus-visible]:outline-2 has-[[data-filter-card-head]:focus-visible]:outline-offset-2 has-[[data-filter-card-head]:focus-visible]:outline-solid has-[[data-filter-card-head]:focus-visible]:outline-[var(--fu-accent-soft,#8FAAFF)]",
        className,
      )}
      {...props}
    >
      <Heading className="m-0 -mb-0.5 text-[15px] font-semibold leading-5 text-[var(--fu-text,#F8F5F1)]">
        <button
          ref={head}
          type="button"
          id={headId}
          data-filter-card-head=""
          aria-expanded={open}
          aria-controls={bodyId}
          disabled={disabled}
          onClick={() => setOpen(!open)}
          className={cn(
            "flex h-[52px] w-full cursor-pointer items-center gap-3 rounded-[23px] px-4 text-left font-[inherit] text-inherit disabled:cursor-default",
            "outline-none",
          )}
        >
          <span className="min-w-0 truncate">{title}</span>
          {set && <span className="sr-only">, {summary}</span>}
          {set && (
            <span aria-hidden="true" className="invisible min-w-0 max-w-[calc((100%+32px)*0.55)] shrink-0 truncate text-[14px] font-normal">
              {summary}
            </span>
          )}
          <ChevronDownIcon
            size={20}
            className={cn(
              "ml-auto shrink-0 text-[var(--fu-mute,#BDBDBD)] group-has-[[data-filter-card-head]:disabled]/card:opacity-40 transition-[rotate] duration-[480ms] motion-reduce:transition-none",
              SMOOTH,
              "group-data-[state=open]/card:rotate-180",
            )}
          />
        </button>
      </Heading>

      {onClear && (
        <div
          inert={!set}
          data-filter-card-slot=""
          className="group/slot pointer-events-none absolute right-[46px] top-4 grid h-5 max-w-[55%] justify-items-end text-[14px] leading-5 text-[var(--fu-accent-soft,#8FAAFF)]"
        >
          <span aria-hidden="true" className={cn("pointer-events-none max-w-full truncate font-normal [grid-area:1/1]", swap, set ? SUMMARY_HIDES_WHEN : SUMMARY_HIDDEN, set && !disabled && SUMMARY_HIDES_ON_CARD_HOVER)}>
            {summary || lastSummary}
          </span>
          <button
            type="button"
            tabIndex={set ? 0 : -1}
            aria-label={clearLabel ?? `Clear ${title.toLowerCase()}`}
            onClick={() => {
              onClear();
              head.current?.focus();
            }}
            className={cn(
              "relative cursor-pointer rounded-[6px] font-medium [grid-area:1/1] before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-['']",
              FOCUS_RING,
              "focus-visible:outline-offset-2",
              swap,
              CLEAR_HIDDEN,
              set && CLEAR_SHOWS_WHEN,
              set && !disabled && CLEAR_SHOWS_ON_CARD_HOVER,
            )}
          >
            Clear
          </button>
        </div>
      )}
      {!onClear && set && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-[46px] top-4 max-w-[55%] truncate text-[14px] leading-5 text-[var(--fu-accent-soft,#8FAAFF)]",
            swap,
            "group-data-[state=open]/card:opacity-0",
          )}
        >
          {summary}
        </span>
      )}

      <div
        id={bodyId}
        role="region"
        aria-labelledby={headId}
        inert={!open}
        className={cn(
          "grid grid-rows-[0fr] transition-[grid-template-rows] duration-[480ms] motion-reduce:transition-none",
          SMOOTH,
          "group-data-[state=open]/card:grid-rows-[1fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              // pt-0.5 makes up the head's -2px margin, so content starts right under the 52px head.
              "px-4 pt-0.5 pb-4",
              "translate-y-1.5 opacity-0 blur-[6px] transition-[opacity,filter,translate] duration-[480ms] motion-reduce:transition-none",
              SMOOTH,
              "group-data-[state=open]/card:translate-y-0 group-data-[state=open]/card:opacity-100 group-data-[state=open]/card:blur-none",
              "group-data-[state=open]/card:delay-[120ms] group-data-[state=open]/card:duration-[460ms] group-data-[state=open]/card:ease-[cubic-bezier(0.16,1,0.3,1)]",
              bodyClassName,
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
