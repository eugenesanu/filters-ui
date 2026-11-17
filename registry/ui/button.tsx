"use client";

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { BUTTON_BASE, buttonClasses, type ButtonSize, type ButtonVariant } from "./button-classes";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Default "primary". */
  variant?: ButtonVariant;
  /** "sm" 32px, "md" 40px, "lg" 44px. Default "md". */
  size?: ButtonSize;
  /** An icon before the label, drawn in currentColor. */
  before?: ReactNode;
  /** An icon after the label. */
  after?: ReactNode;
  /** While a request runs: presses do nothing and, after 150ms, a spinner takes the label's place for at least 400ms. */
  busy?: boolean;
};

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false" className="size-4 animate-spin">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M8 1.5A6.5 6.5 0 0 1 14.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** "idle", then "busy" once a request has run 150ms, kept at least 400ms, then "leaving" for the spinner's exit. */
function useSpinner(busy: boolean) {
  const [phase, setPhase] = useState<"idle" | "busy" | "leaving">("idle");
  const since = useRef(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (busy && phase !== "busy") {
      timer = setTimeout(
        () => {
          since.current = Date.now();
          setPhase("busy");
        },
        phase === "leaving" ? 0 : 150,
      );
    } else if (!busy && phase === "busy") {
      timer = setTimeout(() => setPhase("leaving"), Math.max(0, 400 - (Date.now() - since.current)));
    } else if (!busy && phase === "leaving") {
      timer = setTimeout(() => setPhase("idle"), 200);
    }
    return () => clearTimeout(timer);
  }, [busy, phase]);
  return phase;
}

const SWAP = "transition-[opacity,translate,filter] ease-in-out motion-reduce:transition-none";

/**
 * A button in five looks and three sizes, 10px corners. It presses to 0.97 and shows a 2px --fu-accent-soft focus ring.
 * It is never drawn disabled: while busy it keeps its look, its width and its focus, and ignores presses.
 */
export function Button({
  variant = "primary",
  size = "md",
  before,
  after,
  busy = false,
  type = "button",
  className,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const phase = useSpinner(busy);
  const blocked = busy || phase === "busy";

  return (
    <button
      type={type}
      aria-busy={blocked || undefined}
      onClick={(event) => {
        // Also stops a submit button from sending its form.
        if (blocked) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={buttonClasses({ variant, size, before: before != null, after: after != null, className })}
      {...props}
    >
      <span
        className={cn(
          "inline-flex items-center gap-[inherit]",
          SWAP,
          phase === "busy" ? "-translate-y-1 opacity-0 blur-[2px] duration-150" : "delay-[110ms] duration-[170ms]",
        )}
      >
        {before != null && (
          <span aria-hidden="true" className="inline-flex shrink-0">
            {before}
          </span>
        )}
        {children}
        {after != null && (
          <span aria-hidden="true" className="inline-flex shrink-0">
            {after}
          </span>
        )}
      </span>
      {phase !== "idle" && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center">
          <span
            className={cn(
              "grid",
              SWAP,
              phase === "busy"
                ? "translate-y-0 opacity-100 blur-none delay-[110ms] duration-[170ms] starting:translate-y-1 starting:opacity-0 starting:blur-[2px]"
                : "-translate-y-1 opacity-0 blur-[2px] duration-150",
            )}
          >
            <Spinner />
          </span>
        </span>
      )}
    </button>
  );
}

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> & {
  /** The accessible name, e.g. "Copy link". Required: the icon alone says nothing to a screen reader. */
  label: string;
  /** "sm" 32px, "md" 36px, "lg" 44px square. Default "md". */
  size?: ButtonSize;
  /** "ghost": no fill until hovered. "secondary": a --fu-surface-3 square. Default "ghost". */
  variant?: "ghost" | "secondary";
  children: ReactNode;
};

const ICON_TAP = "pointer-coarse:after:absolute pointer-coarse:after:content-['']";

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: cn("size-8 [&_svg]:size-4", ICON_TAP, "pointer-coarse:after:-inset-1.5"),
  md: cn("size-9 [&_svg]:size-5", ICON_TAP, "pointer-coarse:after:-inset-1"),
  lg: "size-11 [&_svg]:size-5",
};

/** A square button holding one icon, --fu-mute until hovered. */
export function IconButton({ label, size = "md", variant = "ghost", type = "button", className, children, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        BUTTON_BASE,
        ICON_SIZES[size],
        "text-[var(--fu-mute,#BDBDBD)] hover:bg-[var(--fu-hover,#333333)] hover:text-[var(--fu-text,#F8F5F1)]",
        variant === "secondary" ? "bg-[var(--fu-surface-3,#2A2A2A)] forced-colors:border forced-colors:border-[ButtonText]" : "bg-transparent",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="inline-flex">
        {children}
      </span>
    </button>
  );
}
