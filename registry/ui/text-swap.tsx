"use client";

import { useLayoutEffect, useRef, useState, type HTMLAttributes } from "react";
import { cn } from "../lib/cn";

export type TextSwapProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  /** The text to show. A change animates: the old text leaves upward, the new one rises in. */
  children: string;
};

const EASE = "cubic-bezier(0.42, 0, 0.58, 1)";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Old text leaves over 150ms; new text enters over 170ms after 110ms; both move 4px through a 2px blur. */
export function TextSwap({ children, className, ...props }: TextSwapProps) {
  const [shown, setShown] = useState(children);
  const [leaving, setLeaving] = useState<{ text: string; key: number } | null>(null);
  const counter = useRef(0);
  const nowRef = useRef<HTMLSpanElement>(null);
  const oldRef = useRef<HTMLSpanElement>(null);

  if (children !== shown) {
    setLeaving(reducedMotion() ? null : { text: shown, key: ++counter.current });
    setShown(children);
  }

  useLayoutEffect(() => {
    if (!leaving) return;
    const out = oldRef.current?.animate(
      [
        { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
        { opacity: 0, transform: "translateY(-4px)", filter: "blur(2px)" },
      ],
      { duration: 150, easing: EASE, fill: "forwards" },
    );
    const into = nowRef.current?.animate(
      [
        { opacity: 0, transform: "translateY(4px)", filter: "blur(2px)" },
        { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
      ],
      { duration: 170, delay: 110, easing: EASE, fill: "backwards" },
    );
    const key = leaving.key;
    const done = () => setLeaving((current) => (current?.key === key ? null : current));
    if (into) into.onfinish = done;
    else done();
    return () => {
      out?.cancel();
      into?.cancel();
    };
  }, [leaving]);

  return (
    <span className={cn("inline-grid whitespace-nowrap", className)} {...props}>
      <span ref={nowRef} className="[grid-area:1/1]">
        {shown}
      </span>
      {leaving && (
        <span ref={oldRef} key={leaving.key} aria-hidden="true" className="pointer-events-none [grid-area:1/1]">
          {leaving.text}
        </span>
      )}
    </span>
  );
}
