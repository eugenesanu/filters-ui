"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode, type RefObject } from "react";
import { cn } from "../lib/cn";
import { SEARCH_ART } from "./art-search";
import { EmptyNote } from "./empty-note";
import { EmptyState } from "./empty-state";
import { ERROR_LINE, ERROR_TEXT, ErrorGlyph, RetryButton } from "./inline-error";
import { LoadingContext, useLoading } from "./skeleton";

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
  /** The line shown in place of the options when there are none. Default "No options to show" */
  emptyText?: string;
  /** Dims the whole filter, blocks pointer and keyboard input and says so to screen readers. Default false. */
  disabled?: boolean;
};

export const DEFAULT_ERROR_TEXT = "Couldn't load the options.";
export const DEFAULT_EMPTY_TEXT = "No options to show";
export const DEFAULT_LOADING_TEXT = "Loading";

/** How long arriving content keeps its fade-in class: a little more than the 300ms fade. */
const ARRIVAL_MS = 400;

type Mode = "ready" | "loading" | "error" | "empty";

/** A frame around this one is loading and has said "Loading": this one then draws its placeholders without saying it again. */
const SaidLoading = createContext(false);

export type StatusFrameProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> &
  Omit<StateProps, "emptyText"> & {
    /** There are no options: emptyText shows in place of the content. */
    empty?: boolean;
    emptyText?: ReactNode;
    /** The picture above emptyText: an image address or a node. Default: the search picture. null draws the words alone as one quiet line, for a tight place. */
    emptyArt?: string | ReactNode | null;
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
 * - empty: a picture and one line in place of the content (or the line alone, with emptyArt null).
 * - disabled: dimmed, no pointer or keyboard input (a disabled fieldset turns off every native control inside), and
 *   read as unavailable. Custom focusable parts, such as a grid's cells, also need tabIndex -1 and aria-disabled.
 * When a state change takes away the control that had focus, the frame takes focus, so it is never lost.
 * A frame inside a loading frame draws its placeholders too, and does not say "Loading" again when that frame has said
 * it. So a block can load every filter in it with one quiet frame per card (announce false) and say it once in its head
 * with StatusLine; and a filter whose error must leave its title in place can take loading and disabled on a quiet outer
 * frame and let an inner frame around the part that fails speak.
 */
export function StatusFrame({
  status = "ready",
  onRetry,
  errorText = DEFAULT_ERROR_TEXT,
  empty = false,
  emptyText = DEFAULT_EMPTY_TEXT,
  emptyArt,
  disabled = false,
  loadingText = DEFAULT_LOADING_TEXT,
  announce = true,
  retryLabel,
  className,
  children,
  ...props
}: StatusFrameProps) {
  const frame = useRef<HTMLDivElement>(null);
  const outer = useLoading();
  const saidAbove = useContext(SaidLoading);
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
      <SaidLoading.Provider value={saidAbove || (mode === "loading" && announce)}>
        <LoadingContext.Provider value={{ loading: mode === "loading" || outer.loading, arriving: arriving || outer.arriving }}>
          {mode === "empty" ? (
            emptyArt === null ? (
              <EmptyNote>{emptyText}</EmptyNote>
            ) : (
              <EmptyState art={emptyArt ?? SEARCH_ART} title={emptyText} className="py-5" />
            )
          ) : mode === "error" ? null : (
            // display: contents, so the fieldset adds no box; while disabled it turns off every native control inside.
            <fieldset role="none" disabled={disabled} inert={mode === "loading"} className="contents">
              {children}
            </fieldset>
          )}
        </LoadingContext.Provider>
      </SaidLoading.Provider>
      <StatusLine
        status={mode === "loading" || mode === "error" ? mode : "ready"}
        onRetry={onRetry}
        errorText={errorText}
        loadingText={saidAbove ? "" : loadingText}
        announce={announce}
        retryLabel={retryLabel}
      />
    </div>
  );
}

export type StatusLineProps = {
  status?: Status;
  /** Called by Retry. Without it the error line has no button. */
  onRetry?: () => void;
  errorText?: string;
  loadingText?: string;
  /** Reads loading and errors out. Off, it leaves "Loading" out and still shows an error. Default true. */
  announce?: boolean;
  retryLabel?: string;
  /** Classes for the line while it shows an error, e.g. its margins. */
  className?: string;
};

/**
 * What a StatusFrame says, on its own: one polite region, on the page in every state so each change is read out.
 * Loading is read as "Loading" and not shown; an error shows as one calm line with Retry; ready says nothing and takes
 * no space. A block that keeps its cards in every state puts it in its head, to say the state once for all of them.
 * Retry hands focus to the nearest element marked data-status-frame (with tabIndex -1) around it.
 */
export function StatusLine({
  status = "ready",
  onRetry,
  errorText = DEFAULT_ERROR_TEXT,
  loadingText = DEFAULT_LOADING_TEXT,
  announce = true,
  retryLabel,
  className,
}: StatusLineProps) {
  const error = status === "error";
  const said = status === "loading" ? (announce ? loadingText : "") : error ? errorText : "";
  return (
    // The words take their own direction, so an English sentence keeps its full stop at its end on a right-to-left page.
    <div className={error ? cn(ERROR_LINE, className) : "contents"}>
      <p role={announce ? "status" : undefined} className={error ? ERROR_TEXT : "sr-only"}>
        {error && <ErrorGlyph />}
        {said && <span dir="auto">{said}</span>}
      </p>
      {error && onRetry && <RetryButton onRetry={onRetry} label={retryLabel} />}
    </div>
  );
}

/**
 * For a block that leaves controls out by state, such as Clear all while it is disabled: when a change of `key` takes
 * away the control that had focus inside `scope`, `target` (default `scope`, with tabIndex -1) takes focus, so it is
 * never dropped to the page.
 */
export function useFocusKept(scope: RefObject<HTMLElement | null>, key: string, target: RefObject<HTMLElement | null> = scope) {
  const drawn = useRef(key);
  const had = useRef(false);
  if (key !== drawn.current && typeof document !== "undefined") {
    const active = document.activeElement;
    had.current = !!scope.current && !!active && scope.current.contains(active);
  }
  useLayoutEffect(() => {
    if (drawn.current === key) return;
    drawn.current = key;
    if (!had.current) return;
    had.current = false;
    const node = scope.current;
    if (node && !node.contains(document.activeElement)) target.current?.focus({ preventScroll: true });
  });
}
