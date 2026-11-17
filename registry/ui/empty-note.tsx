import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export type EmptyNoteProps = HTMLAttributes<HTMLDivElement> & {
  /** A 16px glyph in currentColor before the words. */
  icon?: ReactNode;
  /** A button or link after the words, e.g. "Clear search". */
  action?: ReactNode;
};

/**
 * A quiet one-line note in place of a list that has nothing in it: dim 14px words, an optional glyph and an optional
 * action. No illustration and no box, so it sits in the space the options would take.
 */
export function EmptyNote({ icon, action, className, children, ...props }: EmptyNoteProps) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2", className)} {...props}>
      <p className="flex min-w-0 items-start gap-2 text-[14px] leading-5 text-[var(--fu-dim,#929292)]">
        {icon && (
          <span aria-hidden="true" className="mt-0.5 shrink-0 [&_svg]:size-4">
            {icon}
          </span>
        )}
        <span dir="auto">{children}</span>
      </p>
      {action}
    </div>
  );
}
