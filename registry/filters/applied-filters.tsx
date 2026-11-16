"use client";

import { useCallback, useLayoutEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent } from "react";
import { cn } from "../lib/cn";
import { XIcon } from "../ui/icons";
import { TextSwap } from "../ui/text-swap";

export type AppliedFilter = {
  /** Stable id, handed back to onRemove. */
  key: string;
  /** The filter's name, drawn dim: "Price". */
  label: string;
  /** Its value in words, drawn bright: "$15k to $45k". */
  value: string;
};

export type AppliedFiltersProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  /** The filters in use, in display order. */
  filters: readonly AppliedFilter[];
  /** Called with a filter's key when its chip is pressed. */
  onRemove: (key: string) => void;
  /** When given, Clear all ends the row while two or more filters are in use. */
  onClearAll?: () => void;
  clearAllLabel?: string;
  /** Accessible name of the list. Default "Applied filters". */
  label?: string;
};

type Box = { x: number; y: number; w: number; h: number };

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const CLEAR_KEY = "\u0000clear-all";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const FOCUS =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]";
// Below 44px a touch screen gets a taller invisible target.
const TAP = "pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1.5 pointer-coarse:after:content-['']";
const PRESS =
  "transition-[background-color,color,scale] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] active:duration-75 motion-reduce:transition-none motion-reduce:active:scale-100";

/** How far a running move has carried an element, so a new move starts where it is seen. */
function translateOf(node: HTMLElement) {
  const transform = getComputedStyle(node).transform;
  if (!transform || transform === "none") return { x: 0, y: 0 };
  const matrix = new DOMMatrixReadOnly(transform);
  return { x: matrix.m41, y: matrix.m42 };
}

/**
 * The filters in use as a row of chips, "Price $15k to $45k" with a cross, and Clear all at the end. A removed chip
 * blurs away where it stood while the chips after it glide into the gap, across lines too, and the row's height
 * eases when a line empties. Clear all takes the chips away one after another from the end.
 */
export function AppliedFilters({
  filters,
  onRemove,
  onClearAll,
  clearAllLabel = "Clear all",
  label = "Applied filters",
  className,
  ...props
}: AppliedFiltersProps) {
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const ghosts = useRef<HTMLDivElement>(null);
  const boxes = useRef(new Map<string, Box>());
  const nodes = useRef(new Map<string, HTMLElement>());
  const values = useRef(new Map<string, string>());
  const last = useRef<{ width: number; height: number } | null>(null);
  const focusNext = useRef<{ index: number; from: string } | null>(null);
  const [said, setSaid] = useState("");
  const showClear = Boolean(onClearAll) && filters.length > 1;
  const listKey = filters.map((f) => f.key).join("\n");

  // A chip that leaves is copied into a layer over the row at its old place and fades there; React has already
  // removed the real one, so the row's own layout is always the truth.
  const ghost = useCallback((node: HTMLElement, box: Box, delay: number) => {
    const layer = ghosts.current;
    if (!layer) return;
    const copy = node.cloneNode(true) as HTMLElement;
    copy.removeAttribute("data-key");
    copy.inert = true;
    Object.assign(copy.style, {
      position: "absolute",
      left: `${box.x}px`,
      top: `${box.y}px`,
      width: `${box.w}px`,
      height: `${box.h}px`,
      margin: "0",
      transform: "",
    });
    layer.append(copy);
    const fade = copy.animate(
      [
        { opacity: 1, transform: "scale(1)", filter: "blur(0)" },
        { opacity: 0, transform: "scale(0.86)", filter: "blur(2px)" },
      ],
      { duration: 200, delay, easing: "cubic-bezier(0.42, 0, 0.58, 1)", fill: "both" },
    );
    fade.onfinish = () => copy.remove();
    fade.oncancel = () => copy.remove();
  }, []);

  const observer = useRef<ResizeObserver | null>(null);

  const reflow = useCallback(() => {
    const wrap = root.current;
    const row = list.current;
    if (!wrap || !row) return;
    const width = row.offsetWidth;
    const animate = last.current !== null && last.current.width === width && !reducedMotion();
    const seen = new Set<string>();
    const entering: HTMLElement[] = [];
    const changed: HTMLElement[] = [];

    for (const node of Array.from(row.children) as HTMLElement[]) {
      const key = node.dataset.key;
      if (!key) continue;
      seen.add(key);
      const next = { x: node.offsetLeft, y: node.offsetTop, w: node.offsetWidth, h: node.offsetHeight };
      const prev = boxes.current.get(key);
      // Only a change of place moves a chip; a running move is picked up where it is seen, not restarted.
      if (animate && prev && (prev.x !== next.x || prev.y !== next.y)) {
        const now = translateOf(node);
        const dx = prev.x + now.x - next.x;
        const dy = prev.y + now.y - next.y;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          node.getAnimations().forEach((animation) => animation.id === "move" && animation.cancel());
          const move = node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], {
            duration: 420,
            easing: EASE,
          });
          move.id = "move";
        }
      } else if (animate && !prev) {
        entering.push(node);
      }
      const value = node.dataset.value;
      if (animate && value !== undefined && values.current.get(key) !== value) changed.push(node);
      if (value !== undefined) values.current.set(key, value);
      boxes.current.set(key, next);
      nodes.current.set(key, node);
    }

    // The last chip leaves first, so Clear all reads as the row folding back towards its start.
    const gone = [...boxes.current.entries()].filter(([key]) => !seen.has(key)).sort(([, a], [, b]) => b.y - a.y || b.x - a.x);
    gone.forEach(([key, box], i) => {
      const node = nodes.current.get(key);
      if (node) observer.current?.unobserve(node);
      if (animate && node) ghost(node, box, i * 40);
      boxes.current.delete(key);
      nodes.current.delete(key);
      values.current.delete(key);
    });

    entering.forEach((node, i) =>
      node.animate(
        [
          { opacity: 0, transform: "scale(0.9)", filter: "blur(2px)" },
          { opacity: 1, transform: "scale(1)", filter: "blur(0)" },
        ],
        { duration: 260, delay: 80 + i * 40, easing: EASE, fill: "backwards" },
      ),
    );

    // A chip that arrives or changes value starts in the selected blue and settles, so the eye finds what changed.
    for (const node of changed) {
      const chip = node.querySelector<HTMLElement>("button");
      if (!chip) continue;
      const style = getComputedStyle(chip);
      const tint = style.getPropertyValue("--fu-selected").trim() || "#1F2747";
      const pale = style.getPropertyValue("--fu-accent-pale").trim() || "#D1DDFF";
      chip.animate([{ backgroundColor: tint }], { duration: 1600, easing: EASE });
      chip.querySelector<HTMLElement>("[data-chip-value]")?.animate([{ color: pale }], { duration: 1600, easing: EASE });
    }

    const height = row.offsetHeight;
    if (animate && last.current && last.current.height !== height) {
      const running = wrap.getAnimations().find((animation) => animation.id === "height");
      const from = running ? wrap.getBoundingClientRect().height : last.current.height;
      running?.cancel();
      // Shrinking waits for the leaving chips to fade, so what sits below never slides over them.
      const wait = height < from && gone.length ? Math.min(gone.length - 1, 6) * 40 + 140 : 0;
      const ease = wrap.animate([{ height: `${from}px` }, { height: `${height}px` }], { duration: 420, delay: wait, easing: EASE, fill: "backwards" });
      ease.id = "height";
    }
    last.current = { width, height };
  }, [ghost]);

  // A value that changes width (its text swaps over ~300ms) moves the chips after it too.
  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    observer.current = new ResizeObserver(() => reflow());
    return () => observer.current?.disconnect();
  }, [reflow]);

  useLayoutEffect(() => {
    reflow();
    const row = list.current;
    if (row && observer.current) {
      observer.current.observe(row);
      for (const node of Array.from(row.children)) observer.current.observe(node);
    }
    const pending = focusNext.current;
    if (pending && pending.from !== listKey) {
      focusNext.current = null;
      const buttons = row ? Array.from(row.querySelectorAll<HTMLButtonElement>("button")) : [];
      (pending.index < 0 ? root.current : (buttons[Math.min(pending.index, buttons.length - 1)] ?? root.current))?.focus();
    }
  });

  const remove = (filter: AppliedFilter, index: number) => {
    focusNext.current = { index, from: listKey };
    setSaid(`${filter.label} removed`);
    onRemove(filter.key);
  };

  const clearAll = () => {
    focusNext.current = { index: -1, from: listKey };
    setSaid("All filters removed");
    onClearAll?.();
  };

  // Left and Right step between chips; Backspace or Delete removes the one in focus.
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      buttons[Math.max(0, Math.min(buttons.length - 1, at + (event.key === "ArrowRight" ? 1 : -1)))].focus();
    } else if ((event.key === "Backspace" || event.key === "Delete") && at < filters.length) {
      event.preventDefault();
      remove(filters[at], at);
    }
  };

  return (
    <div ref={root} tabIndex={-1} className={cn("not-prose relative outline-none", className)} {...props}>
      {/* Under the row, so chips that glide into a gap pass over the one fading out. */}
      <div ref={ghosts} aria-hidden="true" className="pointer-events-none absolute inset-0" />
      <ul ref={list} aria-label={label} onKeyDown={onKeyDown} className="relative m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {filters.map((filter, index) => (
          <li key={filter.key} data-key={filter.key} data-value={filter.value} className="flex max-w-full">
            <button
              type="button"
              aria-label={`Remove ${filter.label}: ${filter.value}`}
              onClick={() => remove(filter, index)}
              className={cn(
                "group/chip relative inline-flex h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-[9px] pr-1.5 pl-3 font-[inherit] text-[14px] leading-5 whitespace-nowrap",
                "bg-[var(--fu-surface-3,#2A2A2A)] [@media(hover:hover)]:hover:bg-[var(--fu-hover,#333333)]",
                PRESS,
                FOCUS,
                TAP,
              )}
            >
              <span aria-hidden="true" className="shrink-0 text-[var(--fu-dim,#8C8C8C)]">
                {filter.label}
              </span>
              <TextSwap aria-hidden="true" data-chip-value="" className="min-w-0 font-medium text-[var(--fu-text,#F8F5F1)]">
                {filter.value}
              </TextSwap>
              <span
                aria-hidden="true"
                className={cn(
                  "ml-0.5 flex size-5 shrink-0 items-center justify-center rounded-[6px] text-[var(--fu-dim,#8C8C8C)] transition-[color,background-color] duration-200",
                  "group-hover/chip:bg-[var(--fu-line,#404040)] group-hover/chip:text-[var(--fu-text,#F8F5F1)] group-focus-visible/chip:text-[var(--fu-text,#F8F5F1)]",
                )}
              >
                <XIcon size={14} strokeWidth={2.25} />
              </span>
            </button>
          </li>
        ))}
        {showClear && (
          <li role="none" data-key={CLEAR_KEY} className="flex">
            <button
              type="button"
              onClick={clearAll}
              className={cn(
                "relative inline-flex h-8 cursor-pointer items-center rounded-[9px] px-2.5 font-[inherit] text-[14px] font-medium leading-5 whitespace-nowrap",
                "text-[var(--fu-mute,#BDBDBD)] hover:bg-[var(--fu-hover-wash,rgb(255_255_255/0.14))] hover:text-[var(--fu-text,#F8F5F1)]",
                PRESS,
                FOCUS,
                TAP,
              )}
            >
              {clearAllLabel}
            </button>
          </li>
        )}
      </ul>
      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </div>
  );
}
