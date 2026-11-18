"use client";

import { useRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { ChevronDownIcon } from "./icons";

export type SelectFieldOption = { value: string; label: string; disabled?: boolean };

export type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "prefix" | "children"> & {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectFieldOption[];
  /** Accessible name. Include the visible prefix in it ("From year" for "From"). */
  label: string;
  /** Muted text before the chosen value, e.g. "From". */
  prefix?: ReactNode;
  className?: string;
};

/**
 * A native select drawn like TextField: 44px, 12px radius, 1px --fu-field-border border, 15px text, a chevron.
 * The browser's own picker opens, so keyboards, screen readers and phones need no popover code.
 * The option whose value is "" is the empty choice and shows muted, like a placeholder.
 */
export function SelectField({ value, onChange, options, label, prefix, className, disabled, ...props }: SelectFieldProps) {
  const select = useRef<HTMLSelectElement>(null);

  return (
    <div
      className={cn(
        "relative flex h-11 min-w-0 items-center gap-1.5 rounded-[12px] border border-[var(--fu-field-border,#737373)] bg-[var(--fu-input,rgb(0_0_0/0))] ps-3",
        "text-[15px] leading-5 text-[var(--fu-text,#F8F5F1)] transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none",
        "hover:border-[var(--fu-control-hover,#A3A3A3)] focus-within:border-[var(--fu-accent-soft,#8FAAFF)] focus-within:hover:border-[var(--fu-accent-soft,#8FAAFF)]",
        "focus-within:shadow-[inset_0_0_0_1px_var(--fu-accent-soft,#8FAAFF)]",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
      // A press on the prefix opens the picker too, where the browser allows it. Only a click carries activation for touch,
      // so the press itself just keeps focus from flickering.
      onPointerDown={(event) => {
        if (event.target !== select.current) event.preventDefault();
      }}
      onClick={(event) => {
        const node = select.current;
        if (!node || event.target === node) return;
        node.focus();
        try {
          node.showPicker();
        } catch {}
      }}
    >
      {prefix != null && (
        <span aria-hidden="true" className="shrink-0 cursor-pointer text-[var(--fu-mute,#BDBDBD)]">
          {prefix}
        </span>
      )}
      <select
        ref={select}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        disabled={disabled}
        data-empty={value === "" || undefined}
        className={cn(
          "h-full min-w-0 flex-1 cursor-pointer appearance-none truncate rounded-[11px] bg-transparent pe-9 font-[inherit] text-inherit tabular-nums outline-none",
          // An open end reads like a field placeholder, not a chosen value.
          "data-[empty]:text-[var(--fu-mute,#BDBDBD)]",
          "[&>option]:bg-[var(--fu-surface-1,#171717)] [&>option]:text-[var(--fu-text,#F8F5F1)]",
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        size={16}
        className="pointer-events-none absolute inset-e-3 top-1/2 -translate-y-1/2 text-[var(--fu-mute,#BDBDBD)]"
      />
    </div>
  );
}
