"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/registry/lib/cn";
import { TextSwap } from "@/registry/ui/text-swap";

/** Writes text to the clipboard; falls back to a hidden textarea where the async API is missing or refused. */
export async function copyText(text: string) {
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

type CopyButtonProps = {
  text: string | (() => string);
  label?: string;
  /** What screen readers hear once it is copied, e.g. "Prompt copied". */
  announce?: string;
  /** Accessible name when the visible label alone says too little, e.g. "Copy install command". */
  ariaLabel?: string;
  variant?: "primary" | "quiet";
  className?: string;
};

export function CopyButton({ text, label = "Copy", announce = "Copied", ariaLabel, variant = "quiet", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const speak = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(speak.current);
    },
    [],
  );

  const onClick = async () => {
    const ok = await copyText(typeof text === "function" ? text() : text);
    setCopied(ok);
    setFailed(!ok);
    // Emptied first, so a second copy inside the timer is announced again.
    setStatus("");
    clearTimeout(speak.current);
    speak.current = setTimeout(() => setStatus(ok ? announce : "Copy failed"), 60);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopied(false);
      setFailed(false);
      setStatus("");
    }, 1600);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        data-copied={copied || undefined}
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-[10px] font-medium",
          "transition-[background-color,color,scale] duration-200 ease-smooth active:scale-[0.97] active:duration-75 motion-reduce:transition-none",
          variant === "primary"
            ? "h-11 bg-accent px-4 text-[15px] leading-5 text-white hover:bg-accent-hover"
            : "h-8 bg-surface-3 px-3 text-[13px] leading-5 text-text hover:bg-hover",
          className,
        )}
      >
        {/* The longest label sets the width, so the button never jumps as its words swap. */}
        <span className="inline-grid justify-items-center">
          <span aria-hidden="true" className="invisible [grid-area:1/1]">{label}</span>
          <span aria-hidden="true" className="invisible [grid-area:1/1]">Copied</span>
          <span aria-hidden="true" className="invisible [grid-area:1/1]">Failed</span>
          <TextSwap className="[grid-area:1/1]">{copied ? "Copied" : failed ? "Failed" : label}</TextSwap>
        </span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </>
  );
}
