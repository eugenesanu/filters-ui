import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { WORDMARK_PATH } from "@/components/logo";
import { HERO } from "@/lib/home-copy";
import { ABOUT_SEO, KIND_LABEL } from "@/lib/seo";
import { site } from "@/lib/site";
import { itemBySlug } from "@/registry/items";
import { ArrowUpRightIcon } from "@/registry/ui/icons";
import { Motif } from "./motifs";
import { C, col, row } from "./parts";

const OG_SIZE = { width: 1200, height: 630 };

type Weight = 400 | 500 | 600;
type Font = { name: string; data: Buffer; weight: Weight; style: "normal" };

// The site's font as TTF (next/font serves woff2, which Satori cannot read), read once per build worker. The files sit
// in assets/, as Google Fonts serves them, so a build never waits on another server.
const FILES: Record<Weight, string> = { 400: "Outfit-Regular.ttf", 500: "Outfit-Medium.ttf", 600: "Outfit-SemiBold.ttf" };
let fonts: Promise<Font[]> | undefined;

async function outfit(weight: Weight): Promise<Font> {
  return { name: "Outfit", data: await readFile(join(process.cwd(), "assets", FILES[weight])), weight, style: "normal" };
}

const loadFonts = () => (fonts ??= Promise.all(([400, 500, 600] as const).map(outfit)));

let mark: Promise<string> | undefined;
const loadMark = () =>
  (mark ??= readFile(join(process.cwd(), "app/icon.svg"), "base64").then((data) => `data:image/svg+xml;base64,${data}`));

async function render(node: ReactNode) {
  const [fontList, markSrc] = await Promise.all([loadFonts(), loadMark()]);
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          position: "relative",
          width: "100%",
          height: "100%",
          background: C.page,
          color: C.text,
          fontFamily: "Outfit",
        }}
      >
        <Brand markSrc={markSrc} />
        {node}
      </div>
    ),
    { ...OG_SIZE, fonts: fontList },
  );
}

/** The logo at the top left: app/icon.svg and the logo's own letters, spaced as in components/logo.tsx. */
function Brand({ markSrc }: { markSrc: string }) {
  const height = 46;
  // In the logo the letters span x 167.74 to 559.84 and y 26.57 to 104.37 of a mark 129.28 high.
  const unit = height / 129.28;
  return (
    <div style={row({ position: "absolute", left: 64, top: 56, gap: (167.74 - 129.28) * unit })}>
      <img src={markSrc} width={height} height={height} alt="" />
      <svg width={392.1 * unit} height={77.8 * unit} viewBox="167.74 26.57 392.1 77.8" style={{ marginTop: (26.57 - 64.64 + 38.9) * unit }}>
        <path transform="translate(158.74 102.47)" fill={C.text} d={WORDMARK_PATH} />
      </svg>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <div style={row({ height: 36, padding: "0 15px", borderRadius: 18, background: C.selected, color: C.accentSoft, fontSize: 19, fontWeight: 500 })}>
      {children}
    </div>
  );
}

const FACTS = ["Free", "MIT", "React + Tailwind", "AI prompt"];

function Facts() {
  return (
    <div style={row({ position: "absolute", left: 64, bottom: 54, gap: 12, fontSize: 19, color: C.dim })}>
      {FACTS.map((fact, index) => (
        <div key={fact} style={row({ gap: 12 })}>
          {index > 0 && <div style={{ width: 4, height: 4, borderRadius: 4, background: C.line }} />}
          {fact}
        </div>
      ))}
    </div>
  );
}

/** The right half: a stage like the item page's, with the drawing centred in it. */
function Stage({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        left: 608,
        top: 44,
        width: 548,
        height: 542,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 40,
        background: C.panel,
        border: `1.5px solid ${C.card}`,
        backgroundImage: `radial-gradient(circle at 50% 42%, rgba(59,87,230,0.16), rgba(59,87,230,0) 62%)`,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function Words({ kind, title, line }: { kind: string; title: string; line: string }) {
  return (
    <div style={col({ position: "absolute", left: 64, top: 0, bottom: 0, width: 500, justifyContent: "center" })}>
      <div style={{ display: "flex" }}>
        <Pill>{kind}</Pill>
      </div>
      <div style={{ marginTop: 22, fontSize: 68, fontWeight: 600, lineHeight: 1.04, letterSpacing: -2.2, color: C.text }}>{title}</div>
      <div style={{ marginTop: 20, fontSize: 26, lineHeight: 1.4, color: C.mute }}>{line}</div>
    </div>
  );
}

export async function itemImage(slug: string) {
  const item = itemBySlug(slug);
  if (!item) throw new Error(`Share images: no item "${slug}".`);
  return render(
    <>
      <Words kind={KIND_LABEL[item.kind]} title={item.title} line={item.description} />
      <Facts />
      <Stage>
        <Motif slug={item.slug} title={item.title} />
      </Stage>
    </>,
  );
}

/** The hero's price chart along the foot of the image, low under the words and tall on the right, its band in the accent. */
function HeroChart() {
  const bars = 75;
  const pitch = 1200 / bars;
  // A fixed seed, so every build draws the same chart.
  let seed = 21;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const heights = Array.from({ length: bars }, (_, i) => {
    const x = i / (bars - 1);
    const hill = (at: number, width: number) => Math.exp(-(((x - at) / width) ** 2) / 2);
    const shape = 0.03 + 0.08 * hill(0.15, 0.1) + 0.12 * hill(0.42, 0.08) + hill(0.71, 0.075) + 0.35 * hill(0.87, 0.05) + 0.15 * hill(0.97, 0.04);
    return Math.round(255 * shape * (0.72 + 0.36 * next()));
  });
  const from = 46;
  const to = 60;
  return (
    <div style={{ display: "flex", position: "absolute", left: 0, right: 0, bottom: 0, height: 330 }}>
      {heights.map((height, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: i * pitch + (pitch - 12) / 2,
            bottom: 70,
            width: 12,
            height: Math.max(4, height),
            borderRadius: "4.5px 4.5px 0 0",
            background: i >= from && i <= to ? C.accentSoft : C.barOut,
            opacity: i >= from && i <= to ? 1 : 0.35 + 0.65 * Math.min(1, i / 40),
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 61,
          height: 4.5,
          backgroundImage: `linear-gradient(to right, rgba(74,74,74,0), ${C.rail} 45%, ${C.rail} 85%, rgba(74,74,74,0))`,
        }}
      />
      <div style={{ position: "absolute", left: from * pitch, width: (to + 1 - from) * pitch, bottom: 61, height: 4.5, background: C.accentSoft }} />
      {[from * pitch, (to + 1) * pitch].map((left) => (
        <div
          key={left}
          style={{
            position: "absolute",
            left: left - 17,
            bottom: 46,
            width: 34,
            height: 34,
            borderRadius: 34,
            background: C.handle,
            boxShadow: "0 3px 9px rgba(0,0,0,0.5)",
          }}
        />
      ))}
    </div>
  );
}

export function homeImage() {
  return render(
    <>
      <HeroChart />
      <div style={col({ position: "absolute", left: 64, top: 150, width: 760 })}>
        <div style={{ fontSize: 84, fontWeight: 600, lineHeight: 1.02, letterSpacing: -3, color: C.text }}>{HERO.title}</div>
        <div style={{ marginTop: 24, width: 600, fontSize: 26, lineHeight: 1.4, color: C.mute }}>{HERO.subtitle}</div>
      </div>
    </>,
  );
}

function LinkRow({ text }: { text: string }) {
  return (
    <div style={row({ height: 66, gap: 12, borderTop: `1.5px solid ${C.cardBorder}`, fontSize: 22, color: C.text })}>
      <div style={{ flex: 1 }}>{text}</div>
      <ArrowUpRightIcon size={22} stroke={C.accentSoft} />
    </div>
  );
}

const bare = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

export function aboutImage() {
  return render(
    <>
      <Words kind="About" title={ABOUT_SEO.heading} line={ABOUT_SEO.role} />
      <Facts />
      <Stage>
        <div style={col({ width: 444, padding: "30px 30px 12px", borderRadius: 36, background: C.card, border: `1.5px solid ${C.cardBorder}`, boxShadow: `0 36px 72px -24px ${C.shadow}` })}>
          <div style={{ fontSize: 19, color: C.dim }}>Designed and built by</div>
          <div style={{ marginTop: 6, fontSize: 34, fontWeight: 600, letterSpacing: -0.8, color: C.text }}>{site.author.name}</div>
          <div style={{ marginTop: 18, marginBottom: 24, fontSize: 22, lineHeight: 1.45, color: C.mute }}>{ABOUT_SEO.summary}</div>
          <LinkRow text={bare(site.author.url)} />
          <LinkRow text={bare(site.author.github)} />
        </div>
      </Stage>
    </>,
  );
}
