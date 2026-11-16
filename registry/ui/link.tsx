import type { AnchorHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { ArrowUpRightIcon, ChevronDownIcon } from "./icons";

export type LinkVariant = "inline" | "quiet";

export type LinkStyle = {
  /** "inline": accent text, always underlined, for a link inside a sentence. "quiet": muted text that lights up, for navigation. Default "inline". */
  variant?: LinkVariant;
  /** A quiet link's colour at rest: "mute" #BDBDBD or "dim" #8C8C8C. Default "mute". */
  tone?: "mute" | "dim";
  /** A quiet link's height: "md" 36px, "lg" 44px (a header). Default "md". */
  size?: "md" | "lg";
  className?: string;
};

const FOCUS =
  "rounded-[4px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)] [-webkit-tap-highlight-color:transparent]";

/** The classes of a link, for a router link such as next/link. Pair a quiet one with LinkArrow for an arrow that nudges on hover. */
export function linkClasses({ variant = "inline", tone = "mute", size = "md", className }: LinkStyle = {}) {
  return cn(
    "group/link transition-[color,text-decoration-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
    FOCUS,
    variant === "inline"
      ? cn(
          "text-[var(--fu-accent-soft,#8FAAFF)] underline decoration-1 underline-offset-[3px] decoration-[color:var(--fu-link-line,rgb(143_170_255/0.4))]",
          "hover:text-[var(--fu-accent-pale,#D1DDFF)] hover:decoration-[color:var(--fu-accent-pale,#D1DDFF)]",
        )
      : cn(
          "relative inline-flex items-center gap-1 text-[14px] leading-5 whitespace-nowrap no-underline hover:text-[var(--fu-text,#F8F5F1)]",
          tone === "dim" ? "text-[var(--fu-dim,#8C8C8C)]" : "text-[var(--fu-mute,#BDBDBD)]",
          size === "lg" ? "h-11" : "h-9 pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1 pointer-coarse:after:content-['']",
        ),
    className,
  );
}

/** A 16px chevron that nudges 2px its way while its link is hovered. Back links point and nudge left. */
export function LinkArrow({ direction = "forward", className }: { direction?: "forward" | "back"; className?: string }) {
  return (
    <ChevronDownIcon
      size={16}
      className={cn(
        "shrink-0 transition-[translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        direction === "back" ? "rotate-90 group-hover/link:-translate-x-0.5" : "-rotate-90 group-hover/link:translate-x-0.5",
        className,
      )}
    />
  );
}

/** The up-right arrow after a link that opens a new tab, with the words a screen reader needs. */
export function ExternalMark() {
  return (
    <>
      <ArrowUpRightIcon
        size={12}
        strokeWidth={2.5}
        className={cn(
          "ml-1 inline-block shrink-0 align-[-1px] opacity-70",
          "transition-[translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/link:translate-x-px group-hover/link:-translate-y-px motion-reduce:transition-none",
        )}
      />
      <span className="sr-only"> (opens in a new tab)</span>
    </>
  );
}

export type TextLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  LinkStyle & {
    /** A chevron before ("back") or after ("forward") the words. */
    arrow?: "forward" | "back";
  };

/**
 * A link: "inline" inside a sentence (#8FAAFF, underlined, so colour is never its only mark) or "quiet" for
 * navigation (muted, no underline). target="_blank" adds an up-right arrow, "opens in a new tab" and rel="noopener".
 * An action with no URL is a Button with variant "quiet", not a link.
 */
export function TextLink({ variant, tone, size, arrow, target, rel, className, children, ...props }: TextLinkProps) {
  const external = target === "_blank";
  return (
    <a target={target} rel={rel ?? (external ? "noopener" : undefined)} className={linkClasses({ variant, tone, size, className })} {...props}>
      {arrow === "back" && <LinkArrow direction="back" />}
      {children}
      {arrow === "forward" && <LinkArrow />}
      {external && <ExternalMark />}
    </a>
  );
}
