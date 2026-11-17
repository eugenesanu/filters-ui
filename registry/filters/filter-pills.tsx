"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { isRtl } from "../lib/direction";
import { formatsFor } from "../lib/format";
import { CountPill } from "../ui/count-pill";
import { ClearAllButton, ShowButton } from "../ui/filters-head";
import { ChevronDownIcon, XIcon } from "../ui/icons";
import { TextSwap } from "../ui/text-swap";

export type FilterPill = {
  id: string;
  /** The pill's name, e.g. "Price". */
  label: string;
  /** The value in words ("$15k to $45k"). Null or empty means the filter is unset. */
  summary?: string | null;
  /** For a pill that holds several filters, such as "More filters": how many of them are set. */
  count?: number;
  /** Clears what this pill holds. A set pill then shows a cross, and the panel a Clear button. */
  onClear?: () => void;
  /** An icon before the label, drawn in currentColor, 16px. */
  icon?: ReactNode;
  /** Width of the panel in px; never wider than the bar. Default 320. */
  width?: number;
  /** The filter itself, shown in the panel. */
  content: ReactNode;
};

export type FilterPillsProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  pills: readonly FilterPill[];
  /** Accessible name of the bar. Default "Filters". */
  label?: string;
  /** Controlled open pill, by id. null closes. */
  open?: string | null;
  /** The pill open on first render. Its panel shows in place on any screen, so a page never loads behind a sheet. */
  defaultOpen?: string | null;
  onOpenChange?: (id: string | null) => void;
  /** Clears every pill. "Clear all" shows at the end of the bar once a pill is set. */
  onClearAll?: () => void;
  clearAllLabel?: string;
  /** The button at the foot of each panel, e.g. "Show 34 cars". It closes the panel; filters apply as they change. Default "Done". */
  showLabel?: string;
  onShow?: () => void;
  formatCount?: (n: number) => string;
  /** Formats the counts by default, e.g. "de-DE". Default "en-US". */
  locale?: string;
};

type Mode = "panel" | "sheet";
type Layer = { id: string; key: number; mode: Mode; focus: boolean; closing: boolean; back: boolean };
type Rect = { left: number; top: number; width: number; height: number };

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const REVEAL = "cubic-bezier(0.16, 1, 0.3, 1)";
const FOLD = "cubic-bezier(0.4, 0, 0.2, 1)";
const PHONE = "(max-width: 639px)";
const GAP = 8;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const PANEL_BG = "var(--fu-card,#1F1F1F)";
const PANEL_LINE = "var(--fu-line,#404040)";
const OPEN_LINE = "var(--fu-accent-soft,#8FAAFF)";
const PANEL_SHADOW = "0 18px 48px var(--fu-shadow,rgb(0 0 0/0.5))";
const NO_SHADOW = "0 0 0 transparent";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const FOCUS_RING =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]";

/**
 * A row of pills, one per filter. Pressing a pill unfolds its panel out of the pill itself: the pill's outline grows
 * into a 24px card under it while the filter rises in from a 6px blur, and folds back into the pill on close. A set
 * pill shows its value and a cross; "Clear all" fades in at the end. The bar wraps; on phones a pill opens a sheet
 * from the bottom instead. Filters apply as they change, so the panel's button only closes it.
 */
export function FilterPills({
  pills,
  label = "Filters",
  open: openProp,
  defaultOpen = null,
  onOpenChange,
  onClearAll,
  clearAllLabel = "Clear all",
  showLabel = "Done",
  onShow,
  formatCount: formatCountProp,
  locale,
  className,
  ...props
}: FilterPillsProps) {
  const formatCount = formatCountProp ?? formatsFor(locale).number;
  const id = useId();
  const groups = useRef(new Map<string, HTMLDivElement>());
  const triggers = useRef(new Map<string, HTMLButtonElement>());
  const [inner, setInner] = useState<string | null>(defaultOpen);
  const openId = openProp === undefined ? inner : openProp;
  const [how, setHow] = useState({ mode: "panel" as Mode, focus: false, back: false });
  const counter = useRef(1);
  const [layers, setLayers] = useState<Layer[]>(() =>
    openId ? [{ id: openId, key: 0, mode: "panel", focus: false, closing: false, back: false }] : [],
  );

  // Each change of the open pill closes the panel that was open (it folds back into its pill) and opens the new one.
  const [seen, setSeen] = useState(openId);
  if (seen !== openId) {
    setSeen(openId);
    setLayers((list) => {
      const out = list.flatMap((layer) => {
        if (layer.closing) return layer.id === openId ? [] : [layer];
        return layer.id === openId ? [layer] : [{ ...layer, closing: true, back: how.back }];
      });
      if (openId && !out.some((layer) => layer.id === openId)) {
        out.push({ id: openId, key: counter.current++, mode: how.mode, focus: how.focus, closing: false, back: false });
      }
      return out;
    });
  }

  const setOpen = (next: string | null) => {
    if (openProp === undefined) setInner(next);
    onOpenChange?.(next);
  };

  const openPill = (pillId: string, focus: boolean) => {
    setHow({ mode: window.matchMedia(PHONE).matches ? "sheet" : "panel", focus, back: false });
    setOpen(pillId);
  };

  /** back: focus returns to the pill (Escape, the panel's button). A press outside or Tab leaves focus where it went. */
  const close = (back: boolean) => {
    const layer = layers.find((l) => !l.closing);
    setHow((h) => ({ ...h, back }));
    setOpen(null);
    if (back && layer?.mode === "panel") triggers.current.get(layer.id)?.focus({ preventScroll: true });
  };
  const closeRef = useRef(close);
  useLayoutEffect(() => {
    closeRef.current = close;
  });

  const current = layers.find((layer) => !layer.closing);

  // A mouse closes the panel on press; a finger on a tap that did not move, so starting a scroll keeps it open.
  useEffect(() => {
    if (!current || current.mode !== "panel") return;
    const group = groups.current.get(current.id);
    // An inert bar is a still picture, such as a preview: a press elsewhere on the page leaves it open.
    if (!group || group.closest("[inert]")) return;
    const inside = (target: EventTarget | null) => target instanceof Node && group.contains(target);
    let touch: { id: number; x: number; y: number } | null = null;
    const onDown = (event: PointerEvent) => {
      if (inside(event.target)) return;
      if (event.pointerType === "mouse") closeRef.current(false);
      else touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const onUp = (event: PointerEvent) => {
      if (touch && touch.id === event.pointerId && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) < 10) closeRef.current(false);
      touch = null;
    };
    const onCancel = () => {
      touch = null;
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onCancel, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onCancel, true);
    };
  }, [current?.key, current?.mode]);

  const gone = (layer: Layer) => {
    setLayers((list) => list.filter((l) => l.key !== layer.key));
    if (layer.mode === "sheet" && layer.back) triggers.current.get(layer.id)?.focus({ preventScroll: true });
  };

  const anySet = pills.some((pill) => Boolean(pill.summary) || (pill.count ?? 0) > 0);

  return (
    <div role="group" aria-label={label} className={cn("not-prose w-full", className)} {...props}>
      <div className="relative flex flex-wrap items-center gap-2">
        {pills.map((pill) => {
          const layer = layers.find((l) => l.id === pill.id && !l.closing) ?? layers.find((l) => l.id === pill.id);
          return (
            <Pill
              key={pill.id}
              pill={pill}
              panelId={`${id}-${pill.id}`}
              isOpen={current?.id === pill.id}
              handoff={Boolean(current) && current?.id !== pill.id}
              layer={layer}
              showLabel={showLabel}
              formatCount={formatCount}
              groupRef={(node) => {
                if (node) groups.current.set(pill.id, node);
                else groups.current.delete(pill.id);
              }}
              triggerRef={(node) => {
                if (node) triggers.current.set(pill.id, node);
                else triggers.current.delete(pill.id);
              }}
              onToggle={(focus) => (current?.id === pill.id ? close(focus) : openPill(pill.id, focus))}
              onClose={close}
              onShow={() => {
                onShow?.();
                close(true);
              }}
              onGone={gone}
            />
          );
        })}
        {onClearAll && anySet && (
          <ClearAllButton
            onClick={() => {
              onClearAll();
              const first = pills[0];
              if (first) triggers.current.get(first.id)?.focus({ preventScroll: true });
            }}
            className={cn(
              "transition-[background-color,color,scale,opacity,filter,translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "text-[var(--fu-accent-soft,#8FAAFF)] hover:text-[var(--fu-accent-pale,#D1DDFF)] starting:translate-x-1 rtl:starting:-translate-x-1 starting:opacity-0 starting:blur-[2px]",
              "relative pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-[3px] pointer-coarse:after:content-['']",
            )}
          >
            {clearAllLabel}
          </ClearAllButton>
        )}
      </div>
    </div>
  );
}

type PillProps = {
  pill: FilterPill;
  panelId: string;
  isOpen: boolean;
  /** Another pill is open, so a panel closing here hands over to it. */
  handoff: boolean;
  layer: Layer | undefined;
  showLabel: string;
  formatCount?: (n: number) => string;
  groupRef: (node: HTMLDivElement | null) => void;
  triggerRef: (node: HTMLButtonElement | null) => void;
  onToggle: (focus: boolean) => void;
  onClose: (back: boolean) => void;
  onShow: () => void;
  onGone: (layer: Layer) => void;
};

function Pill({ pill, panelId, isOpen, handoff, layer, showLabel, formatCount, groupRef, triggerRef, onToggle, onClose, onShow, onGone }: PillProps) {
  const group = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const skipClick = useRef(false);
  const titleId = `${panelId}-title`;
  const count = pill.count ?? 0;
  const valued = Boolean(pill.summary);
  const set = valued || count > 0;
  const clearable = valued && Boolean(pill.onClear);
  const raised = Boolean(layer && layer.mode === "panel");

  // The last value stays in place while the cross and the value leave after a clear.
  const [lastSummary, setLastSummary] = useState(pill.summary ?? "");
  if (pill.summary && pill.summary !== lastSummary) setLastSummary(pill.summary);

  // A change of value eases the pill to its new width over 200ms, measured without the leaving text.
  const width = useRef<number | null>(null);
  useLayoutEffect(() => {
    const node = group.current;
    if (!node) return;
    const leaving = [...node.querySelectorAll<HTMLElement>("[data-swap] > [aria-hidden]")];
    leaving.forEach((n) => (n.style.display = "none"));
    const to = node.offsetWidth;
    leaving.forEach((n) => (n.style.display = ""));
    const from = width.current;
    width.current = to;
    if (from === null || from === to || reducedMotion()) return;
    const glide = node.animate([{ width: `${from}px` }, { width: `${to}px` }], { duration: 200, easing: EASE });
    return () => glide.cancel();
  }, [pill.summary, count, clearable]);

  const focusFirst = () => {
    const panel = document.getElementById(panelId);
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
  };

  const footer = (big: boolean) => (
    <>
      {pill.onClear ? (
        <ClearAllButton onClick={pill.onClear} className={big ? "h-11" : "-ms-3 pointer-coarse:h-11"}>
          Clear
        </ClearAllButton>
      ) : (
        <span />
      )}
      <ShowButton label={showLabel} onClick={onShow} className={big ? "h-11 flex-1" : "pointer-coarse:h-11"} />
    </>
  );

  return (
    <div
      ref={(node) => {
        group.current = node;
        groupRef(node);
      }}
      data-state={isOpen ? "open" : "closed"}
      data-set={set ? "true" : "false"}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented || !isOpen || layer?.mode !== "panel") return;
        event.preventDefault();
        onClose(true);
      }}
      onBlur={(event) => {
        if (!isOpen || layer?.mode !== "panel") return;
        const next = event.relatedTarget;
        if (next instanceof Node && !event.currentTarget.contains(next)) onClose(false);
      }}
      className={cn(
        "group/pill inline-flex h-10 max-w-full min-w-0 items-center rounded-[12px] border",
        "transition-[background-color,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        set
          ? "border-[var(--fu-selected,#1F2747)] bg-[var(--fu-selected,#1F2747)] hover:border-[var(--fu-accent-soft,#8FAAFF)]/40"
          : "border-[var(--fu-line,#404040)] bg-[var(--fu-card,#1F1F1F)] hover:border-[var(--fu-control-border,#737373)]",
        "data-[state=open]:border-[var(--fu-accent-soft,#8FAAFF)] data-[state=open]:hover:border-[var(--fu-accent-soft,#8FAAFF)]",
        "has-[[data-pill-trigger]:focus-visible]:outline-2 has-[[data-pill-trigger]:focus-visible]:outline-offset-2 has-[[data-pill-trigger]:focus-visible]:outline-solid has-[[data-pill-trigger]:focus-visible]:outline-[var(--fu-accent-soft,#8FAAFF)]",
        "forced-colors:border-[ButtonText]",
      )}
    >
      <button
        ref={(node) => {
          trigger.current = node;
          triggerRef(node);
        }}
        type="button"
        data-pill-trigger=""
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onKeyDown={(event) => {
          const { key } = event;
          if (key !== "ArrowDown" && key !== "Enter" && key !== " ") return;
          event.preventDefault();
          if (key !== "ArrowDown") skipClick.current = true;
          if (isOpen && key === "ArrowDown" && layer?.mode === "panel") focusFirst();
          else onToggle(true);
        }}
        onKeyUp={() => {
          setTimeout(() => {
            skipClick.current = false;
          });
        }}
        onClick={() => {
          if (skipClick.current) {
            skipClick.current = false;
            return;
          }
          onToggle(false);
        }}
        className={cn(
          "relative flex h-full min-w-0 cursor-pointer items-center gap-2 rounded-[11px] ps-3.5 font-[inherit] text-[14px] leading-5 font-medium whitespace-nowrap outline-none",
          "[-webkit-tap-highlight-color:transparent] pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-[3px] pointer-coarse:after:content-['']",
          clearable ? "pe-1" : "pe-2.5",
          raised && "z-[32]",
        )}
      >
        {pill.icon && (
          <span
            aria-hidden="true"
            className={cn(
              "-ms-0.5 grid shrink-0 place-items-center transition-[color] duration-200",
              set ? "text-[var(--fu-accent-soft,#8FAAFF)]" : "text-[var(--fu-mute,#BDBDBD)] group-data-[state=open]/pill:text-[var(--fu-accent-soft,#8FAAFF)]",
            )}
          >
            {pill.icon}
          </span>
        )}
        <span
          className={cn(
            "min-w-0 shrink-0 transition-[color] duration-200",
            set ? "text-[var(--fu-accent-pale,#D1DDFF)]" : "text-[var(--fu-text,#F8F5F1)]",
          )}
        >
          {pill.label}
        </span>
        {pill.summary && <span className="sr-only">, {pill.summary}</span>}
        {count > 0 && <span className="sr-only">, {count} set</span>}
        {valued && (
          <>
            <span aria-hidden="true" className="h-4 w-px shrink-0 bg-[var(--fu-accent-soft,#8FAAFF)]/30" />
            <TextSwap
              aria-hidden="true"
              data-swap=""
              className="min-w-0 grid-cols-[minmax(0,1fr)] font-normal text-[var(--fu-accent-soft,#8FAAFF)] tabular-nums [&>span]:truncate"
            >
              {pill.summary || lastSummary}
            </TextSwap>
          </>
        )}
        {count > 0 && <CountPill aria-hidden="true" on count={count} format={formatCount} className="-mx-0.5" />}
        {!clearable && (
          <ChevronDownIcon
            size={16}
            className={cn(
              "shrink-0 transition-[rotate,color,opacity,filter,translate] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              "starting:-translate-y-1 starting:opacity-0 starting:blur-[2px]",
              set ? "text-[var(--fu-accent-soft,#8FAAFF)]" : "text-[var(--fu-mute,#BDBDBD)]",
              "group-data-[state=open]/pill:rotate-180 group-data-[state=open]/pill:text-[var(--fu-accent-soft,#8FAAFF)]",
            )}
          />
        )}
      </button>
      {clearable && (
        <button
          type="button"
          aria-label={`Clear ${pill.label.toLowerCase()}`}
          onClick={() => {
            pill.onClear?.();
            trigger.current?.focus({ preventScroll: true });
          }}
          className={cn(
            "relative me-1.5 grid size-7 shrink-0 cursor-pointer place-items-center rounded-[8px] text-[var(--fu-accent-soft,#8FAAFF)]",
            "transition-[background-color,color,opacity,filter,translate] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            "starting:translate-y-1 starting:opacity-0 starting:blur-[2px]",
            "hover:bg-[var(--fu-accent-soft,#8FAAFF)]/15 hover:text-[var(--fu-accent-pale,#D1DDFF)]",
            "pointer-coarse:after:absolute pointer-coarse:after:-inset-2 pointer-coarse:after:content-['']",
            FOCUS_RING,
            "focus-visible:outline-offset-0",
            raised && "z-[32]",
          )}
        >
          <XIcon size={16} />
        </button>
      )}
      {layer?.mode === "panel" && (
        <PillPanel
          key={layer.key}
          id={panelId}
          label={pill.label}
          open={!layer.closing}
          handoff={layer.closing && handoff}
          focus={layer.focus}
          set={set}
          width={pill.width ?? 320}
          footer={footer(false)}
          onGone={() => onGone(layer)}
        >
          {pill.content}
        </PillPanel>
      )}
      {layer?.mode === "sheet" && (
        <PillSheet
          key={layer.key}
          id={panelId}
          titleId={titleId}
          title={pill.label}
          summary={pill.summary ?? null}
          open={!layer.closing}
          onClose={() => onClose(true)}
          footer={footer(true)}
          onGone={() => onGone(layer)}
        >
          {pill.content}
        </PillSheet>
      )}
    </div>
  );
}

type PanelProps = {
  id: string;
  label: string;
  open: boolean;
  /** Closing because another pill opened: it fades where it is instead of folding back over the pills. */
  handoff: boolean;
  focus: boolean;
  set: boolean;
  width: number;
  footer: ReactNode;
  onGone: () => void;
  children: ReactNode;
};

/**
 * The panel under a pill. Its card starts as the pill's own outline and grows into place over 480ms while the filter,
 * already in its final spot, is uncovered by it and rises 6px out of a 6px blur. Closing runs the other way: the filter
 * blurs out and the card folds back into the pill. Offsets are layout values, so a zoomed or scaled page lines up.
 */
function PillPanel({ id, label, open, handoff, focus, set, width, footer, onGone, children }: PanelProps) {
  const surface = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const placed = useRef<Rect | null>(null);
  const done = useRef(onGone);
  useLayoutEffect(() => {
    done.current = onGone;
  });

  // The pill is the panel's parent and the bar the pill's; refs to them are not attached yet on a first render.
  const pillOf = () => surface.current?.parentElement ?? null;
  const pillRect = (): Rect | null => {
    const node = pillOf();
    return node ? { left: node.offsetLeft, top: node.offsetTop, width: node.offsetWidth, height: node.offsetHeight } : null;
  };

  // Right under its own pill, also when the bar wraps, so it never reads as another row's; the start edge lines up with
  // the pill's (the right edge in RTL), kept inside the bar. Offsets are physical, from the bar's left. On phones, where only a panel open on first render shows in place, it sits under
  // the whole bar instead, so the page never loads with pills hidden.
  const panelRect = (pill: Rect): Rect | null => {
    const bar = pillOf()?.parentElement;
    const inner = content.current;
    if (!bar || !inner) return null;
    const room = bar.clientWidth;
    const w = Math.min(width, room);
    inner.style.width = `${w - 2}px`;
    const left = Math.max(0, Math.min(isRtl(bar) ? pill.left + pill.width - w : pill.left, room - w));
    const under = window.matchMedia(PHONE).matches ? bar.offsetHeight : pill.top + pill.height;
    return { left, top: under + GAP, width: w, height: inner.offsetHeight + 2 };
  };

  const paint = (rect: Rect, look: "pill" | "panel" | "closed") => {
    const node = surface.current;
    if (!node) return;
    node.style.left = `${rect.left}px`;
    node.style.top = `${rect.top}px`;
    node.style.width = `${rect.width}px`;
    node.style.height = `${rect.height}px`;
    node.style.borderRadius = look === "panel" ? "24px" : "12px";
    node.style.boxShadow = look === "panel" ? PANEL_SHADOW : NO_SHADOW;
    node.style.borderColor = look === "panel" ? PANEL_LINE : look === "pill" ? OPEN_LINE : set ? "var(--fu-selected,#1F2747)" : PANEL_LINE;
    node.style.backgroundColor = look === "panel" ? PANEL_BG : (pillOf() && getComputedStyle(pillOf()!).backgroundColor) || PANEL_BG;
  };

  // Keeps the filter where it ends up while the card around it moves: its offset runs the card's move backwards.
  const hold = (card: Rect, final: Rect, rise: number) => {
    const node = content.current;
    if (node) node.style.translate = `${final.left - card.left}px ${final.top - card.top + rise}px`;
  };

  useLayoutEffect(() => {
    const node = surface.current;
    const inner = content.current;
    const pill = pillRect();
    const final = pill && panelRect(pill);
    if (!node || !inner || !pill || !final) return;
    placed.current = final;
    if (reducedMotion()) {
      paint(final, "panel");
      hold(final, final, 0);
    } else {
      node.style.transition = "none";
      inner.style.transition = "none";
      paint(pill, "pill");
      hold(pill, final, 6);
      inner.style.opacity = "0";
      inner.style.filter = "blur(6px)";
      void node.offsetWidth;
      const move = `480ms ${EASE}`;
      node.style.transition = ["left", "top", "width", "height", "border-radius", "background-color", "border-color", "box-shadow"]
        .map((p) => `${p} ${move}`)
        .join(", ");
      inner.style.transition = `translate ${move}, opacity 460ms ${REVEAL} 120ms, filter 460ms ${REVEAL} 120ms`;
      paint(final, "panel");
      hold(final, final, 0);
      inner.style.opacity = "1";
      inner.style.filter = "none";
    }
    if (focus) inner.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    // Runs once per panel: a new open mounts a new panel.
  }, []);

  // The card follows the filter's height (a list that grows) and the bar's width (a window resize) while open.
  useEffect(() => {
    const inner = content.current;
    const node = surface.current;
    const bar = pillOf()?.parentElement;
    if (!open || !inner || !bar || !node) return;
    let frame = 0;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const pill = pillRect();
        const final = pill && panelRect(pill);
        const was = placed.current;
        if (!final || !was) return;
        if (final.left === was.left && final.top === was.top && final.width === was.width && final.height === was.height) return;
        placed.current = final;
        const quiet = reducedMotion();
        const resize = final.width !== was.width || final.left !== was.left || final.top !== was.top;
        node.style.transition = quiet || resize ? "none" : `height 300ms ${EASE}`;
        inner.style.transition = "none";
        paint(final, "panel");
        hold(final, final, 0);
      });
    };
    const observer = new ResizeObserver(follow);
    observer.observe(inner);
    observer.observe(bar);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [open]);

  useLayoutEffect(() => {
    const node = surface.current;
    const inner = content.current;
    if (open || !node || !inner) return;
    const pill = pillRect();
    const final = placed.current;
    if (reducedMotion() || !pill || !final) {
      done.current();
      return;
    }
    if (handoff) {
      node.style.transition = "opacity 150ms ease-in-out, filter 150ms ease-in-out";
      node.style.opacity = "0";
      node.style.filter = "blur(2px)";
      const timer = setTimeout(() => done.current(), 170);
      return () => clearTimeout(timer);
    }
    const fold = `320ms ${FOLD} 50ms`;
    node.style.transition = ["left", "top", "width", "height", "border-radius", "background-color", "border-color", "box-shadow"]
      .map((p) => `${p} ${fold}`)
      .join(", ");
    inner.style.transition = `translate ${fold}, opacity 150ms ease-in-out, filter 150ms ease-in-out`;
    paint(pill, "closed");
    hold(pill, final, -4);
    inner.style.opacity = "0";
    inner.style.filter = "blur(2px)";
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      done.current();
    };
    const timer = setTimeout(finish, 420);
    const onEnd = (event: TransitionEvent) => {
      if (event.target === node && event.propertyName === "height") finish();
    };
    node.addEventListener("transitionend", onEnd);
    return () => {
      clearTimeout(timer);
      node.removeEventListener("transitionend", onEnd);
    };
  }, [open]);

  return (
    <div
      ref={surface}
      id={id}
      role="dialog"
      aria-label={label}
      inert={!open}
      // physical: placed from offsetLeft in script, which counts from the left in any direction.
      className="absolute top-0 left-0 z-30 box-border overflow-hidden border border-solid forced-colors:border-[CanvasText]"
    >
      {/* physical: moved by a translate measured from the left, as above. */}
      <div ref={content} tabIndex={-1} className="absolute top-0 left-0 flex flex-col text-[var(--fu-text,#F8F5F1)] outline-none will-change-[translate,opacity,filter]">
        <div className="max-h-[min(560px,70vh)] overflow-y-auto overscroll-contain p-4 [scrollbar-width:thin]">{children}</div>
        <div className="flex items-center justify-between gap-2 px-4 pt-1 pb-4">{footer}</div>
      </div>
    </div>
  );
}

type SheetProps = {
  id: string;
  titleId: string;
  title: string;
  summary: string | null;
  open: boolean;
  onClose: () => void;
  footer: ReactNode;
  onGone: () => void;
  children: ReactNode;
};

/** A phone's panel: a modal sheet that slides up from the bottom over a dimmed page, with a Done-style footer. */
function PillSheet({ id, titleId, title, summary, open, onClose, footer, onGone, children }: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const done = useRef(onGone);
  useLayoutEffect(() => {
    done.current = onGone;
  });

  useLayoutEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    if (!node.open) node.showModal();
    sheet.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => setShown(true));
    return () => {
      cancelAnimationFrame(frame);
      root.style.overflow = overflow;
      if (node.open) node.close();
    };
  }, []);

  useEffect(() => {
    const node = dialog.current;
    if (open || !node) return;
    setShown(false);
    const finish = () => {
      if (node.open) node.close();
      done.current();
    };
    if (reducedMotion()) {
      finish();
      return;
    }
    const timer = setTimeout(finish, 340);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <dialog
      ref={dialog}
      id={id}
      aria-labelledby={titleId}
      data-state={shown ? "open" : "closed"}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="group/sheet fixed inset-0 m-0 h-dvh border-0 max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-[var(--fu-text,#F8F5F1)] backdrop:bg-transparent"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--fu-scrim,rgb(0_0_0/0.6))] opacity-0 transition-[opacity] duration-300 ease-out group-data-[state=open]/sheet:opacity-100 motion-reduce:transition-none"
      />
      <div
        ref={sheet}
        tabIndex={-1}
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[24px] border-t border-[var(--fu-line,#404040)] bg-[var(--fu-card,#1F1F1F)] outline-none",
          "translate-y-full transition-[translate] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[state=open]/sheet:translate-y-0 motion-reduce:transition-none",
          "group-data-[state=closed]/sheet:duration-300 group-data-[state=closed]/sheet:ease-[cubic-bezier(0.4,0,1,1)]",
        )}
      >
        <div className="flex min-h-[60px] items-center gap-3 pe-2 ps-4">
          <p id={titleId} className="m-0 min-w-0 flex-1 truncate text-[17px] leading-6 font-semibold">
            {title}
            {summary && <span className="ms-2 text-[15px] font-normal text-[var(--fu-accent-soft,#8FAAFF)] [unicode-bidi:isolate]">{summary}</span>}
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className={cn(
              "grid size-11 shrink-0 cursor-pointer place-items-center rounded-[10px] text-[var(--fu-mute,#BDBDBD)] transition-[background-color,color] duration-200 hover:bg-[var(--fu-hover-wash,rgb(255_255_255/0.14))] hover:text-[var(--fu-text,#F8F5F1)]",
              FOCUS_RING,
              "focus-visible:outline-offset-0",
            )}
          >
            <XIcon size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-5">{children}</div>
        <div className="flex items-center gap-2 border-t border-[var(--fu-card-border,#2A2A2A)] px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
          {footer}
        </div>
      </div>
    </dialog>
  );
}
