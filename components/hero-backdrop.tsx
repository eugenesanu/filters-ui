import type { CSSProperties, ReactNode } from "react";

type Backdrop = "range" | "dots" | "rails" | "chips" | "none";

/** Which pattern sits behind the header and the hero. */
const BACKDROP: Backdrop = "range";

// Every field is drawn in px, wider than any screen. Its x = ANCHOR sits on the right edge of the page's content
// column, and the shapes below are placed by their distance from that edge (u), so they keep clear of the hero text.
const FIELD_W = 2640;
const ANCHOR = 1880;
const GUTTER = "[--hero-gutter:16px] sm:[--hero-gutter:32px]";
const fieldLeft = `calc(min(100% - var(--hero-gutter), 50% + 600px - var(--hero-gutter)) - ${ANCHOR}px)`;

const BAND: [number, number] = [-304, -64];

// The opening, once on load, in ms. The handles glide apart and a bar rises as a handle reaches it. Past the handles
// the bars keep rising outwards to both sides of the page, one after another, faster the further out they are.
const WAIT = 150;
const GLIDE = 800;
const SWEEP = 850;
/** How far past the band the sweep runs, in px. Bars beyond it rise with the last one. */
const REACH = 1100;
type Bezier = readonly [number, number, number, number];
const GLIDE_EASE: Bezier = [0.65, 0, 0.35, 1];
/** Where the handles start, as a share of the way from the band's middle to its edge. */
const GLIDE_FROM = 0.2;

/** The share of its time by which a cubic-bezier easing has covered `progress`. */
function timeAt(progress: number, [x1, y1, x2, y2]: Bezier) {
  const at = (s: number, a: number, b: number) => 3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s ** 2 * b + s ** 3;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (at(mid, y1, y2) < progress) low = mid;
    else high = mid;
  }
  return at((low + high) / 2, x1, x2);
}

function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hill = (u: number, at: number, width: number) => Math.exp(-(((u - at) / width) ** 2) / 2);

type Bar = { x: number; u: number; h: number };

/** One bar per `pitch`, 0 to 1 high, shaped like a price histogram: low under the hero text, its bulk in the band. */
function profile(pitch: number, seed = 21): Bar[] {
  const next = random(seed);
  const bars: Bar[] = [];
  for (let x = pitch / 2; x < FIELD_W; x += pitch) {
    const u = x - ANCHOR;
    const shape =
      0.03 +
      0.08 * hill(u, -968, 320) +
      0.1 * hill(u, -528, 150) +
      hill(u, -184, 120) +
      0.3 * hill(u, -38, 60) +
      0.5 * hill(u, 272, 170) +
      0.3 * hill(u, 672, 220) +
      0.12 * hill(u, 1032, 200);
    bars.push({ x, u, h: shape * (0.55 + 0.6 * next()) });
  }
  const top = Math.max(...bars.map((b) => b.h));
  return bars.map((b) => ({ ...b, h: b.h / top }));
}

const inBand = (u: number) => u > BAND[0] && u < BAND[1];

/** Vertical lines rising `h` px from `base`, as one path; a wide stroke turns them into bars. */
function stems(bars: Bar[], base: number) {
  return bars.map(({ x, h }) => `M${x} ${base}v-${Math.round(h)}`).join("");
}

function Field({ height, children }: { height: number; children: ReactNode }) {
  return (
    <svg
      width={FIELD_W}
      height={height}
      viewBox={`0 0 ${FIELD_W} ${height}`}
      className="absolute bottom-9 max-w-none scale-[0.45] sm:scale-50 lg:bottom-6 lg:scale-100"
      style={{ left: fieldLeft, transformOrigin: `${ANCHOR}px 100%` }}
    >
      {children}
    </svg>
  );
}

/**
 * One of the price chart's bars, 12px wide with 3px top corners: a 6px fill inside a 6px round-joined stroke. Clip at
 * `base`, and fade the group rather than its fill so the overlap stays even.
 */
function column({ x, h }: Bar, base: number) {
  const rise = Math.max(2, Math.round(h));
  return `M${x - 3} ${base + 3}v-${rise}h6v${rise}`;
}

function RangeField() {
  const PITCH = 14;
  const H = 200;
  const rail = H - 26;
  const base = rail - 12;
  const bars = profile(PITCH).map((b) => ({ ...b, h: b.h * 128 }));
  const band = bars.filter((b) => inBand(b.u));
  const rest = bars.filter((b) => !inBand(b.u));
  const low = band[0].x - PITCH / 2;
  const high = band[band.length - 1].x + PITCH / 2;
  const centre = (low + high) / 2;
  const half = (high - low) / 2;
  const from = GLIDE_FROM * half;
  // When the opening reaches a bar's near edge, counted from the band's middle.
  const reached = (edge: number) => (edge <= from ? 0 : GLIDE * timeAt((edge - from) / (half - from), GLIDE_EASE));
  const delay = (x: number) => {
    const edge = Math.abs(x - centre) - PITCH / 2;
    if (edge < half - 1) return WAIT + reached(edge);
    return WAIT + reached(half - PITCH) + SWEEP * Math.min(1, (edge - half + PITCH) / REACH) ** (1 / 2.2);
  };
  const columns = (list: Bar[]) => list.map((bar) => <path key={bar.x} d={column(bar, base)} style={{ animationDelay: `${Math.round(delay(bar.x))}ms` }} />);
  const timing = { "--fu-hero-wait": `${WAIT}ms`, "--fu-hero-span": `${GLIDE}ms`, "--fu-hero-ease": `cubic-bezier(${GLIDE_EASE.join(",")})` } as CSSProperties;
  return (
    <Field height={H}>
      <defs>
        <linearGradient id="fu-hero-near" gradientUnits="userSpaceOnUse" x1={low - 900} x2={high + 900} y1={0} y2={0}>
          <stop offset={0} style={{ stopColor: "var(--fu-backdrop)" }} />
          <stop offset={0.4} style={{ stopColor: "var(--fu-backdrop-near)" }} />
          <stop offset={0.6} style={{ stopColor: "var(--fu-backdrop-near)" }} />
          <stop offset={1} style={{ stopColor: "var(--fu-backdrop)" }} />
        </linearGradient>
        <clipPath id="fu-hero-feet">
          <rect width={FIELD_W} height={base} />
        </clipPath>
      </defs>
      <g clipPath="url(#fu-hero-feet)" strokeWidth={6} strokeLinejoin="round">
        <g fill="url(#fu-hero-near)" stroke="url(#fu-hero-near)" opacity={0.55} className="fu-hero-bars">
          {columns(rest)}
        </g>
        <g style={{ fill: "var(--fu-control-hover)", stroke: "var(--fu-control-hover)" }} opacity={0.5} className="fu-hero-bars">
          {columns(band)}
        </g>
      </g>
      <rect y={rail - 2} width={FIELD_W} height={4} rx={2} style={{ fill: "var(--fu-backdrop)" }} />
      <g style={timing}>
        <rect x={low} y={rail - 2} width={high - low} height={4} style={{ fill: "var(--fu-control-hover)", "--fu-open": GLIDE_FROM } as CSSProperties} fillOpacity={0.5} className="fu-hero-open" />
        {/* On load the handles start near the middle of the band and glide out to its edges. */}
        {[low, high].map((cx, i) => (
          <circle
            key={cx}
            cx={cx}
            cy={rail}
            r={10}
            className="fu-hero-glide"
            style={{ fill: "var(--fu-handle)", stroke: "var(--fu-knob-edge)", strokeWidth: 1, "--fu-glide": `${(i ? -1 : 1) * (half - from)}px` } as CSSProperties}
          />
        ))}
      </g>
    </Field>
  );
}

function DotField() {
  const STEP = 6;
  const PITCH = STEP * 3;
  const H = 400;
  const base = H - 30;
  const bars = profile(PITCH).map((b) => ({ ...b, x: b.x - PITCH / 2 + STEP, h: Math.round((b.h * 150) / STEP) * STEP }));
  const band = bars.filter((b) => inBand(b.u));
  const rest = bars.filter((b) => !inBand(b.u));
  const low = band[0].x - STEP * 1.5;
  const high = band[band.length - 1].x + STEP * 1.5;
  const dot = (id: string, fill: string) => (
    <pattern id={id} width={STEP} height={STEP} patternUnits="userSpaceOnUse" y={base}>
      <circle cx={STEP / 2} cy={STEP / 2} r={1.1} style={{ fill }} />
    </pattern>
  );
  return (
    <Field height={H}>
      <defs>
        {dot("fu-hero-dot", "var(--fu-text)")}
        {dot("fu-hero-dot-on", "var(--fu-accent-soft)")}
        <mask id="fu-hero-rest" maskUnits="userSpaceOnUse">
          <path d={stems(rest, base)} stroke="#FFFFFF" strokeWidth={STEP * 2} />
        </mask>
        <mask id="fu-hero-band" maskUnits="userSpaceOnUse">
          <path d={stems(band, base)} stroke="#FFFFFF" strokeWidth={STEP * 2} />
        </mask>
      </defs>
      <rect width={FIELD_W} height={base} fill="url(#fu-hero-dot)" opacity={0.06} />
      <rect width={FIELD_W} height={base} fill="url(#fu-hero-dot)" mask="url(#fu-hero-rest)" opacity={0.22} />
      <rect width={FIELD_W} height={base} fill="url(#fu-hero-dot-on)" mask="url(#fu-hero-band)" opacity={0.75} />
      <rect y={base + 10} width={FIELD_W} height={2} rx={1} style={{ fill: "var(--fu-backdrop)" }} />
      <rect x={low} y={base + 10} width={high - low} height={2} style={{ fill: "var(--fu-accent-soft)" }} fillOpacity={0.7} />
      <circle cx={low} cy={base + 11} r={6} style={{ fill: "var(--fu-handle)" }} />
      <circle cx={high} cy={base + 11} r={6} style={{ fill: "var(--fu-handle)" }} />
    </Field>
  );
}

function RailField() {
  const ROWS = 6;
  const GAP = 26;
  const H = ROWS * GAP + 8;
  const next = random(11);
  const from = ANCHOR - 480;
  const centre = ANCHOR + (BAND[0] + BAND[1]) / 2;
  // A stack of range sliders, each narrower than the one above, ending on the band.
  const rows = Array.from({ length: ROWS }, (_, i) => {
    const t = i / (ROWS - 1);
    const half = (BAND[1] - BAND[0]) / 2 + (1 - t) * 260 + (next() - 0.5) * 40 * (1 - t);
    const shift = (next() - 0.5) * 140 * (1 - t);
    return { y: 6 + i * GAP, low: centre + shift - half, high: centre + shift + half, last: i === ROWS - 1 };
  });
  return (
    <Field height={H}>
      {rows.map((row) => (
        <g key={row.y}>
          <rect x={from} y={row.y - 1} width={FIELD_W - from} height={2} rx={1} style={{ fill: "var(--fu-backdrop)" }} />
          <rect
            x={row.low}
            y={row.y - 1}
            width={row.high - row.low}
            height={2}
            style={{ fill: row.last ? "var(--fu-accent-soft)" : "var(--fu-line)" }}
            fillOpacity={0.7}
          />
          {[row.low, row.high].map((cx) => (
            <circle key={cx} cx={cx} cy={row.y} r={row.last ? 6 : 4} style={{ fill: row.last ? "var(--fu-handle)" : "var(--fu-line)" }} />
          ))}
        </g>
      ))}
    </Field>
  );
}

function ChipField() {
  const ROWS = 4;
  const H = ROWS * 36 + 8;
  const next = random(5);
  const chips: { x: number; y: number; w: number; on: boolean }[] = [];
  for (let r = 0; r < ROWS; r++) {
    let x = ANCHOR - 560 - ((r * 37) % 90);
    while (x < FIELD_W) {
      const w = 36 + Math.round(next() * 5) * 10;
      const u = x + w / 2 - ANCHOR;
      chips.push({ x, y: 6 + r * 36, w, on: inBand(u) && r >= ROWS - 2 && next() > 0.4 });
      x += w + 8;
    }
  }
  return (
    <Field height={H}>
      {chips.map((c) => (
        <rect
          key={`${c.x}-${c.y}`}
          x={c.x + 0.5}
          y={c.y + 0.5}
          width={c.w - 1}
          height={23}
          rx={11.5}
          style={{ fill: c.on ? "var(--fu-selected)" : "none", stroke: c.on ? "var(--fu-accent-soft)" : "var(--fu-backdrop)" }}
          strokeOpacity={c.on ? 0.5 : 1}
        />
      ))}
    </Field>
  );
}

// "edges" fades only the screen's sides; "right" keeps the pattern clear of the hero text.
const FIELDS: Record<Exclude<Backdrop, "none">, { Pattern: () => ReactNode; side: "edges" | "right" }> = {
  range: { Pattern: RangeField, side: "edges" },
  dots: { Pattern: DotField, side: "edges" },
  rails: { Pattern: RailField, side: "right" },
  chips: { Pattern: ChipField, side: "right" },
};

const SIDES = {
  edges: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
  right: "linear-gradient(to right, transparent 30%, #000 62%, #000 92%, transparent)",
};

function fade(side: keyof typeof SIDES): CSSProperties {
  const image = `linear-gradient(to bottom, transparent 10%, #000 72%), ${SIDES[side]}`;
  return { maskImage: image, maskComposite: "intersect", WebkitMaskImage: image, WebkitMaskComposite: "source-in" };
}

/** The pattern behind the header and the hero. Fills its positioned parent and never takes a pointer. Right to left it
 * is drawn mirrored, so it still keeps clear of the hero text, which then sits on the right. */
export function HeroBackdrop() {
  if (BACKDROP === "none") return null;
  const { Pattern, side } = FIELDS[BACKDROP];
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 -z-10 select-none overflow-hidden rtl:-scale-x-100 ${GUTTER}`} style={fade(side)}>
      <Pattern />
    </div>
  );
}
