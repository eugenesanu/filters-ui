import type { SVGProps } from "react";
import type { Body } from "./cars";

// Side profiles, one per body style: the outline, then the x of each wheel centre.
const PROFILES: Record<Body, [string, [number, number]]> = {
  SUV: [
    "M16 100c0-13 4-22 18-26l46-10 26-30c4-5 9-7 15-7h104c8 0 14 2 19 8l26 34 26 6c6 2 8 6 8 13v24c0 4-3 6-7 6h-16a29 29 0 0 0-56 0H106a29 29 0 0 0-56 0H24c-5 0-8-4-8-12z",
    [78, 253],
  ],
  Sedan: [
    "M18 100c0-11 5-20 19-24l52-11c20-17 43-27 74-27 30 0 54 8 75 25l40 7c12 2 24 9 24 22v12c0 5-3 8-8 8h-20a29 29 0 0 0-56 0H104a29 29 0 0 0-56 0H26c-5 0-8-4-8-12z",
    [76, 246],
  ],
  Truck: [
    "M14 102c0-14 5-23 19-27l44-9 26-28c4-5 9-7 15-7h62c7 0 11 4 12 10l2 25h104c5 0 8 3 8 8v30c0 5-3 8-8 8h-30a29 29 0 0 0-56 0H104a29 29 0 0 0-56 0H22c-5 0-8-4-8-10z",
    [76, 240],
  ],
  Hatchback: [
    "M26 100c0-11 5-20 19-24l44-11c20-18 41-28 72-29 28 0 50 7 66 26l32 16c8 5 13 12 13 22v8c0 4-3 6-7 6h-23a29 29 0 0 0-56 0H112a29 29 0 0 0-56 0H34c-5 0-8-4-8-14z",
    [84, 214],
  ],
  Coupe: [
    "M14 100c0-10 5-17 18-21l66-13c22-16 44-24 72-24 32 0 56 11 76 29l34 7c14 3 26 8 26 20v8c0 8-3 10-8 10h-22a29 29 0 0 0-56 0H106a29 29 0 0 0-56 0H22c-5 0-8-4-8-16z",
    [78, 248],
  ],
  Minivan: [
    "M18 102c0-13 5-22 18-26l40-10 36-32c5-5 11-7 18-7h124c9 0 14 3 19 9l18 31c4 6 6 12 6 20v21c0 4-3 6-7 6h-24a29 29 0 0 0-56 0H104a29 29 0 0 0-56 0H26c-5 0-8-4-8-12z",
    [76, 238],
  ],
  Van: [
    "M18 102c0-14 4-23 16-27l34-10 22-36c3-5 8-8 14-8h186c8 0 14 6 14 14v75c0 4-3 6-7 6h-29a29 29 0 0 0-56 0H104a29 29 0 0 0-56 0H26c-5 0-8-4-8-14z",
    [76, 240],
  ],
  Convertible: [
    "M18 100c0-11 5-19 18-23l58-10 18-22 8 1-14 21h116l42 8c11 2 22 8 22 21v10c0 7-3 10-8 10h-22a29 29 0 0 0-56 0H104a29 29 0 0 0-56 0H26c-5 0-8-4-8-16z",
    [76, 228],
  ],
};

/** A car's side profile in currentColor. The wheels are ringed in var(--tile-bg) so they read as cut out of the body. */
export function BodyIcon({ body, ...props }: SVGProps<SVGSVGElement> & { body: Body }) {
  const [outline, wheels] = PROFILES[body];
  return (
    <svg viewBox="0 0 320 140" height={28} aria-hidden="true" focusable="false" {...props}>
      <path d={outline} fill="currentColor" />
      {wheels.map((x) => (
        <circle key={x} cx={x} cy={112} r={19} fill="currentColor" stroke="var(--tile-bg, #1F1F1F)" strokeWidth={7} />
      ))}
    </svg>
  );
}
