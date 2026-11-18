"use client";

import { useRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { DragHandle, type NumberDrag } from "./drag-handle";
import { XIcon } from "./icons";
import { ARRIVING, Skeleton, useLoading } from "./skeleton";

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "prefix" | "size"> & {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name. Shown only to screen readers; the placeholder is the visible label. */
  label: string;
  /** Text or an icon before the value, e.g. "$". */
  prefix?: ReactNode;
  /** Shows a 16px clear button while the field has a value. Defaults to emptying the value. */
  onClear?: () => void;
  clearLabel?: string;
  /** For a field that holds a number: a handle to drag it along a scale, as on a slider. See DragHandle. */
  drag?: NumberDrag;
  className?: string;
  inputClassName?: string;
};

/** 44px field, 12px radius, 1px --fu-field-border border, 15px text, optional prefix and clear X. */
export function TextField({
  value,
  onChange,
  label,
  prefix,
  onClear,
  clearLabel,
  drag,
  className,
  inputClassName,
  disabled,
  ...props
}: TextFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const filled = value.length > 0;
  // Inside a loading StatusFrame the box stays and a bar stands in for the words, which fade in once when they arrive.
  const { loading, arriving } = useLoading();

  return (
    <div
      className={cn(
        "flex h-11 min-w-0 items-center gap-1.5 rounded-[12px] border border-[var(--fu-field-border,#737373)] bg-[var(--fu-input,rgb(0_0_0/0))] px-3",
        "text-[15px] leading-5 text-[var(--fu-text,#F8F5F1)] transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none",
        "hover:border-[var(--fu-control-hover,#A3A3A3)] focus-within:border-[var(--fu-accent-soft,#8FAAFF)] focus-within:hover:border-[var(--fu-accent-soft,#8FAAFF)]",
        "focus-within:shadow-[inset_0_0_0_1px_var(--fu-accent-soft,#8FAAFF)]",
        disabled && "pointer-events-none opacity-50",
        drag && "group/field relative isolate",
        className,
      )}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          input.current?.focus();
        }
      }}
    >
      {prefix != null && <span className="shrink-0 text-[var(--fu-mute,#BDBDBD)]">{prefix}</span>}
      {loading && <Skeleton className="h-3 w-[45%] max-w-28 rounded-[4px]" />}
      <input
        key={loading ? "loading" : "ready"}
        ref={input}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        disabled={disabled}
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-ellipsis text-inherit tabular-nums outline-none",
          "placeholder:text-[var(--fu-mute,#BDBDBD)]",
          inputClassName,
          loading && "sr-only",
          arriving && ARRIVING,
        )}
        {...props}
      />
      {filled && !loading && (
        <button
          type="button"
          aria-label={clearLabel ?? `Clear ${label.toLowerCase()}`}
          onClick={() => {
            if (onClear) onClear();
            else onChange("");
            input.current?.focus();
          }}
          className={cn(
            // Above the drag handle's layer, so the cross can always be pressed.
            "relative z-[1] -me-1 grid size-6 shrink-0 cursor-pointer place-items-center rounded-[6px] text-[var(--fu-mute,#BDBDBD)]",
            "transition-colors duration-150 hover:text-[var(--fu-text,#F8F5F1)]",
            "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
          )}
        >
          <XIcon size={16} />
        </button>
      )}
      {drag && !loading && !disabled && <DragHandle drag={drag} input={input} />}
    </div>
  );
}
