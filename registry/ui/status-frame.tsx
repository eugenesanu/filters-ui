"use client";

import { useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { EmptyNote } from "./empty-note";
import { ERROR_LINE, ERROR_TEXT, ErrorGlyph, RetryButton } from "./inline-error";
import { LoadingContext } from "./skeleton";

/** Where the data stands: shown, on its way, or failed. */
export type Status = "ready" | "loading" | "error";

/**
 * The state props every item takes, with the same names and meanings everywhere, so a person who has learned one
 * filter knows them all. Spread them into an item's own props type.
 */
export type StateProps = {
  /** "loading" draws placeholders the size of the content; "error" shows errorText with a Retry. Default "ready". */
  status?: Status;
  /** Called by the Retry button. Without it the error line has no button. */
  onRetry?: () => void;
  /** The error line. Default "Couldn't load the options." */
  errorText?: string;
  /** The line shown in place of the options when there are none. Default "No options to show." */
  emptyText?: string;
  /** Dims the whole filter, blocks pointer and keyboard input and says so to screen readers. Default false. */
  disabled?: boolean;
};

export const DEFAULT_ERROR_TEXT = "Couldn't load the options.";
export const DEFAULT_EMPTY_TEXT = "No options to show.";
export const DEFAULT_LOADING_TEXT = "Loading";

/** How long arriving content keeps its fade-in class: a little more than the 300ms fade. */
const ARRIVAL_MS = 400;

type Mode = "ready" | "loading" | "error" | "empty";

export type StatusFrameProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> &
  Omit<StateProps, "emptyText"> & {
    /** There are no options: emptyText shows in place of the content. */
    empty?: boolean;
    emptyText?: ReactNode;
    /** Words read once while loading. Default "Loading". */
    loadingText?: string;
    /** Reads loading and errors out. A block that holds several filters turns it off on each and says it once itself. Default true. */
    announce?: boolean;
    retryLabel?: string;
    children: ReactNode;
  };

/**
 * Wraps an item's content and gives it the shared states.
 * - loading: the content stays drawn, inert and busy, and its Skeleton, SkeletonText and CountPill pieces draw as
 *   placeholders of their real size, so nothing moves when the data arrives; the data then fades in once.
 * - error: one calm line and a Retry in place of the content. Loading and errors are read out through one polite
 *   status region that stays on the page.
 * - empty: a quiet note in place of the content.
 * - disabled: dimmed, no pointer or keyboard input (a disabled fieldset turns off every native control inside), and
 *   read as unavailable. Custom focusable parts, such as a grid's cells, also need tabIndex -1 and aria-disabled.
 * When a state change takes away the control that had focus, the frame takes focus, so it is never lost.
 */
export function StatusFrame({
  status = "ready",
  onRetry,
  errorText = DEFAULT_ERROR_TEXT,
  empty = false,
  emptyText = DEFAULT_EMPTY_TEXT,
  disabled = false,
  loadingText = DEFAULT_LOADING_TEXT,
  announce = true,
  retryLabel,
  className,
  children,
  ...props
}: StatusFrameProps) {
  const frame = useRef<HTMLDivElement>(null);
  const mode: Mode = status === "loading" ? "loading" : status === "error" ? "error" : empty ? "empty" : "ready";

  // The data arrives when loading turns to ready: its pieces fade in once, then go back to plain content.
  const [lastStatus, setLastStatus] = useState(status);
  const [arriving, setArriving] = useState(false);
  if (status !== lastStatus) {
    setLastStatus(status);
    setArriving(lastStatus === "loading" && status === "ready");
  }
  useEffect(() => {
    if (!arriving) return;
    const timer = setTimeout(() => setArriving(false), ARRIVAL_MS);
    return () => clearTimeout(timer);
  }, [arriving]);

  // Whether focus sat on a control inside, read just before a change of state is drawn.
  const key = `${mode}|${disabled}`;
  const drawnKey = useRef(key);
  const focusWasInside = useRef(false);
  if (key !== drawnKey.current && typeof document !== "undefined") {
    const active = document.activeElement;
    focusWasInside.current = !!frame.current && !!active && active !== frame.current && frame.current.contains(active);
  }
  useLayoutEffect(() => {
    if (drawnKey.current === key) return;
    drawnKey.current = key;
    if (!focusWasInside.current) return;
    focusWasInside.current = false;
    const node = frame.current;
    // The focused control was removed, made inert or disabled: the frame keeps focus instead of the page.
    if (node && (mode !== "ready" || disabled || !node.contains(document.activeElement))) node.focus({ preventScroll: true });
  });

  const said = mode === "loading" ? loadingText : mode === "error" ? errorText : "";

  return (
    <div
      ref={frame}
      tabIndex={-1}
      data-status-frame=""
      data-status={mode}
      aria-busy={mode === "loading" || undefined}
      className={cn(
        "min-w-0 rounded-[12px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
        disabled && "pointer-events-none opacity-50 select-none",
        className,
      )}
      {...props}
    >
      <LoadingContext.Provider value={{ loading: mode === "loading", arriving }}>
        {mode === "empty" ? (
          <EmptyNote>{emptyText}</EmptyNote>
        ) : mode === "error" ? null : (
          // display: contents, so the fieldset adds no box; while disabled it turns off every native control inside.
          <fieldset role="none" disabled={disabled} inert={mode === "loading"} className="contents">
            {children}
          </fieldset>
        )}
      </LoadingContext.Provider>
      {/* One region for loading and errors, on the page in every state, so each change is read out. The words take
          their own direction, so an English sentence keeps its full stop at its end on a right-to-left page. */}
      <div className={mode === "error" ? ERROR_LINE : "contents"}>
        <p role={announce ? "status" : undefined} className={mode === "error" ? ERROR_TEXT : "sr-only"}>
          {mode === "error" && <ErrorGlyph />}
          {said && <span dir="auto">{said}</span>}
        </p>
        {mode === "error" && onRetry && <RetryButton onRetry={onRetry} label={retryLabel} />}
      </div>
    </div>
  );
}
