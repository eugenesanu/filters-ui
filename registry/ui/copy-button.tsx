"use client";

import { useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button-classes";
import { CheckIcon, CopyIcon } from "./icons";

/** Writes text to the clipboard. Falls back to a hidden textarea where the async API is missing or refused. */
export async function copyToClipboard(text: string) {
  try {
    if (window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  area.style.pointerEvents = "none";
  document.body.appendChild(area);
  const active = document.activeElement as HTMLElement | null;
  area.select();
  let done = false;
  try {
    done = document.execCommand("copy");
  } catch {}
  area.remove();
  active?.focus();
  return done;
}

type State = "idle" | "copied" | "failed";

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";
const SHOWN = "scale-100 opacity-100 blur-none";
const GONE = "scale-50 opacity-0 blur-[2px]";

/** The copy glyph turns into a check that draws itself in, then turns back. Decorative: the button carries the name. */
export function CopyGlyph({ copied, className }: { copied: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("relative inline-grid size-[1em] shrink-0 place-items-center [&>*]:[grid-area:1/1]", className)}>
      <CopyIcon className={cn("size-full transition-[scale,opacity,filter] duration-200", EASE, copied ? GONE : SHOWN)} />
      <CheckIcon
        strokeWidth={2.5}
        className={cn(
          "size-full text-[var(--fu-accent-soft,#8FAAFF)] transition-[scale,opacity,filter] duration-200",
          EASE,
          // The check path is about 23 units long, so a 23 dash offset hides it and 0 draws it.
          "[&_path]:[stroke-dasharray:23] [&_path]:transition-[stroke-dashoffset] [&_path]:duration-[320ms] [&_path]:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:[&_path]:transition-none",
          copied ? cn(SHOWN, "[&_path]:[stroke-dashoffset:0] [&_path]:delay-[80ms]") : cn(GONE, "[&_path]:[stroke-dashoffset:23]"),
        )}
      />
    </span>
  );
}

export type CopyButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children" | "type"> & {
  /** What to copy. A function is read at press time, for text that is costly to build. */
  text: string | (() => string);
  /** The visible words. Leave out for an icon-only square, which then needs `aria-label`. */
  label?: string;
  /** Shown for 1.6s after a copy. Default "Copied". */
  copiedLabel?: string;
  /** What screen readers hear after a copy, e.g. "Prompt copied". Default: copiedLabel. */
  announce?: string;
  /** Default "secondary". */
  variant?: ButtonVariant;
  /** Default "md". */
  size?: ButtonSize;
  /** Show the copy glyph before the words. Default true. */
  icon?: boolean;
  /** Called after each attempt. */
  onCopy?: (ok: boolean) => void;
};

const ICON_SQUARE: Record<ButtonSize, string> = {
  sm: "w-8 px-0 [&_svg]:size-4",
  md: "w-10 px-0 [&_svg]:size-[18px]",
  lg: "w-11 px-0 [&_svg]:size-5",
};

/**
 * Copies text and confirms it in place: the copy glyph turns into a check that draws in, the words swap to "Copied"
 * through a short blur, and a polite status tells screen readers. The button keeps its width, its focus and its look;
 * a second press inside the 1.6s window copies again and is announced again. On failure it says "Failed".
 * Icon-only, it also shows a small "Copy" / "Copied" tip on hover and keyboard focus.
 */
export function CopyButton({
  text,
  label,
  copiedLabel = "Copied",
  announce,
  variant = "secondary",
  size = "md",
  icon = true,
  onCopy,
  className,
  "aria-label": ariaLabel,
  ...props
}: CopyButtonProps) {
  const [state, setState] = useState<State>("idle");
  const [status, setStatus] = useState("");
  const reset = useRef<ReturnType<typeof setTimeout>>(undefined);
  const speak = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(
    () => () => {
      clearTimeout(reset.current);
      clearTimeout(speak.current);
    },
    [],
  );

  const copy = async () => {
    const ok = await copyToClipboard(typeof text === "function" ? text() : text);
    setState(ok ? "copied" : "failed");
    onCopy?.(ok);
    // Emptied first, so a repeat copy inside the window is read out again.
    setStatus("");
    clearTimeout(speak.current);
    speak.current = setTimeout(() => setStatus(ok ? (announce ?? copiedLabel) : "Copy failed"), 60);
    clearTimeout(reset.current);
    reset.current = setTimeout(() => {
      setState("idle");
      setStatus("");
    }, 1600);
  };

  const copied = state === "copied";
  const iconOnly = label === undefined;
  const words = copied ? copiedLabel : state === "failed" ? "Failed" : label;

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={iconOnly ? (copied ? copiedLabel : (ariaLabel ?? "Copy")) : ariaLabel}
        data-state={state}
        className={cn(
          buttonClasses({ variant, size, before: icon && !iconOnly }),
          iconOnly && ICON_SQUARE[size],
          "group/copy",
          className,
        )}
        {...props}
      >
        {icon && <CopyGlyph copied={copied} />}
        {!iconOnly && (
          // Every label sits in one grid cell, so the widest sets the width and nothing jumps as they swap.
          <span className="inline-grid justify-items-center [&>*]:[grid-area:1/1]">
            {[label, copiedLabel, "Failed"].map((word) => (
              <span
                key={word}
                aria-hidden={word !== words || undefined}
                className={cn(
                  "transition-[opacity,translate,filter] duration-150 ease-in-out motion-reduce:transition-none",
                  word === words ? "translate-y-0 opacity-100 blur-none" : "pointer-events-none translate-y-1 opacity-0 blur-[2px]",
                )}
              >
                {word}
              </span>
            ))}
          </span>
        )}
        {iconOnly && (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-[2] -translate-x-1/2 rounded-[8px] px-2 py-1 whitespace-nowrap",
              "bg-[var(--fu-text,#F8F5F1)] text-[12px] leading-4 font-medium text-[var(--fu-surface-1,#171717)]",
              "translate-y-1 opacity-0 transition-[opacity,translate] duration-150 ease-in-out motion-reduce:transition-none",
              "[@media(hover:hover)]:group-hover/copy:translate-y-0 [@media(hover:hover)]:group-hover/copy:opacity-100",
              "group-focus-visible/copy:translate-y-0 group-focus-visible/copy:opacity-100",
              copied && "translate-y-0 opacity-100",
            )}
          >
            {copied ? copiedLabel : state === "failed" ? "Failed" : (ariaLabel ?? "Copy")}
          </span>
        )}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </>
  );
}
