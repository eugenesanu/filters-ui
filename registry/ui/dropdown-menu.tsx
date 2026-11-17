"use client";

import { Fragment, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { CheckIcon, ChevronDownIcon } from "./icons";
import { typesCharacter, keepRowInView, LIST_PANEL, ListCheck, PopoverPanel, RowHighlight, useTypeAhead, type PopoverCloseReason } from "./popover";
import { TextSwap } from "./text-swap";

export type MenuOption<V extends string = string> = {
  value: V;
  label: string;
  disabled?: boolean;
  /** Muted words after the label, e.g. what comes first in this order. */
  hint?: string;
  /** A 16px glyph before the label, drawn in currentColor. It takes the accent when chosen. */
  icon?: ReactNode;
};
export type MenuGroup<V extends string = string> = { label?: string; options: readonly MenuOption<V>[] };
export type MenuAction = { label: string; onSelect: () => void; disabled?: boolean; hint?: string };

type SharedProps<V extends string> = {
  /** Accessible name of the menu, e.g. "Sort by". Read before the value when there is no prefix. */
  label: string;
  /** Muted words before the value on the trigger, e.g. "Sort by". */
  prefix?: string;
  /** The choices, plain or in labelled groups. A separator falls between groups. */
  options: readonly (MenuOption<V> | MenuGroup<V>)[];
  /** Commands under the choices, after a separator, e.g. "Reset". */
  actions?: readonly MenuAction[];
  /** "filled": #2A2A2A pill. "quiet": no fill until hovered, for a toolbar or next to a result count. Default "filled". */
  variant?: "filled" | "quiet";
  /** Which edge the menu lines up with. Default "start". */
  align?: "start" | "end";
  /** Text on the trigger instead of the chosen labels. */
  valueLabel?: string;
  disabled?: boolean;
  /** Draws the menu open in place, for a still picture. Nothing responds. */
  still?: boolean;
  className?: string;
};

export type DropdownMenuProps<V extends string = string> = SharedProps<V> &
  (
    | { multiple?: false; value: V; onChange: (value: V) => void }
    | {
        multiple: true;
        value: readonly V[];
        onChange: (value: V[]) => void;
        /** Trigger text while nothing is ticked. Default "Any". */
        emptyLabel?: string;
      }
  );

type Entry<V extends string> = { label: string; hint?: string; icon?: ReactNode; disabled: boolean; group: number } & (
  | { kind: "radio" | "check"; value: V }
  | { kind: "action"; action: MenuAction }
);

const SMOOTH = "ease-[cubic-bezier(0.22,1,0.36,1)]";

/**
 * A trigger pill ("Sort by Newest") that opens a menu, grown out of the pill, of single-choice options (the chosen one
 * tinted, with a check that draws in), multi-choice options with a box, and plain actions. One highlight marks
 * the active row; an option may carry a glyph and a hint. Focus moves into the menu: arrows (wrapping), Home, End and first
 * letters move it, Enter or Space picks, Escape closes back to the trigger. A single choice closes the menu; ticking a
 * box keeps it open.
 */
export function DropdownMenu<V extends string = string>(props: DropdownMenuProps<V>) {
  const { label, prefix, options, actions = [], variant = "filled", align = "start", valueLabel, disabled = false, still = false, className } = props;
  const id = useId();
  const menuId = `${id}-menu`;
  const itemId = (index: number) => `${id}-item-${index}`;
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const [isOpen, setOpen] = useState(false);
  const open = still || isOpen;
  const [active, setActive] = useState<number | null>(null);
  const [pressed, setPressed] = useState(false);
  const opening = useRef<"menu" | "first" | "last">("menu");
  const skipClick = useRef(false);
  const typeAhead = useTypeAhead();

  const chosen: readonly V[] = props.multiple ? props.value : [props.value];
  const groups: { label?: string; options: MenuOption<V>[] }[] = [];
  let loose = false;
  for (const option of options) {
    if ("options" in option) groups.push({ label: option.label, options: [...option.options] });
    else if (loose) groups[groups.length - 1].options.push(option);
    else groups.push({ options: [option] });
    loose = !("options" in option);
  }
  const entries: Entry<V>[] = [
    ...groups.flatMap((group, at) =>
      group.options.map((option): Entry<V> => ({
        kind: props.multiple ? "check" : "radio",
        value: option.value,
        label: option.label,
        hint: option.hint,
        icon: option.icon,
        disabled: Boolean(option.disabled),
        group: at,
      })),
    ),
    ...actions.map((action): Entry<V> => ({ kind: "action", action, label: action.label, hint: action.hint, disabled: Boolean(action.disabled), group: groups.length })),
  ];
  const usable = entries.flatMap((entry, index) => (entry.disabled ? [] : [index]));
  const isChecked = (entry: Entry<V>) => entry.kind !== "action" && chosen.includes(entry.value);

  const labels = entries.filter((entry) => isChecked(entry)).map((entry) => entry.label);
  // A still picture shows the highlight on the chosen item, as if opened from the keyboard.
  const current = still ? (usable.find((index) => isChecked(entries[index])) ?? null) : active;
  const shown = valueLabel ?? (props.multiple ? (labels.length ? labels.join(", ") : (props.emptyLabel ?? "Any")) : (labels[0] ?? ""));

  // preventScroll keeps the page still, so the menu's own scroll follows the focused item by hand.
  const focusAt = (index: number | undefined) => {
    const item = index === undefined ? null : items.current[index];
    if (!item) return;
    item.focus({ preventScroll: true });
    if (panel.current) keepRowInView(panel.current, item);
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    const checked = usable.find((index) => isChecked(entries[index]));
    const target = opening.current === "menu" ? undefined : opening.current === "last" ? usable.at(-1) : (checked ?? usable[0]);
    if (target === undefined) panel.current?.focus({ preventScroll: true });
    else focusAt(target);
    // Runs once per open; the entries are read as they are then.
  }, [isOpen]);

  // A new value eases the trigger to its new width over 150ms. The leaving text is left out of the measure, and the
  // width stays pinned until it has gone (TextSwap takes 280ms), so it never snaps back to fit the old words.
  const width = useRef<number | null>(null);
  useLayoutEffect(() => {
    const node = trigger.current;
    if (!node || still) return;
    const leaving = node.querySelector<HTMLElement>("[data-swap] > [aria-hidden]");
    if (leaving) leaving.style.display = "none";
    const to = node.offsetWidth;
    if (leaving) leaving.style.display = "";
    const from = width.current;
    width.current = to;
    if (from === null || from === to || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    node.style.width = `${to}px`;
    const glide = node.animate([{ width: `${from}px` }, { width: `${to}px` }], { duration: 150, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    const timer = setTimeout(() => {
      node.style.width = "";
    }, 300);
    return () => {
      glide.cancel();
      clearTimeout(timer);
      node.style.width = "";
    };
  }, [shown, still]);

  const show = (from: "menu" | "first" | "last") => {
    opening.current = from;
    setActive(null);
    setOpen(true);
  };

  const shut = (reason: PopoverCloseReason | "pick" | "tab") => {
    const inside = panel.current?.contains(document.activeElement);
    if (inside && reason !== "blur" && reason !== "outside") trigger.current?.focus({ preventScroll: true });
    setOpen(false);
    setPressed(false);
  };

  const pick = (index: number) => {
    const entry = entries[index];
    if (!entry || entry.disabled) return;
    if (entry.kind === "check") {
      if (!props.multiple) return;
      const on = props.value.includes(entry.value);
      // Kept in the order of the options, whatever order they were ticked in.
      props.onChange(entries.flatMap((e) => (e.kind === "check" && (e === entry ? !on : props.value.includes(e.value)) ? [e.value] : [])));
      return;
    }
    shut("pick");
    if (entry.kind === "action") entry.action.onSelect();
    else if (!props.multiple && entry.value !== props.value) props.onChange(entry.value);
  };

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    // Tab leaves either way. Shift+Tab lands on the trigger, which does not count as leaving, so it closes here.
    if (key === "Tab") {
      if (event.shiftKey) {
        event.preventDefault();
        shut("tab");
      } else setTimeout(() => shut("blur"));
      return;
    }
    if (event.nativeEvent.isComposing || !usable.length) return;
    const at = active === null ? -1 : usable.indexOf(active);
    if (key === "ArrowDown") {
      event.preventDefault();
      focusAt(usable[(at + 1) % usable.length]);
    } else if (key === "ArrowUp") {
      event.preventDefault();
      focusAt(usable[at <= 0 ? usable.length - 1 : at - 1]);
    } else if (key === "Home" || key === "End") {
      event.preventDefault();
      focusAt(key === "Home" ? usable[0] : usable.at(-1));
    } else if (key === " " && typeAhead.running()) {
      event.preventDefault();
      focusAt(usable[typeAhead.find(key, usable.map((index) => entries[index]), at)]);
    } else if ((key === "Enter" || key === " ") && active !== null) {
      event.preventDefault();
      pick(active);
    } else if (typesCharacter(event)) {
      event.preventDefault();
      focusAt(usable[typeAhead.find(key, usable.map((index) => entries[index]), at)]);
    }
  };

  const rows = entries.map((entry, index) => {
    const checked = isChecked(entry);
    const role = entry.kind === "radio" ? "menuitemradio" : entry.kind === "check" ? "menuitemcheckbox" : "menuitem";
    return (
      <div
        key={entry.kind === "action" ? `action-${index}` : `option-${entry.value}`}
        ref={(node) => {
          items.current[index] = node;
        }}
        id={itemId(index)}
        role={role}
        tabIndex={-1}
        aria-checked={entry.kind === "action" ? undefined : checked}
        aria-disabled={entry.disabled || undefined}
        data-state={checked ? "on" : "off"}
        data-active={current === index || undefined}
        onFocus={() => setActive(index)}
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse" || document.activeElement === event.currentTarget) return;
          if (entry.disabled) panel.current?.focus({ preventScroll: true });
          else event.currentTarget.focus({ preventScroll: true });
        }}
        onPointerDown={() => !entry.disabled && setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onClick={() => pick(index)}
        className={cn(
          "group/item relative flex min-h-10 cursor-pointer items-center gap-2.5 rounded-[9px] py-2 pr-2 pl-2.5 text-[14px] leading-5 outline-none select-none pointer-coarse:min-h-11",
          "transition-[background-color,color] duration-200 motion-reduce:transition-none",
          entry.kind === "radio" && checked && "bg-[var(--fu-selected,#1F2747)] font-medium text-[var(--fu-accent-pale,#D1DDFF)]",
          entry.disabled && "cursor-default opacity-40",
          "forced-colors:data-[active]:bg-[Highlight] forced-colors:data-[active]:text-[HighlightText]",
        )}
      >
        {entry.kind === "check" && (
          <span
            aria-hidden="true"
            className={cn(
              "grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-[var(--fu-control-border,#737373)] text-[var(--fu-accent-soft,#8FAAFF)]",
              "transition-[background-color,border-color] duration-200 motion-reduce:transition-none",
              SMOOTH,
              "group-data-[active]/item:border-[var(--fu-control-hover,#A3A3A3)]",
              "group-data-[state=on]/item:border-[var(--fu-accent-soft,#8FAAFF)] group-data-[state=on]/item:bg-[var(--fu-selected,#1F2747)]",
            )}
          >
            <CheckIcon
              size={14}
              strokeWidth={3}
              className={cn(
                // The path is about 23 units long; a negative offset draws it from the short leg up.
                "[&_path]:[stroke-dasharray:23] [&_path]:[stroke-dashoffset:-23] [&_path]:transition-[stroke-dashoffset] [&_path]:duration-200 motion-reduce:[&_path]:transition-none",
                "[&_path]:ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[state=on]/item:[&_path]:[stroke-dashoffset:0]",
              )}
            />
          </span>
        )}
        {entry.icon && (
          <span
            aria-hidden="true"
            className={cn(
              "-my-0.5 grid size-6 shrink-0 place-items-center rounded-[7px] transition-[color,background-color] duration-200 motion-reduce:transition-none",
              entry.kind !== "action" && checked
                ? "bg-[var(--fu-accent,#3B57E6)]/45 text-[var(--fu-accent-pale,#D1DDFF)]"
                : "bg-[var(--fu-surface-3,#2A2A2A)] text-[var(--fu-mute,#BDBDBD)] group-data-[active]/item:text-[var(--fu-text,#F8F5F1)]",
            )}
          >
            {entry.icon}
          </span>
        )}
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{entry.label}</span>
        {entry.hint && (
          <span
            className={cn(
              "shrink-0 pl-2 text-[13px] leading-5 font-normal tabular-nums",
              entry.kind !== "action" && checked ? "text-[var(--fu-accent-soft,#8FAAFF)]" : "text-[var(--fu-dim,#8C8C8C)]",
            )}
          >
            {entry.hint}
          </span>
        )}
        {entry.kind === "radio" && <ListCheck on={checked} />}
      </div>
    );
  });

  const sections = [...groups.map((group, at) => ({ label: group.label, at })), ...(actions.length ? [{ label: undefined, at: groups.length }] : [])];

  return (
    <div className={cn("relative inline-flex max-w-full", disabled && "pointer-events-none opacity-40", className)}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        tabIndex={still ? -1 : undefined}
        onKeyDown={(event) => {
          const { key } = event;
          if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ") {
            event.preventDefault();
            if (key === "Enter" || key === " ") skipClick.current = true;
            show(key === "ArrowUp" ? "last" : "first");
          }
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
          if (isOpen) shut("pick");
          else show("menu");
        }}
        className={cn(
          "relative inline-flex h-9 max-w-full min-w-0 cursor-pointer items-center gap-1 rounded-[10px] pr-2.5 pl-3 font-[inherit] text-[14px] leading-5 whitespace-nowrap",
          "[-webkit-tap-highlight-color:transparent] pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1 pointer-coarse:after:content-['']",
          "transition-[background-color,scale] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] active:duration-75 aria-expanded:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100",
          "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
          variant === "filled"
            ? "bg-[var(--fu-surface-3,#2A2A2A)] hover:bg-[var(--fu-hover,#333333)] aria-expanded:bg-[var(--fu-hover,#333333)] forced-colors:border forced-colors:border-[ButtonText]"
            : "bg-transparent hover:bg-[var(--fu-wash,rgb(255_255_255/0.08))] aria-expanded:bg-[var(--fu-wash,rgb(255_255_255/0.08))]",
        )}
      >
        {prefix ? <span className="shrink-0 text-[var(--fu-mute,#BDBDBD)]">{prefix}</span> : <span className="sr-only">{label}: </span>}
        <TextSwap data-swap="" className="min-w-0 grid-cols-[minmax(0,1fr)] font-medium text-[var(--fu-text,#F8F5F1)] [&>span]:truncate">{shown}</TextSwap>
        <ChevronDownIcon
          size={16}
          className={cn("ml-0.5 shrink-0 text-[var(--fu-mute,#BDBDBD)] transition-[rotate,color] duration-[480ms] motion-reduce:transition-none", SMOOTH, open && "rotate-180 text-[var(--fu-accent-soft,#8FAAFF)]")}
        />
      </button>

      <PopoverPanel
        ref={panel}
        id={menuId}
        role="menu"
        aria-label={label}
        tabIndex={-1}
        open={open}
        still={still}
        anchor={trigger}
        align={align}
        onClose={shut}
        onKeyDown={onMenuKey}
        onFocus={(event) => {
          if (event.target === event.currentTarget) setActive(null);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse" && panel.current?.contains(document.activeElement) && document.activeElement !== panel.current) {
            panel.current?.focus({ preventScroll: true });
          }
        }}
        className={cn(LIST_PANEL, "min-w-[220px] outline-none")}
      >
        <RowHighlight activeId={open && current !== null ? itemId(current) : null} open={open} pressed={pressed} />
        {sections.map(({ label: title, at }, n) => {
          const titleId = `${id}-group-${at}`;
          const own = rows.filter((_, index) => entries[index].group === at);
          return (
            <Fragment key={at}>
              {n > 0 && <div role="separator" className="mx-2.5 my-1.5 h-px bg-[var(--fu-card-border,#2A2A2A)]" />}
              {at < groups.length ? (
                <div role="group" aria-labelledby={title ? titleId : undefined}>
                  {title && (
                    <div id={titleId} className="px-2.5 pt-1.5 pb-2 text-[12px] leading-4 font-medium text-[var(--fu-dim,#8C8C8C)]">
                      {title}
                    </div>
                  )}
                  {own}
                </div>
              ) : (
                own
              )}
            </Fragment>
          );
        })}
      </PopoverPanel>
    </div>
  );
}
