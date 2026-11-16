"use client";

import { CopyButton as LibraryCopyButton, copyToClipboard } from "@/registry/ui/copy-button";

export const copyText = copyToClipboard;

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

/** The copy panel's buttons: the library's copy button, large and blue for the prompt, small and grey elsewhere. */
export function CopyButton({ text, label = "Copy", announce = "Copied", ariaLabel, variant = "quiet", className }: CopyButtonProps) {
  return (
    <LibraryCopyButton
      text={text}
      label={label}
      announce={announce}
      aria-label={ariaLabel}
      variant={variant === "primary" ? "primary" : "secondary"}
      size={variant === "primary" ? "lg" : "sm"}
      className={className}
    />
  );
}
