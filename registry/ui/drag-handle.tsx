"use client";

import { useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react";
import { cn } from "../lib/cn";
import { isRtl } from "../lib/direction";

export type NumberDrag = {
  /** The number the field holds; null while it is empty. */
  value: number | null;
  /** The scale the field's width stands for. */
  min: number;
  max: number;
  /** Dragged values snap to this. */
  step: number;
  onChange: (value: number) => void;
  /** Where the handle stands while the field is empty. Default "min". */
  emptyAt?: "min" | "max";
  /** The lowest and highest value a drag may reach, inside min and max: the other end of a range, say. */
  floor?: number;
  ceiling?: number;
};

type Press = { start: number; width: number; rtl: boolean; grab: number; x: number; last: number | null; moved: boolean };

/**
 * Turns a number field into a slider as well. With a mouse over the field a thin handle shows where the value stands
 * along the field's width; dragging it fills the field up to the handle and moves the value in steps. A press that does
 * not move puts the caret in the field instead, with its text picked. The field needs the classes "group/field relative
 * isolate": the fill and the handle are drawn behind its text, and only a strip over the handle takes the pointer.
 */
export function DragHandle({ drag, input, pad = 12 }: { drag: NumberDrag; input: RefObject<HTMLInputElement | null>; pad?: number }) {
  const { value, min, max, step, onChange, emptyAt = "min" } = drag;
  const strip = useRef<HTMLSpanElement>(null);
  const press = useRef<Press | null>(null);
  const [dragging, setDragging] = useState(false);

  const span = max - min || 1;
  const share = (n: number) => Math.min(1, Math.max(0, (n - min) / span));
  const at = share(value ?? (emptyAt === "max" ? max : min));
  // A CSS variable set on the field while dragging takes over from the value, so the handle follows the pointer between steps.
  const place = `calc(${pad}px + var(--drag-at, ${at}) * (100% - ${pad * 2}px))`;

  const pointerShare = (x: number, p: Press) => {
    const f = (x - p.start) / p.width;
    return p.rtl ? 1 - f : f;
  };

  const down = (event: PointerEvent<HTMLSpanElement>) => {
    const box = strip.current?.parentElement?.getBoundingClientRect();
    if (event.button !== 0 || !box) return;
    // Keeps the press from starting a text selection or moving focus; a press that never moves focuses the field on release.
    event.preventDefault();
    const p: Press = { start: box.left + pad, width: Math.max(1, box.width - pad * 2), rtl: isRtl(strip.current), grab: 0, x: event.clientX, last: value, moved: false };
    p.grab = pointerShare(event.clientX, p) - at;
    press.current = p;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const move = (event: PointerEvent<HTMLSpanElement>) => {
    const p = press.current;
    if (!p) return;
    if (!p.moved) {
      if (Math.abs(event.clientX - p.x) < 3) return;
      p.moved = true;
      setDragging(true);
    }
    const low = share(drag.floor ?? min);
    const high = share(drag.ceiling ?? max);
    const to = Math.min(high, Math.max(low, pointerShare(event.clientX, p) - p.grab));
    strip.current?.parentElement?.style.setProperty("--drag-at", String(to));
    const next = Math.min(max, Math.max(min, min + Math.round((to * span) / step) * step));
    if (next !== p.last) {
      p.last = next;
      onChange(next);
    }
  };

  const up = (event: PointerEvent<HTMLSpanElement>, cancelled = false) => {
    const p = press.current;
    if (!p) return;
    press.current = null;
    strip.current?.parentElement?.style.removeProperty("--drag-at");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    if (!p.moved && !cancelled) {
      input.current?.focus();
      input.current?.select();
    }
  };

  return (
    <>
      <span
        aria-hidden="true"
        data-dragging={dragging || undefined}
        className="group/drag pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]"
      >
        <span
          className="absolute inset-y-0 inset-s-0 bg-[var(--fu-wash,rgb(255_255_255/0.08))] opacity-0 transition-opacity duration-200 motion-reduce:transition-none group-data-[dragging]/drag:opacity-100"
          style={{ width: place }}
        />
        <span
          className={cn(
            "absolute top-1/2 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--fu-control-border,#737373)] opacity-0 rtl:translate-x-1/2",
            "transition-[opacity,background-color] duration-150 motion-reduce:transition-none forced-colors:bg-[CanvasText]",
            "pointer-fine:group-hover/field:opacity-100 group-data-[dragging]/drag:bg-[var(--fu-accent,#3B57E6)] group-data-[dragging]/drag:opacity-100",
          )}
          style={{ insetInlineStart: place } as CSSProperties}
        />
      </span>
      <span
        ref={strip}
        aria-hidden="true"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={(event) => up(event)}
        onPointerCancel={(event) => up(event, true)}
        // Inside a <label> a click would hand focus to the field after a drag; focus is given on release instead.
        onClick={(event) => event.preventDefault()}
        className="pointer-events-none absolute inset-y-0 w-4 -translate-x-1/2 cursor-ew-resize touch-none rtl:translate-x-1/2 pointer-fine:pointer-events-auto"
        style={{ insetInlineStart: place } as CSSProperties}
      />
    </>
  );
}
