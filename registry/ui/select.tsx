"use client";

import { useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { CheckIcon, ChevronDownIcon } from "./icons";
import { typesCharacter, keepRowInView, LIST_PANEL, PopoverPanel, RowHighlight, useTypeAhead } from "./popover";
import { TextSwap } from "./text-swap";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "onChange" | "prefix" | "children" | "defaultValue" | "name" | "role"
> & {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  /** Accessible name of the field and its list. Include the visible prefix in it ("From year" for "From"). */
  label: string;
  /** Muted text before the chosen value, e.g. "From". */
  prefix?: ReactNode;
  /** Shown, muted, while no option matches value. Default: the label of the option whose value is "". */
  placeholder?: string;
  /** Sends the value with a form under this name. */
  name?: string;
  /** Classes for the outer wrapper, e.g. its width. */
  className?: string;
  /** Draws the list open in place, for a still picture. Nothing responds. */
  still?: boolean;
};

const PAGE = 10;

/**
 * A select drawn like TextField (44px, 12px radius, #737373 border, 15px text, a chevron) whose list opens in a panel of
 * its own instead of the system menu. Focus stays on the field: arrows, Home, End, Page Up and Page Down move, typing
 * finds an option by its first letters, Enter or Space picks, Escape closes. The option whose value is "" is the empty
 * choice and shows muted, like a placeholder.
 */
export function Select({
  value,
  onChange,
  options,
  label,
  prefix,
  placeholder,
  name,
  className,
  disabled,
  still = false,
  onKeyDown,
  onClick,
  ...props
}: SelectProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;
  const optionId = (v: string) => `${id}-option-${encodeURIComponent(v).replaceAll("%", "_")}`;
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [isOpen, setOpen] = useState(false);
  const open = still || isOpen;
  const [active, setActive] = useState<string | null>(null);
  // Tab picks the active option only when the keys put it there; a row under a resting pointer never commits.
  const keyed = useRef(false);
  // Enter and Space are handled on keydown; the click the browser then fires for the button is skipped.
  const skipClick = useRef(false);
  const typeAhead = useTypeAhead();

  const chosen = options.find((option) => option.value === value);
  const empty = !chosen || value === "";
  const shown = chosen?.label ?? placeholder ?? options.find((option) => option.value === "")?.label ?? "";
  const enabled = options.filter((option) => !option.disabled);
  const indexOf = (v: string | null) => enabled.findIndex((option) => option.value === v);
  const start = chosen && !chosen.disabled ? chosen.value : (enabled[0]?.value ?? null);
  const current = still ? (active ?? start) : active;

  const reveal = (v: string) => {
    const row = document.getElementById(optionId(v));
    if (list.current && row) keepRowInView(list.current, row);
  };

  const moveTo = (index: number) => {
    const option = enabled[Math.max(0, Math.min(enabled.length - 1, index))];
    if (!option) return;
    keyed.current = true;
    setActive(option.value);
    reveal(option.value);
  };

  const openAt = (v: string | null) => {
    keyed.current = false;
    setActive(v);
    setOpen(true);
  };

  const choose = (v: string | null) => {
    setOpen(false);
    if (v !== null && v !== value) onChange(v);
  };

  // On open the list scrolls to the whole row nearest to putting the chosen option mid-panel, never past the end, so the
  // top row is never cut. scrollTop, not scrollIntoView, so the page never scrolls.
  useLayoutEffect(() => {
    const box = list.current;
    const target = open && current !== null ? document.getElementById(optionId(current)) : null;
    if (!box || !target) return;
    const rows = [...box.querySelectorAll<HTMLElement>("[role=option]")];
    const inset = rows[0].offsetTop;
    const end = box.scrollHeight - box.clientHeight;
    const ideal = target.offsetTop + target.offsetHeight / 2 - box.clientHeight / 2;
    let top = 0;
    for (const row of rows) {
      const at = row.offsetTop - inset;
      if (at <= end && Math.abs(at - ideal) < Math.abs(top - ideal)) top = at;
    }
    box.scrollTop = top;
  }, [open]);

  const find = (char: string, from: string | null) => {
    const at = typeAhead.find(char, enabled, indexOf(from));
    if (isOpen) {
      if (at >= 0) moveTo(at);
      return;
    }
    openAt(at >= 0 ? enabled[at].value : from);
    keyed.current = at >= 0;
  };

  const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.nativeEvent.isComposing) return;
    const { key } = event;
    if (!isOpen) {
      if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ") {
        event.preventDefault();
        if (key === "Enter" || key === " ") skipClick.current = true;
        openAt(start);
      } else if (key === "Home" || key === "End") {
        event.preventDefault();
        openAt(enabled[key === "Home" ? 0 : enabled.length - 1]?.value ?? null);
        keyed.current = true;
      } else if (typesCharacter(event)) {
        event.preventDefault();
        find(key, start);
      }
      return;
    }
    const at = indexOf(active);
    if (key === "ArrowDown" && !event.altKey) {
      event.preventDefault();
      moveTo(at < 0 ? 0 : at + 1);
    } else if (key === "ArrowUp" && !event.altKey) {
      event.preventDefault();
      moveTo(at < 0 ? enabled.length - 1 : at - 1);
    } else if (key === "Home" || key === "End") {
      event.preventDefault();
      moveTo(key === "Home" ? 0 : enabled.length - 1);
    } else if (key === "PageDown" || key === "PageUp") {
      event.preventDefault();
      moveTo((at < 0 ? 0 : at) + (key === "PageDown" ? PAGE : -PAGE));
    } else if (key === " " && typeAhead.running()) {
      event.preventDefault();
      find(key, active);
    } else if (key === "Enter" || key === " " || (key === "ArrowUp" && event.altKey)) {
      event.preventDefault();
      skipClick.current = key !== "ArrowUp";
      choose(active);
    } else if (key === "ArrowDown" && event.altKey) {
      event.preventDefault();
    } else if (key === "Tab") {
      choose(keyed.current ? active : null);
    } else if (typesCharacter(event)) {
      event.preventDefault();
      find(key, active);
    }
  };

  return (
    <div className={cn("relative min-w-0", disabled && "pointer-events-none opacity-40", className)}>
      <span id={labelId} hidden>
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && current !== null ? optionId(current) : undefined}
        disabled={disabled}
        tabIndex={still ? -1 : undefined}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!event.defaultPrevented) handleKey(event);
        }}
        onKeyUp={() => {
          setTimeout(() => {
            skipClick.current = false;
          });
        }}
        onClick={(event) => {
          onClick?.(event);
          if (skipClick.current) {
            skipClick.current = false;
            return;
          }
          if (isOpen) setOpen(false);
          else openAt(start);
        }}
        className={cn(
          "relative flex h-11 w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-[12px] border border-[var(--fu-control-border,#737373)] bg-transparent pr-9 pl-3 text-left",
          "font-[inherit] text-[15px] leading-5 text-[var(--fu-text,#F8F5F1)] outline-none [-webkit-tap-highlight-color:transparent]",
          "transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none disabled:cursor-default",
          "hover:border-[var(--fu-control-hover,#A3A3A3)]",
          "focus-visible:border-[var(--fu-accent-soft,#8FAAFF)] focus-visible:shadow-[inset_0_0_0_1px_var(--fu-accent-soft,#8FAAFF)] focus-visible:hover:border-[var(--fu-accent-soft,#8FAAFF)]",
          "aria-expanded:border-[var(--fu-accent-soft,#8FAAFF)] aria-expanded:shadow-[inset_0_0_0_1px_var(--fu-accent-soft,#8FAAFF)] aria-expanded:hover:border-[var(--fu-accent-soft,#8FAAFF)]",
        )}
        {...props}
      >
        {prefix != null && (
          <span aria-hidden="true" className="shrink-0 text-[var(--fu-mute,#BDBDBD)]">
            {prefix}
          </span>
        )}
        <TextSwap
          data-empty={empty || undefined}
          className="min-w-0 flex-1 grid-cols-[minmax(0,1fr)] tabular-nums data-[empty]:text-[var(--fu-mute,#BDBDBD)] [&>span]:truncate"
        >
          {shown}
        </TextSwap>
        <ChevronDownIcon
          size={16}
          className={cn(
            "pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[var(--fu-mute,#BDBDBD)]",
            "transition-[rotate] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>
      {name !== undefined && <input type="hidden" name={name} value={value} />}

      <PopoverPanel
        ref={list}
        id={listId}
        role="listbox"
        aria-labelledby={labelId}
        open={open}
        still={still}
        anchor={trigger}
        onClose={() => setOpen(false)}
        matchWidth
        // Presses inside keep focus on the field, which carries the keys.
        onPointerDown={(event) => event.preventDefault()}
        className={LIST_PANEL}
      >
        <RowHighlight activeId={open && current !== null ? optionId(current) : null} open={open} />
        {options.length === 0 && (
          <div role="presentation" className="flex min-h-9 items-center px-2 text-[15px] leading-5 text-[var(--fu-mute,#BDBDBD)]">
            No choices
          </div>
        )}
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <div
              key={option.value}
              id={optionId(option.value)}
              role="option"
              aria-selected={selected}
              aria-disabled={option.disabled || undefined}
              data-active={option.value === current || undefined}
              onPointerMove={() => {
                if (option.disabled || option.value === active) return;
                keyed.current = false;
                setActive(option.value);
              }}
              onClick={() => {
                if (!option.disabled) choose(option.value);
              }}
              className={cn(
                "relative flex min-h-9 cursor-pointer items-center gap-2 rounded-[8px] px-2 py-2 text-[15px] leading-5 tabular-nums select-none pointer-coarse:min-h-11",
                selected && "font-medium",
                option.disabled && "cursor-default opacity-40",
                "forced-colors:data-[active]:bg-[Highlight] forced-colors:data-[active]:text-[HighlightText]",
              )}
            >
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{option.label}</span>
              <CheckIcon
                size={16}
                strokeWidth={2.5}
                className={cn("shrink-0 text-[var(--fu-accent-soft,#8FAAFF)]", !selected && "invisible")}
              />
            </div>
          );
        })}
      </PopoverPanel>
    </div>
  );
}
