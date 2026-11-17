import { cn } from "../lib/cn";

// The button looks as class names. Kept apart from button.tsx, a client module, so server pages can call them too.

export type ButtonVariant = "primary" | "secondary" | "ghost" | "quiet" | "quiet-accent";
export type ButtonSize = "sm" | "md" | "lg";

export const BUTTON_BASE = cn(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[10px] font-[inherit] font-medium whitespace-nowrap no-underline select-none",
  "[-webkit-tap-highlight-color:transparent] transition-[background-color,color,scale] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
  "active:scale-[0.97] active:duration-75 motion-reduce:transition-none motion-reduce:active:scale-100",
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]",
  "aria-busy:cursor-progress aria-busy:active:scale-100",
);

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--fu-accent,#3B57E6)] text-[var(--fu-on-accent,#FFFFFF)] hover:bg-[var(--fu-accent-hover,#3450D4)] forced-colors:border forced-colors:border-[ButtonText]",
  secondary:
    "bg-[var(--fu-surface-3,#2A2A2A)] text-[var(--fu-text,#F8F5F1)] hover:bg-[var(--fu-hover,#333333)] forced-colors:border forced-colors:border-[ButtonText]",
  ghost: "bg-transparent text-[var(--fu-text,#F8F5F1)] hover:bg-[var(--fu-hover-wash,rgb(255_255_255/0.14))]",
  quiet: "bg-transparent text-[var(--fu-mute,#BDBDBD)] hover:text-[var(--fu-text,#F8F5F1)]",
  "quiet-accent":
    "bg-transparent text-[var(--fu-accent-soft,#8FAAFF)] decoration-1 underline-offset-[5px] hover:text-[var(--fu-accent-pale,#D1DDFF)] [@media(hover:hover)]:hover:underline",
};

// Below 44px a touch screen gets a taller invisible target through ::after.
const TAP = "pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:content-['']";

const SIZES: Record<ButtonSize, { box: string; before: string; after: string }> = {
  sm: { box: cn("h-8 gap-1.5 px-3 text-[13px] leading-5 [&_svg]:size-4", TAP, "pointer-coarse:after:-inset-y-1.5"), before: "ps-2.5", after: "pe-2.5" },
  md: { box: cn("h-10 gap-2 px-3.5 text-[15px] leading-5 [&_svg]:size-4", TAP, "pointer-coarse:after:-inset-y-0.5"), before: "ps-3", after: "pe-3" },
  lg: { box: "h-11 gap-2 px-4 text-[15px] leading-5 [&_svg]:size-[18px]", before: "ps-3.5", after: "pe-3.5" },
};

/** The classes of a button, for a link or a router link that should look like one. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  before = false,
  after = false,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; before?: boolean; after?: boolean; className?: string } = {}) {
  return cn(BUTTON_BASE, VARIANTS[variant], SIZES[size].box, before && SIZES[size].before, after && SIZES[size].after, className);
}
