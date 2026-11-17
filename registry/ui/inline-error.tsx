"use client";

import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { buttonClasses } from "./button-classes";
import { CircleAlertIcon } from "./icons";

export const DEFAULT_RETRY_LABEL = "Retry";

/** The error line's layout: the words at the start, Retry at the end, wrapping under them when space runs out. */
export const ERROR_LINE = "flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2";
/** The words: 14px, muted, with a 16px dim alert glyph before them. */
export const ERROR_TEXT = "flex min-w-0 items-start gap-2 text-[14px] leading-5 text-[var(--fu-mute,#BDBDBD)]";

/** The alert glyph that leads the words. Hidden from screen readers. */
export function ErrorGlyph() {
  return <CircleAlertIcon size={16} className="mt-0.5 shrink-0 text-[var(--fu-dim,#929292)]" />;
}

export type RetryButtonProps = {
  onRetry: () => void;
  label?: string;
  className?: string;
};

/**
 * A small grey button that is never shown disabled. Before it calls onRetry it hands focus to the StatusFrame around
 * it, which stays on the page while the content reloads, so focus is never lost with the button.
 */
export function RetryButton({ onRetry, label = DEFAULT_RETRY_LABEL, className }: RetryButtonProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.currentTarget.closest<HTMLElement>("[data-status-frame]")?.focus({ preventScroll: true });
        onRetry();
      }}
      className={buttonClasses({ variant: "secondary", size: "sm", className })}
    >
      {label}
    </button>
  );
}

export type InlineErrorProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  /** One short line in plain words, e.g. "Couldn't load the options." */
  text: string;
  /** Shows Retry. Without it the line stands alone. */
  onRetry?: () => void;
  retryLabel?: string;
};

/**
 * A calm error in the component's own area: one muted line and a Retry button. The line is a polite status region, so
 * it is read out when it appears. Inside a StatusFrame use the frame's status="error" instead: it keeps one region on
 * the page for loading and errors alike.
 */
export function InlineError({ text, onRetry, retryLabel, className, ...props }: InlineErrorProps) {
  return (
    <div className={cn(ERROR_LINE, className)} {...props}>
      <p role="status" className={ERROR_TEXT}>
        <ErrorGlyph />
        <span dir="auto">{text}</span>
      </p>
      {onRetry && <RetryButton onRetry={onRetry} label={retryLabel} />}
    </div>
  );
}
