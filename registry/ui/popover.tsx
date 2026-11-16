"use client";

import { useEffect, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode, type Ref, type RefObject } from "react";
import { cn } from "../lib/cn";
import { CheckIcon } from "./icons";

export type PopoverCloseReason = "escape" | "outside" | "blur" | "away";

export type PopoverPanelProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  ref?: Ref<HTMLDivElement>;
  open: boolean;
  /** The trigger the panel opens against. */
  anchor: RefObject<HTMLElement | null>;
  /**
   * Asks the owner to close: "escape", "outside" (a press outside the trigger and the panel), "blur" (focus moved
   * outside both) or "away" (the trigger scrolled out of view). The owner sets open to false and moves focus if needed.
   */
  onClose: (reason: PopoverCloseReason) => void;
  /** Lines up the start edges, or the end edges with "end". Default "start". */
  align?: "start" | "end";
  /** At least as wide as the trigger. */
  matchWidth?: boolean;
  /** Widest the panel grows, in px; never wider than the screen less its margins. Default 320. */
  maxWidth?: number;
  /** Tallest the panel grows before it scrolls, in px; also capped by the room on its side. Default 320. */
  maxHeight?: number;
  /** Draws the panel open in place under the trigger, for a still picture. Nothing moves or listens. The owner needs position: relative. */
  still?: boolean;
  children: ReactNode;
};

const GAP = 6;
const EDGE_Y = 8;
const MIN_HEIGHT = 160;
const edgeX = (width: number) => (width < 640 ? 16 : 8);

/** Open panels, newest last: Escape closes only the newest. */
const layers: symbol[] = [];

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Browsers without popover support (before Chrome 114, Safari 17, Firefox 125) get a fixed panel in place instead.
function show(node: HTMLElement) {
  if (typeof node.showPopover !== "function") {
    node.style.display = "block";
    return;
  }
  try {
    if (!node.matches(":popover-open")) node.showPopover();
  } catch {}
}

function hide(node: HTMLElement) {
  if (typeof node.hidePopover !== "function") {
    node.style.display = "none";
    return;
  }
  try {
    node.hidePopover();
  } catch {}
}

/** The surface of a menu or list panel: 14px radius, #1F1F1F, a #404040 hairline, 6px inside, a deep soft shadow. */
export const LIST_PANEL =
  "w-max rounded-[14px] border border-[var(--fu-line,#404040)] bg-[var(--fu-card,#1F1F1F)] p-1.5 [scrollbar-width:thin] shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_24px_48px_-12px_rgb(0_0_0/0.8),0_10px_20px_-8px_rgb(0_0_0/0.55)]";

/**
 * A floating panel for menus and lists. It stays where it is in the DOM, so it inherits fonts and --fu-* variables and
 * Tab reaches it right after its trigger, and opens on the browser's top layer (popover="manual"), so no overflow,
 * transform or z-index around the trigger can clip or bury it. It opens below the trigger, or above when only that fits,
 * keeps 8px from the screen edges (16px at the sides on phones) and follows the trigger while the page scrolls.
 * It grows out of the trigger over 480ms (scale 0.98 to 1 from the trigger's side, through a 6px blur) and leaves
 * over 160ms; it is inert while it leaves. Children can follow it through group/popover's data-state: closed, open,
 * closing.
 */
export function PopoverPanel({
  ref,
  open,
  anchor,
  onClose,
  align = "start",
  matchWidth = false,
  maxWidth = 320,
  maxHeight = 320,
  still = false,
  className,
  style,
  children,
  ...props
}: PopoverPanelProps) {
  const panel = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<"hidden" | "open" | "closing">("hidden");
  // Which edges have rows scrolled out of view, so a soft fade there says the list goes on.
  const [more, setMore] = useState({ top: false, bottom: false });
  const side = useRef<"bottom" | "top">("bottom");
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });

  const setRef = (node: HTMLDivElement | null) => {
    panel.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  // Measures the trigger without its press scale (offset sizes around the rect's centre), then picks a side and a spot.
  const place = (first: boolean) => {
    const node = panel.current;
    const trigger = anchor.current;
    if (!node || !trigger) return;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const rect = trigger.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const left = cx - trigger.offsetWidth / 2;
    const right = cx + trigger.offsetWidth / 2;
    const top = cy - trigger.offsetHeight / 2;
    const bottom = cy + trigger.offsetHeight / 2;
    if (!first && (bottom < 0 || top > vh || right < 0 || left > vw)) {
      close.current("away");
      return;
    }

    const mx = edgeX(vw);
    const widest = Math.min(maxWidth, vw - 2 * mx);
    node.style.maxWidth = `${widest}px`;
    if (matchWidth) node.style.minWidth = `${Math.min(trigger.offsetWidth, widest)}px`;
    node.style.maxHeight = `${maxHeight}px`;
    const natural = node.offsetHeight;
    const below = vh - EDGE_Y - bottom - GAP;
    const above = top - GAP - EDGE_Y;
    const roomOf = (s: "bottom" | "top") => (s === "bottom" ? below : above);
    let next: "bottom" | "top";
    if (!first && natural <= roomOf(side.current)) next = side.current;
    else if (natural <= below) next = "bottom";
    else if (natural <= above) next = "top";
    else next = below >= above ? "bottom" : "top";
    side.current = next;

    node.style.maxHeight = `${Math.min(maxHeight, Math.max(MIN_HEIGHT, roomOf(next)))}px`;
    const width = node.offsetWidth;
    const height = node.offsetHeight;
    const x = Math.min(Math.max(mx, align === "end" ? right - width : left), vw - mx - width);
    const y = next === "bottom" ? bottom + GAP : top - GAP - height;
    node.style.left = `${Math.round(x)}px`;
    node.style.top = `${Math.round(y)}px`;
    node.style.transformOrigin = `${Math.round(cx - x)}px ${next === "bottom" ? "0" : "100%"}`;
    node.dataset.side = next;
  };

  useLayoutEffect(() => {
    const node = panel.current;
    if (still || !node) return;
    if (open) {
      if (phase === "hidden") {
        // Shown and placed in its closed look with no transition, then opened, so it enters from the trigger's side.
        node.style.transition = "none";
        show(node);
        place(true);
        void getComputedStyle(node).opacity;
        node.style.transition = "";
      }
      setPhase("open");
    } else if (phase === "open") {
      setPhase(reducedMotion() ? "hidden" : "closing");
    }
    // place reads the latest props; phase is read as committed.
  }, [open, still]);

  useLayoutEffect(() => {
    if (phase === "hidden" && !still && panel.current) hide(panel.current);
  }, [phase, still]);

  useEffect(() => {
    const node = panel.current;
    if (!node || (!still && phase !== "open")) return;
    const measure = () => {
      const top = node.scrollTop > 1;
      const bottom = node.scrollTop + node.clientHeight < node.scrollHeight - 1;
      setMore((now) => (now.top === top && now.bottom === bottom ? now : { top, bottom }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    node.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      node.removeEventListener("scroll", measure);
    };
  }, [phase, still]);

  useEffect(() => {
    const node = panel.current;
    if (phase !== "closing" || !node) return;
    const done = () => setPhase((now) => (now === "closing" ? "hidden" : now));
    const timer = setTimeout(done, 190);
    const onEnd = (event: TransitionEvent) => {
      if (event.target === node && event.propertyName === "opacity") done();
    };
    node.addEventListener("transitionend", onEnd);
    return () => {
      clearTimeout(timer);
      node.removeEventListener("transitionend", onEnd);
    };
  }, [phase]);

  useEffect(() => {
    const node = panel.current;
    const trigger = anchor.current;
    if (still || phase !== "open" || !node || !trigger) return;
    const token = Symbol("layer");
    layers.push(token);

    let frame = 0;
    const follow = (event?: Event) => {
      if (event?.type === "scroll" && event.target instanceof Node && node.contains(event.target)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => place(false));
    };
    const observer = new ResizeObserver(() => follow());
    observer.observe(trigger);
    observer.observe(node);
    window.addEventListener("scroll", follow, { capture: true, passive: true });
    window.addEventListener("resize", follow);
    window.visualViewport?.addEventListener("resize", follow);

    const inside = (target: EventTarget | null) => target instanceof Node && (node.contains(target) || trigger.contains(target));
    // A mouse closes on press; a finger or pen on a tap that did not move, so starting a scroll keeps the panel open.
    // The press is never cancelled, so one click on another control both closes this and works there.
    let touch: { id: number; x: number; y: number } | null = null;
    const onDown = (event: PointerEvent) => {
      if (inside(event.target)) return;
      if (event.pointerType === "mouse") close.current("outside");
      else touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const onUp = (event: PointerEvent) => {
      if (touch && touch.id === event.pointerId && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) < 10) close.current("outside");
      touch = null;
    };
    const onCancel = () => {
      touch = null;
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing || layers.at(-1) !== token) return;
      event.stopPropagation();
      event.preventDefault();
      close.current("escape");
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget && !inside(event.relatedTarget)) close.current("blur");
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onCancel, true);
    window.addEventListener("keydown", onKey, true);
    node.addEventListener("focusout", onFocusOut);
    trigger.addEventListener("focusout", onFocusOut);

    return () => {
      layers.splice(layers.indexOf(token), 1);
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", follow, { capture: true });
      window.removeEventListener("resize", follow);
      window.visualViewport?.removeEventListener("resize", follow);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onCancel, true);
      window.removeEventListener("keydown", onKey, true);
      node.removeEventListener("focusout", onFocusOut);
      trigger.removeEventListener("focusout", onFocusOut);
    };
    // place and the trigger are read live.
  }, [phase, still]);

  const state = still ? (open ? "open" : "closed") : phase === "hidden" ? "closed" : phase;

  return (
    <div
      ref={setRef}
      popover={still ? undefined : "manual"}
      data-state={state}
      // Not while it is opening again before it finished leaving, so focus can move in.
      inert={state === "closing" && !open}
      style={still ? { maxWidth, maxHeight, ...style } : style}
      className={cn(
        // The browser's own popover look is reset: no inset, margin or padding, and these colours, not Canvas.
        "group/popover m-0 box-border overflow-x-hidden overflow-y-auto overscroll-contain text-[var(--fu-text,#F8F5F1)] [-webkit-tap-highlight-color:transparent]",
        still
          ? cn("absolute top-full z-10 mt-1.5", align === "end" ? "right-0" : "left-0", matchWidth && "min-w-full", !open && "hidden")
          : "fixed inset-auto z-50",
        "transition-[opacity,translate,scale,filter] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        "data-[state=open]:duration-[480ms] data-[state=closing]:duration-[160ms]",
        "data-[state=closed]:pointer-events-none data-[state=closed]:scale-[0.98] data-[state=closed]:opacity-0 data-[state=closed]:blur-[6px]",
        "data-[state=closing]:pointer-events-none data-[state=closing]:scale-[0.98] data-[state=closing]:opacity-0 data-[state=closing]:blur-[2px]",
        "data-[side=bottom]:data-[state=closed]:-translate-y-1 data-[side=top]:data-[state=closed]:translate-y-1",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className={cn(FADE, "-top-1.5 -mt-1.5 mb-[-26px] bg-linear-to-b", more.top && "opacity-100")} />
      {children}
      <span aria-hidden="true" className={cn(FADE, "-bottom-1.5 mt-[-26px] -mb-1.5 bg-linear-to-t", more.bottom && "opacity-100")} />
    </div>
  );
}

// Pinned to the panel edge as it scrolls, over the rows and the highlight; it takes no room in the list. Sized for LIST_PANEL.
const FADE =
  "pointer-events-none sticky z-[2] -mx-1.5 block h-8 from-[var(--fu-card,#1F1F1F)] to-transparent opacity-0 transition-opacity duration-150 motion-reduce:transition-none forced-colors:hidden";

/** Scrolls a list panel just enough that `row` shows whole, with the panel's 4px inset around it. */
export function keepRowInView(panel: HTMLElement, row: HTMLElement) {
  const top = row.offsetTop - 4;
  const bottom = row.offsetTop + row.offsetHeight + 4;
  if (top < panel.scrollTop) panel.scrollTop = top;
  else if (bottom > panel.scrollTop + panel.clientHeight) panel.scrollTop = bottom - panel.clientHeight;
}

type Mark = { top: number; height: number; slide: boolean; shown: boolean };

/**
 * The one fill that slides between a list's rows over 260ms, as in the search suggestions. It lies over the rows, a
 * light veil, so it shows on the chosen row's tint too. It fades in where it lands when the list opens, and stays put
 * while the list fades out. Place it first inside the panel.
 */
export function RowHighlight({ activeId, open, pressed = false }: { activeId: string | null; open: boolean; pressed?: boolean }) {
  const [mark, setMark] = useState<Mark | null>(null);
  const [, remeasure] = useState(0);
  const last = useRef<string | null>(null);
  const tries = useRef(0);

  useLayoutEffect(() => {
    if (!open) {
      last.current = null;
      tries.current = 0;
      return;
    }
    const node = activeId ? document.getElementById(activeId) : null;
    // The panel may still be hidden on this pass (it is shown after its children's effects); measure again next frame,
    // a few times at most, in case something else keeps it hidden.
    if (node && !node.getClientRects().length) {
      if (tries.current >= 3) return;
      tries.current += 1;
      const frame = requestAnimationFrame(() => remeasure((n) => n + 1));
      return () => cancelAnimationFrame(frame);
    }
    tries.current = 0;
    const next: Mark | null = node
      ? { top: node.offsetTop, height: node.offsetHeight, slide: last.current !== null, shown: true }
      : mark && { ...mark, slide: false, shown: false };
    last.current = node ? activeId : null;
    if (next?.top !== mark?.top || next?.height !== mark?.height || next?.slide !== mark?.slide || next?.shown !== mark?.shown) setMark(next);
  });

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-1.5 top-0 z-[1] rounded-[9px] transition-[opacity,background-color] duration-150 motion-reduce:transition-none forced-colors:hidden",
        mark?.slide && "transition-[opacity,background-color,translate,height] duration-[260ms]",
        "ease-[cubic-bezier(0.22,1,0.36,1)]",
        pressed ? "bg-[var(--fu-row-press,rgb(255_255_255/0.12))]" : "bg-[var(--fu-row-active,rgb(255_255_255/0.07))]",
        !mark?.shown && "opacity-0",
      )}
      style={mark ? { translate: `0 ${mark.top}px`, height: mark.height } : undefined}
    />
  );
}

const SMOOTH = "ease-[cubic-bezier(0.22,1,0.36,1)]";

/**
 * The check on a chosen row. It draws itself in, from the short leg up, 140ms after its panel starts to open, and
 * stays drawn while the panel leaves. Takes its 16px place even when off, so rows line up.
 */
export function ListCheck({ on }: { on: boolean }) {
  return (
    <CheckIcon
      size={16}
      strokeWidth={2.5}
      className={cn(
        "shrink-0 text-[var(--fu-accent-soft,#8FAAFF)]",
        on
          ? cn(
              // The path is about 23 units long; a negative offset draws it from the short leg up.
              "[&_path]:[stroke-dasharray:23] [&_path]:[stroke-dashoffset:0] [&_path]:transition-[stroke-dashoffset] [&_path]:delay-[140ms] [&_path]:duration-[420ms]",
              "[&_path]:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:[&_path]:transition-none",
              "group-data-[state=closed]/popover:[&_path]:[stroke-dashoffset:-23] group-data-[state=closed]/popover:[&_path]:transition-none",
            )
          : "invisible",
      )}
    />
  );
}

const defaultFormat = (n: number) => new Intl.NumberFormat("en-US").format(n);

/**
 * A row's count as a short bar and a number. The bar is the count's share of `max`; bars grow in from the left as
 * their panel opens, one row after another (`order`), and ease to a new width when the count changes. With bar false
 * only the number shows, in the same place, e.g. for "Any".
 */
export function ListCount({
  count,
  max,
  order = 0,
  on = false,
  bar = true,
  format = defaultFormat,
}: {
  count: number;
  max: number;
  order?: number;
  on?: boolean;
  bar?: boolean;
  format?: (n: number) => string;
}) {
  const share = max > 0 ? Math.min(1, count / max) : 0;
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center gap-2.5">
      <span className={cn("flex h-1 w-12 items-center rounded-full bg-[var(--fu-track,rgb(255_255_255/0.06))]", !bar && "invisible")}>
        <span
          className={cn(
            "h-1 origin-left rounded-full transition-[scale,width,background-color] duration-[480ms] motion-reduce:transition-none",
            SMOOTH,
            "group-data-[state=closed]/popover:scale-x-0 group-data-[state=closed]/popover:transition-none",
            on
              ? "bg-[var(--fu-accent-soft,#8FAAFF)]"
              : "bg-[var(--fu-rail,#4A4A4A)] group-data-[active]/row:bg-[var(--fu-control-border,#737373)]",
          )}
          // A count above 0 always shows a sliver, so only an empty option has no bar.
          style={{ width: `${count > 0 ? Math.max(share * 100, 6) : 0}%`, transitionDelay: `${90 + Math.min(order, 10) * 22}ms, 0ms, 0ms` }}
        />
      </span>
      <span
        className={cn(
          "min-w-[3ch] text-right text-[13px] leading-5 tabular-nums transition-[color] duration-200",
          on ? "text-[var(--fu-accent-soft,#8FAAFF)]" : "text-[var(--fu-dim,#8C8C8C)] group-data-[active]/row:text-[var(--fu-mute,#BDBDBD)]",
        )}
      >
        {format(count)}
      </span>
    </span>
  );
}

/**
 * Finds a row by the letters typed in the last 500ms. One letter, or the same letter again and again, steps to the
 * next row starting with it; a word keeps the current row while it still matches.
 */
export function useTypeAhead() {
  const word = useRef("");
  const lastKey = useRef(0);
  const running = () => word.current !== "" && Date.now() - lastKey.current <= 500;

  const find = <T extends { label: string }>(char: string, items: readonly T[], current: number): number => {
    word.current = (running() ? word.current : "") + char.toLowerCase();
    lastKey.current = Date.now();
    const stepping = /^(.)\1*$/u.test(word.current);
    const wanted = stepping ? [...word.current][0] : word.current;
    // The rows in search order: from the next row (or the current one, for a word) round to the one before it.
    const start = stepping ? current + 1 : Math.max(current, 0);
    const order = items.map((_, index) => index);
    const hit = [...order.slice(start), ...order.slice(0, start)].find((index) => items[index].label.toLowerCase().startsWith(wanted));
    return hit ?? -1;
  };

  return { find, running };
}

/** True for a key press that types one character, not a shortcut. */
export const typesCharacter = (event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }) =>
  /^.$/u.test(event.key) && !(event.ctrlKey || event.metaKey || event.altKey);
