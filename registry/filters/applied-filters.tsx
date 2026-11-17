"use client";

import { useCallback, useLayoutEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent } from "react";
import { cn } from "../lib/cn";
import { isRtl, readingKey } from "../lib/direction";
import { EmptyNote } from "../ui/empty-note";
import { XIcon } from "../ui/icons";
import { StatusFrame, type StateProps } from "../ui/status-frame";
import { TextSwap } from "../ui/text-swap";

export type AppliedFilter = {
  /** Stable id, handed back to onRemove. */
  key: string;
  /** The filter's name, drawn dim: "Price". */
  label: string;
  /** Its value in words, drawn bright: "$15k to $45k". */
  value: string;
};

export type AppliedFiltersProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> &
  Pick<StateProps, "disabled"> & {
  /** The filters in use, in display order. */
  filters: readonly AppliedFilter[];
  /** Called with a filter's key when its chip is pressed. */
  onRemove: (key: string) => void;
  /** When given, Clear all ends the row while two or more filters are in use. It is left out while disabled. */
  onClearAll?: () => void;
  clearAllLabel?: string;
  /** Accessible name of the list. Default "Applied filters". */
  label?: string;
  /** The quiet line shown in place of the chips while no filter is in use. Default "No filters applied." */
  emptyText?: string;
};

type Box = { x: number; y: number; w: number; h: number };

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const CLEAR_KEY = "\u0000clear-all";
// A changed chip flashes these; when the page sets no --fu-* variables the fallbacks inside are used.
const TINT = "var(--fu-selected,#1F2747)";
const PALE = "var(--fu-accent-pale,#D1DDFF)";
const fallbackOf = (value: string) => value.slice(value.indexOf(",") + 1, -1);

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
 * eases when a line empties. Clear all takes the chips away one after another from the end. With no filter in use a
 * quiet line takes the row's place, fading in once the last chip has gone. A value too long for the row is cut with
 * an ellipsis, and the chip then shows it whole on hover.
 */
export function AppliedFilters({
  filters,
  onRemove,
  onClearAll,
  clearAllLabel = "Clear all",
  label = "Applied filters",
  emptyText = "No filters applied.",
  disabled = false,
  className,
  ...props
}: AppliedFiltersProps) {
  const root = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const note = useRef<HTMLDivElement>(null);
  const noteWas = useRef<{ node: HTMLElement; box: Box } | null>(null);
  const ghosts = useRef<HTMLDivElement>(null);
  const boxes = useRef(new Map<string, Box>());
  const nodes = useRef(new Map<string, HTMLElement>());
  const values = useRef(new Map<string, string>());
  const last = useRef<{ width: number; height: number; rtl: boolean } | null>(null);
  const focusNext = useRef<{ index: number; from: string } | null>(null);
  const [said, setSaid] = useState("");
  // Clear all cannot run while disabled, so it is left out; focus on it moves to the row's frame.
  const showClear = Boolean(onClearAll) && filters.length > 1 && !disabled;
  const listKey = filters.map((f) => f.key).join("\n");

  // A chip, or Clear all, that goes away with focus on it because the filters changed elsewhere hands focus on as a
  // removal does: to the chip now in its place, or to the row.
  const drawnKey = useRef(listKey);
  if (drawnKey.current !== listKey) {
    const active = typeof document === "undefined" ? null : document.activeElement;
    const item = active instanceof HTMLElement && list.current?.contains(active) ? active.closest<HTMLElement>("[data-key]") : null;
    const was = drawnKey.current.split("\n");
    const stays = item?.dataset.key === CLEAR_KEY ? showClear : filters.some((f) => f.key === item?.dataset.key);
    if (item && !stays && !focusNext.current) {
      focusNext.current = { index: item.dataset.key === CLEAR_KEY ? was.length : was.indexOf(item.dataset.key ?? ""), from: drawnKey.current };
    }
    drawnKey.current = listKey;
  }

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
    const content = box.current;
    if (!wrap || !row || !content) return;
    const width = row.offsetWidth;
    const rtl = isRtl(row);
    // A new width or a direction flip moves every chip at once; that is measured again, not played as a move.
    const animate = last.current !== null && last.current.width === width && last.current.rtl === rtl && !reducedMotion();
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
      // A value cut short by the row shows whole on hover; one that fits needs no tooltip.
      const text = node.querySelector<HTMLElement>("[data-chip-value] > span");
      const chip = node.querySelector<HTMLElement>("button");
      if (text && chip && value !== undefined) {
        if (text.scrollWidth > text.clientWidth) chip.title = `${node.querySelector("[data-chip-label]")?.textContent ?? ""}: ${value}`;
        else chip.removeAttribute("title");
      }
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
      const tint = style.getPropertyValue("--fu-selected").trim() || fallbackOf(TINT);
      const pale = style.getPropertyValue("--fu-accent-pale").trim() || fallbackOf(PALE);
      chip.animate([{ backgroundColor: tint }], { duration: 1600, easing: EASE });
      chip.querySelector<HTMLElement>("[data-chip-value]")?.animate([{ color: pale }], { duration: 1600, easing: EASE });
    }

    // The empty line fades in once the leaving chips are gone, and blurs away like a chip when filters come back.
    const leaving = gone.length ? Math.min(gone.length - 1, 6) * 40 + 140 : 0;
    const shown = note.current;
    if (shown && !noteWas.current && animate) {
      shown.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: leaving, easing: EASE, fill: "backwards" });
    }
    if (!shown && noteWas.current && animate) ghost(noteWas.current.node, noteWas.current.box, 0);
    noteWas.current = shown ? { node: shown, box: { x: shown.offsetLeft, y: shown.offsetTop, w: shown.offsetWidth, h: shown.offsetHeight } } : null;

    const height = content.offsetHeight;
    if (animate && last.current && last.current.height !== height) {
      const running = wrap.getAnimations().find((animation) => animation.id === "height");
      const from = running ? wrap.getBoundingClientRect().height : last.current.height;
      running?.cancel();
      // Shrinking waits for the leaving chips to fade, so what sits below never slides over them.
      const wait = height < from ? leaving : 0;
      const ease = wrap.animate([{ height: `${from}px` }, { height: `${height}px` }], { duration: 420, delay: wait, easing: EASE, fill: "backwards" });
      ease.id = "height";
    }
    last.current = { width, height, rtl };
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

  // Left and Right step between chips, the way they sit on screen; Backspace or Delete removes the one in focus.
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    const key = readingKey(event.key, event.currentTarget);
    if (key === "ArrowRight" || key === "ArrowLeft") {
      event.preventDefault();
      buttons[Math.max(0, Math.min(buttons.length - 1, at + (key === "ArrowRight" ? 1 : -1)))].focus();
    } else if ((event.key === "Backspace" || event.key === "Delete") && at < filters.length) {
      event.preventDefault();
      remove(filters[at], at);
    }
  };

  return (
    <div ref={root} tabIndex={-1} className={cn("not-prose relative outline-none", className)} {...props}>
      {/* Under the row, so chips that glide into a gap pass over the one fading out. */}
      <div ref={ghosts} aria-hidden="true" className="pointer-events-none absolute inset-0" />
      <div ref={box}>
        <StatusFrame disabled={disabled} announce={false}>
          <ul ref={list} aria-label={label} onKeyDown={onKeyDown} className="relative m-0 flex list-none flex-wrap items-center gap-2 p-0">
            {filters.map((filter, index) => (
              <li key={filter.key} data-key={filter.key} data-value={filter.value} className="flex max-w-full">
                <button
                  type="button"
                  aria-label={`Remove ${filter.label}: ${filter.value}`}
                  onClick={() => remove(filter, index)}
                  className={cn(
                    "group/chip relative inline-flex h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-[9px] pe-1.5 ps-3 font-[inherit] text-[14px] leading-5 whitespace-nowrap",
                    "bg-[var(--fu-surface-3,#2A2A2A)] [@media(hover:hover)]:hover:bg-[var(--fu-hover,#333333)]",
                    PRESS,
                    FOCUS,
                    TAP,
                  )}
                >
                  <span
                    aria-hidden="true"
                    data-chip-label=""
                    className="shrink-0 text-[var(--fu-dim,#929292)] transition-[color] duration-200 motion-reduce:transition-none [@media(hover:hover)]:group-hover/chip:text-[var(--fu-mute,#BDBDBD)]"
                  >
                    {filter.label}
                  </span>{" "}
                  <TextSwap
                    aria-hidden="true"
                    data-chip-value=""
                    className="min-w-0 grid-cols-[minmax(0,1fr)] font-medium text-[var(--fu-text,#F8F5F1)] [&>span]:truncate"
                  >
                    {filter.value}
                  </TextSwap>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "ms-0.5 flex size-5 shrink-0 items-center justify-center rounded-[6px] text-[var(--fu-dim,#929292)] transition-[color,background-color] duration-200",
                      "group-hover/chip:bg-[var(--fu-line,#404040)] group-hover/chip:text-[var(--fu-text,#F8F5F1)] group-focus-visible/chip:text-[var(--fu-text,#F8F5F1)]",
                    )}
                  >
                    <XIcon size={14} strokeWidth={2.25} />
                  </span>
                </button>
              </li>
            ))}
            {showClear && (
              <li data-key={CLEAR_KEY} className="flex">
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
        </StatusFrame>
        {filters.length === 0 && (
          <div ref={note}>
            <EmptyNote>{emptyText}</EmptyNote>
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {said}
      </p>
    </div>
  );
}
