"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react";
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
  /**
   * Called on each move of a drag with the value under the pointer, before it snaps to a step, and with null when the
   * handle is let go: for a chart that should move with the handle.
   */
  onHold?: (value: number | null) => void;
};

type Press = { start: number; width: number; rtl: boolean; grab: number; x: number; last: number | null; moved: boolean; settled: boolean };

/**
 * Turns a number field into a slider as well. With a mouse over the field a thin handle shows where the value stands
 * along the field's width; dragging it fills the field up to the handle and moves the value in steps. A press that does
 * not move puts the caret in the field instead, with its text picked. The field needs the classes "group/field relative
 * isolate": the fill and the handle are drawn behind its text, and only a strip over the handle takes the pointer.
 * While a drag runs the layer carries data-dragging, which a field that grows with its text can use to hold its width.
 * With the pointer on the handle itself it grows and takes the accent colour, as it does while dragged, so it reads as
 * the thing to grab. The accent keeps the digits it crosses readable, which a light handle would not.
 */
export function DragHandle({ drag, input, pad = 12 }: { drag: NumberDrag; input: RefObject<HTMLInputElement | null>; pad?: number }) {
  const { value, min, max, step, onChange, emptyAt = "min" } = drag;
  const strip = useRef<HTMLSpanElement>(null);
  const press = useRef<Press | null>(null);
  const [dragging, setDragging] = useState(false);
  const [near, setNear] = useState(false);
  const hold = useRef(drag.onHold);
  hold.current = drag.onHold;

  const span = max - min || 1;
  const share = (n: number) => Math.min(1, Math.max(0, (n - min) / span));
  const at = share(value ?? (emptyAt === "max" ? max : min));
  // A CSS variable set on the field while dragging takes over from the value, so the handle follows the pointer between steps.
  const place = `calc(${pad}px + var(--drag-at, ${at}) * (100% - ${pad * 2}px))`;

  const pointerShare = (x: number, p: Press) => {
    const f = (x - p.start) / p.width;
    return p.rtl ? 1 - f : f;
  };
  /** Takes the field's box as it is now and keeps the handle where the pointer holds it. */
  const measure = (p: Press, x: number, held: number) => {
    const box = strip.current?.parentElement?.getBoundingClientRect();
    if (!box) return;
    p.start = box.left + pad;
    p.width = Math.max(1, box.width - pad * 2);
    p.grab = pointerShare(x, p) - held;
  };

  // A drag cut short by the field going away (loading, disabled) must not leave its place on the field.
  useEffect(() => {
    const field = strip.current?.parentElement;
    return () => {
      field?.style.removeProperty("--drag-at");
      if (press.current?.moved) hold.current?.(null);
    };
  }, []);

  const down = (event: PointerEvent<HTMLSpanElement>) => {
    // A frame turns its filter off with a disabled fieldset; the strip is no control, so it asks the field.
    if (event.button !== 0 || !strip.current || input.current?.matches(":disabled")) return;
    // Keeps the press from starting a text selection or moving focus; a press that never moves focuses the field on release.
    event.preventDefault();
    const p: Press = { start: 0, width: 1, rtl: isRtl(strip.current), grab: 0, x: event.clientX, last: value, moved: false, settled: false };
    measure(p, event.clientX, at);
    press.current = p;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const move = (event: PointerEvent<HTMLSpanElement>) => {
    const p = press.current;
    if (!p) return;
    if (!p.moved) {
      if (Math.abs(event.clientX - p.x) < 3) return;
      // A field that grows with its text takes its widest size for the drag (see data-dragging); the next move
      // measures it at that size, so the handle stays under the pointer from then on.
      p.moved = true;
      setDragging(true);
      return;
    }
    if (!p.settled) {
      p.settled = true;
      measure(p, event.clientX, share(p.last ?? (emptyAt === "max" ? max : min)));
    }
    const floor = drag.floor ?? min;
    const ceiling = drag.ceiling ?? max;
    const to = Math.min(share(ceiling), Math.max(share(floor), pointerShare(event.clientX, p) - p.grab));
    strip.current?.parentElement?.style.setProperty("--drag-at", String(to));
    drag.onHold?.(min + to * span);
    // Snapped to the step, kept between the floor and the ceiling (a typed floor may sit off the steps), and written
    // with the step's own decimals, so 0.1 steps do not come out as 0.30000000000000004.
    const snapped = Math.min(ceiling, Math.max(floor, min + Math.round((to * span) / step) * step));
    const next = Number(snapped.toFixed((String(step).split(".")[1] ?? "").length));
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
    if (p.moved) drag.onHold?.(null);
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
        data-near={near || dragging || undefined}
        className="group/drag pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]"
      >
        <span
          className="absolute inset-y-0 inset-s-0 bg-[var(--fu-wash,rgb(255_255_255/0.08))] opacity-0 transition-opacity duration-200 motion-reduce:transition-none group-data-[dragging]/drag:opacity-100"
          style={{ width: place }}
        />
        <span
          // Centred on its place with a start margin, which follows the field's own direction: a left-to-right
          // number pill keeps it right inside a right-to-left page, where a mirrored translate would not.
          className={cn(
            "absolute top-1/2 -ms-[1.5px] h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--fu-control-border,#737373)] opacity-0 in-[fieldset:disabled]:hidden",
            "transition-[opacity,background-color,scale] duration-150 motion-reduce:transition-none forced-colors:bg-[CanvasText]",
            "pointer-fine:group-hover/field:opacity-100 group-data-[near]/drag:bg-[var(--fu-accent,#3B57E6)] group-data-[near]/drag:opacity-100",
            "group-data-[near]/drag:scale-x-150 group-data-[near]/drag:scale-y-125",
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
        onPointerEnter={() => setNear(true)}
        onPointerLeave={() => setNear(false)}
        // Inside a <label> a click would hand focus to the field after a drag; focus is given on release instead.
        onClick={(event) => event.preventDefault()}
        className="pointer-events-none absolute inset-y-0 -ms-2 w-4 cursor-ew-resize touch-none in-[fieldset:disabled]:hidden pointer-fine:pointer-events-auto"
        style={{ insetInlineStart: place } as CSSProperties}
      />
    </>
  );
}
