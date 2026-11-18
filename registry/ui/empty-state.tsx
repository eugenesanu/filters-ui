import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  /** The picture above the words: an image address, drawn 56px square, or any node of that size. */
  art?: string | ReactNode;
  /** The one line that says what is missing. */
  title: ReactNode;
  /** A link or button under the words, such as "Clear search". */
  action?: ReactNode;
  /** A second, quieter line under the title. */
  children?: ReactNode;
};

// Each part arrives once, a beat after the one above it: the picture comes into focus, the words rise into place.
const ENTER =
  "transition-[opacity,filter,translate,scale] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none starting:opacity-0";

/**
 * What a list shows in the room its options would take when it has none: a picture, one line and an action, stacked
 * in the middle. For a single quiet line with no picture, use EmptyNote.
 */
export function EmptyState({ art, title, action, className, children, ...props }: EmptyStateProps) {
  return (
    <div className={cn("flex min-w-0 max-w-full flex-col items-center text-center", className)} {...props}>
      {art && (
        <span aria-hidden="true" className={cn("mb-3 block size-14 shrink-0", ENTER, "starting:scale-[0.82] starting:blur-[6px]")}>
          {typeof art === "string" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art} alt="" width={56} height={56} loading="lazy" decoding="async" draggable={false} className="size-full object-contain select-none" />
          ) : (
            art
          )}
        </span>
      )}
      <p dir="auto" className={cn("max-w-full text-[15px] leading-5 font-medium text-[var(--fu-text,#F8F5F1)]", ENTER, "delay-[60ms] starting:translate-y-1.5 starting:blur-[2px]")}>
        {title}
      </p>
      {children && (
        <p dir="auto" className={cn("mt-1 max-w-full text-[14px] leading-5 text-[var(--fu-mute,#BDBDBD)]", ENTER, "delay-[90ms] starting:translate-y-1.5 starting:blur-[2px]")}>
          {children}
        </p>
      )}
      {action && <div className={cn("mt-2 max-w-full", ENTER, "delay-[120ms] starting:translate-y-1.5")}>{action}</div>}
    </div>
  );
}
