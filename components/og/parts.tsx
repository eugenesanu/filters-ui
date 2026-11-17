import type { CSSProperties, ReactNode } from "react";
import { TOKENS } from "@/lib/theme";
import { ChevronDownIcon, XIcon, CheckIcon } from "@/registry/ui/icons";

// The share images are drawn by next/og (Satori), which reads inline styles only: no classes, no CSS variables. So every
// colour here is a token's dark value, and every size is the site's own at 1.5x, so the drawings read at thumbnail size.
// Satori also fails on a bare number as a child: numbers go in as strings.

// Satori reads rgba() but not the space-separated rgb(r g b/a) the tokens use.
const dark = (name: keyof typeof TOKENS) =>
  TOKENS[name].dark.replace(/^rgb\((\d+) (\d+) (\d+)\/([\d.]+)\)$/, "rgba($1,$2,$3,$4)");

export const C = {
  page: dark("--fu-page"),
  panel: dark("--fu-panel"),
  card: dark("--fu-card"),
  cardBorder: dark("--fu-card-border"),
  surface: dark("--fu-surface-3"),
  hover: dark("--fu-hover"),
  itemHover: dark("--fu-item-hover"),
  headOpen: dark("--fu-head-open"),
  thumb: dark("--fu-thumb"),
  track: dark("--fu-segment-track"),
  search: dark("--fu-search"),
  line: dark("--fu-line"),
  rail: dark("--fu-rail"),
  control: dark("--fu-control-border"),
  text: dark("--fu-text"),
  mute: dark("--fu-mute"),
  dim: dark("--fu-dim"),
  pillText: dark("--fu-pill-text"),
  swatchText: dark("--fu-swatch-text"),
  swatchEdge: dark("--fu-swatch-edge"),
  accent: dark("--fu-accent"),
  accentSoft: dark("--fu-accent-soft"),
  accentPale: dark("--fu-accent-pale"),
  selected: dark("--fu-selected"),
  token: dark("--fu-token"),
  tokenText: dark("--fu-token-text"),
  barOut: dark("--fu-bar-out"),
  onAccent: dark("--fu-on-accent"),
  pill: dark("--fu-pill"),
  pillSquare: dark("--fu-pill-square"),
  rowActive: dark("--fu-row-active"),
  share: dark("--fu-share"),
  wash: dark("--fu-wash"),
  handle: dark("--fu-handle"),
  handleEdge: dark("--fu-handle-edge"),
  shadow: dark("--fu-shadow-deep"),
};

type Children = { children?: ReactNode };

export const row = (style?: CSSProperties): CSSProperties => ({ display: "flex", alignItems: "center", ...style });
export const col = (style?: CSSProperties): CSSProperties => ({ display: "flex", flexDirection: "column", ...style });

export function Chevron({ up = false, size = 24, color = C.mute }: { up?: boolean; size?: number; color?: string }) {
  return (
    <div style={{ display: "flex", ...(up && { transform: "rotate(180deg)" }) }}>
      <ChevronDownIcon size={size} stroke={color} />
    </div>
  );
}

export function Cross({ size = 21, color = C.mute }: { size?: number; color?: string }) {
  return <XIcon size={size} stroke={color} strokeWidth={2.25} />;
}

/** A filter card, open, with its head: the title, Clear when it has a value, and the chevron. */
export function Card({
  title,
  clear = true,
  summary,
  width = 432,
  children,
  bodyStyle,
}: Children & { title: string; clear?: boolean; summary?: string; width?: number; bodyStyle?: CSSProperties }) {
  return (
    <div
      style={col({
        width,
        background: C.card,
        border: `1.5px solid ${C.cardBorder}`,
        borderRadius: 36,
        boxShadow: `0 36px 72px -24px ${C.shadow}`,
      })}
    >
      <div style={row({ height: 78, padding: "0 24px", gap: 18 })}>
        <div style={{ flex: 1, fontSize: 23, fontWeight: 600, color: C.text }}>{title}</div>
        {summary ? (
          <div style={{ fontSize: 21, color: C.accentSoft }}>{summary}</div>
        ) : clear ? (
          <div style={{ fontSize: 21, fontWeight: 500, color: C.accentSoft }}>Clear</div>
        ) : null}
        <Chevron up={!summary} />
      </div>
      <div style={col({ padding: "0 24px 24px", ...bodyStyle })}>{children}</div>
    </div>
  );
}

/** The count beside an option: a 20px pill on the site, accent when the option is on. */
export function Count({ n, on = false, square = false, style }: { n: number | string; on?: boolean; square?: boolean; style?: CSSProperties }) {
  return (
    <div
      style={row({
        justifyContent: "center",
        height: square ? 27 : 30,
        minWidth: square ? 30 : 33,
        padding: square ? "0 7px" : "0 9px",
        borderRadius: square ? 7.5 : 9,
        fontSize: square ? 16.5 : 18,
        fontWeight: 500,
        background: on ? C.accent : square ? C.pillSquare : C.pill,
        color: on ? C.onAccent : C.pillText,
        ...style,
      })}
    >
      {String(n)}
    </div>
  );
}

export function Chip({ label, count, on = false }: { label: string; count: number; on?: boolean }) {
  return (
    <div
      style={row({
        height: 48,
        gap: 9,
        padding: "0 8px 0 18px",
        borderRadius: 24,
        border: `1.5px solid ${on ? C.accentSoft : C.control}`,
        background: on ? C.selected : "transparent",
        fontSize: 21,
        color: on ? C.accentPale : C.text,
      })}
    >
      {label}
      <Count n={count} on={on} style={{ borderRadius: 15 }} />
    </div>
  );
}

/** A bar chart: `on` bars take the accent, the rest stay grey, with 4.5px top corners as on the site. */
export function Bars({
  values,
  on,
  width,
  height,
  gap = 4.5,
  barScale = 1,
}: {
  values: readonly number[];
  on: (index: number) => boolean;
  width: number;
  height: number;
  gap?: number;
  barScale?: number;
}) {
  const top = Math.max(...values, 1);
  const slot = (width - gap * (values.length - 1)) / values.length;
  const bar = slot * barScale;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", width, height, gap }}>
      {values.map((value, index) => (
        <div key={index} style={{ display: "flex", justifyContent: "center", width: slot }}>
          <div
            style={{
              width: bar,
              height: Math.max(3, Math.round((value / top) * height)),
              borderRadius: "4.5px 4.5px 0 0",
              background: on(index) ? C.accentSoft : C.barOut,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function Handle({ at, size = 30 }: { at: number; size?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: at - size / 2,
        top: 0,
        width: size,
        height: size,
        borderRadius: size,
        background: C.handle,
        border: `1.5px solid ${C.handleEdge}`,
        boxShadow: "0 3px 9px rgba(0,0,0,0.45)",
      }}
    />
  );
}

/** The rail under a chart, its chosen stretch in the accent, with one or two handles. `from` and `to` are 0 to 1. */
export function Rail({ width, from, to, single = false }: { width: number; from: number; to: number; single?: boolean }) {
  return (
    <div style={{ display: "flex", position: "relative", width, height: 30 }}>
      <div style={{ position: "absolute", left: 0, top: 12, width, height: 6, borderRadius: 3, background: C.rail }} />
      <div
        style={{ position: "absolute", left: from * width, top: 12, width: (to - from) * width, height: 6, borderRadius: 3, background: C.accentSoft }}
      />
      {!single && <Handle at={from * width} />}
      <Handle at={to * width} />
    </div>
  );
}

/** A text field or a select: a quiet label, its value, and a clear cross or a chevron. */
export function Field({
  label,
  value,
  end = "clear",
  focus = false,
  style,
}: {
  label?: string;
  value: string;
  end?: "clear" | "chevron" | "chevron-up" | "none";
  focus?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={row({
        flex: 1,
        height: 63,
        gap: 9,
        padding: "0 18px 0 19px",
        borderRadius: 18,
        border: focus ? `2.25px solid ${C.accentSoft}` : `1.5px solid ${C.control}`,
        fontSize: 21,
        color: C.text,
        ...style,
      })}
    >
      {label && <div style={{ color: C.mute }}>{label}</div>}
      <div style={{ flex: 1 }}>{value}</div>
      {end === "clear" && <Cross />}
      {end === "chevron" && <Chevron size={21} />}
      {end === "chevron-up" && <Chevron size={21} up />}
    </div>
  );
}

export function Checkbox({ on = false, size = 27 }: { on?: boolean; size?: number }) {
  return (
    <div
      style={row({
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: 7.5,
        border: `1.5px solid ${on ? C.accentSoft : C.control}`,
        background: on ? C.selected : "transparent",
      })}
    >
      {on && <CheckIcon size={18} stroke={C.accentSoft} strokeWidth={3} />}
    </div>
  );
}

/** The line under a stage: "165 of 256 cars". */
export function Results({ shown, of, noun = "cars" }: { shown: number; of: number; noun?: string }) {
  return (
    <div style={row({ gap: 7, fontSize: 21, color: C.dim })}>
      <div style={{ color: C.text, fontWeight: 500 }}>{String(shown)}</div>
      <div>{`of ${of} ${noun}`}</div>
    </div>
  );
}

/** Content that fades out at its foot, as a long list does in the site's tiles. */
export function FadeFoot({ children, height = 72 }: Children & { height?: number }) {
  return (
    <div style={col({ position: "relative" })}>
      {children}
      <div
        style={{
          position: "absolute",
          left: -2,
          right: -2,
          bottom: -2,
          height,
          backgroundImage: `linear-gradient(to bottom, rgba(31,31,31,0), ${C.card})`,
        }}
      />
    </div>
  );
}
