"use client";

import { createContext, useContext, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";

/** What StatusFrame tells the pieces under it: draw placeholders, or the data has just arrived and fades in once. */
export type LoadingState = { loading: boolean; arriving: boolean };

export const LoadingContext = createContext<LoadingState>({ loading: false, arriving: false });

/** The loading state of the nearest StatusFrame. Outside one, nothing is loading. */
export const useLoading = () => useContext(LoadingContext);

/**
 * The placeholder fill: --fu-skeleton, pulsing to half of it every 2s (Tailwind's animate-pulse). It holds still when
 * reduced motion is asked for, and turns to the system's grey text colour in forced colours, so it never vanishes.
 */
export const SKELETON_FILL =
  "animate-pulse bg-[var(--fu-skeleton,rgb(255_255_255/0.12))] motion-reduce:animate-none forced-colors:bg-[GrayText] forced-colors:[forced-color-adjust:none]";

/** Content that has just replaced a placeholder: it fades in once over 300ms as it is inserted, and never again. */
export const ARRIVING = "transition-opacity duration-300 ease-out starting:opacity-0 motion-reduce:transition-none";

export type SkeletonProps = HTMLAttributes<HTMLSpanElement>;

/**
 * A pulsing placeholder block with no size of its own: give it the size and corners of what it stands for, from the
 * same classes, e.g. "h-5 min-w-[22px] rounded-[6px]" for a count pill. Hidden from screen readers; the StatusFrame
 * around it says "Loading" once.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return <span aria-hidden="true" data-skeleton="" className={cn("block rounded-[6px]", SKELETON_FILL, className)} {...props} />;
}

export type SkeletonTextProps = {
  children: ReactNode;
  /** Draws the placeholder. Default: the nearest StatusFrame's loading state. */
  loading?: boolean;
  /** Classes for the placeholder's box while loading. */
  className?: string;
};

/**
 * Words that draw as a rounded bar while loading. The words stay in the layout, unseen, so the bar is exactly as wide
 * and as many lines tall as they are, and nothing moves when they arrive; then they fade in once.
 */
export function SkeletonText({ children, loading, className }: SkeletonTextProps) {
  const state = useLoading();
  if (loading ?? state.loading) {
    return (
      <span key="skeleton" className={cn("relative inline-block max-w-full align-top", className)}>
        <span className="invisible">{children}</span>
        <Skeleton className="absolute inset-x-0 inset-y-[0.22lh] rounded-[4px]" />
      </span>
    );
  }
  if (state.arriving) {
    return (
      <span key="arrived" className={ARRIVING}>
        {children}
      </span>
    );
  }
  return <>{children}</>;
}

/**
 * Stand-in names for a list whose options have not come yet: a mix of lengths, so the placeholders do not read as a
 * grid. Never shown; only their widths are.
 */
export function placeholderLabels(count: number): string[] {
  const words = ["Placeholder", "Short", "A longer name", "Medium one", "Tiny", "Another name", "Middle", "Fairly long one"];
  return Array.from({ length: count }, (_, i) => words[i % words.length]);
}
