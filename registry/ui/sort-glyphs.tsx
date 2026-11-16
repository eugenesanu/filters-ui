import type { ReactNode, SVGProps } from "react";

export type GlyphProps = Omit<SVGProps<SVGSVGElement>, "children">;

// 16px glyphs for sort orders, drawn in currentColor with 1.5px strokes.
function Glyph({ children, ...props }: GlyphProps & { children: ReactNode }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Bars rising left to right: lowest first. */
export function AscendingGlyph(props: GlyphProps) {
  return (
    <Glyph strokeWidth={2} {...props}>
      <path d="M3.5 13V9.5M8 13V6.5M12.5 13V3" />
    </Glyph>
  );
}

/** Bars falling left to right: highest first. */
export function DescendingGlyph(props: GlyphProps) {
  return (
    <Glyph strokeWidth={2} {...props}>
      <path d="M3.5 13V3M8 13V6.5M12.5 13V9.5" />
    </Glyph>
  );
}

/** A clock: newest first. */
export function ClockGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.75V8l2.25 1.5" />
    </Glyph>
  );
}

/** A gauge with its needle low: least driven first. */
export function GaugeGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M2.25 12.25a5.75 5.75 0 1 1 11.5 0" />
      <path d="M8 12.25 5.5 9.5" />
      <circle cx="8" cy="12.25" r="1.25" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

/** A calendar page: newest year first. */
export function CalendarGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <rect x="2.5" y="3.25" width="11" height="10.25" rx="2" />
      <path d="M2.5 6.75h11M5.5 1.75v2.5M10.5 1.75v2.5" />
    </Glyph>
  );
}
