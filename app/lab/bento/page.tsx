import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CopyPanel } from "@/components/copy/copy-panel";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { Logo } from "@/components/logo";
import { FilterStage } from "@/components/stage/filter-stage";
import { BoardPreview, TilePreview } from "@/components/tile/previews";
import { HERO } from "@/lib/home-copy";
import { panelDataOf } from "@/lib/panel-data";
import { itemBySlug } from "@/registry/items";
import { RulesBox } from "./parts";

export const metadata: Metadata = {
  title: "Lab: bento",
  robots: { index: false, follow: false },
};

// The home tiles' hover glow, held on: a ring of colour behind a blurred plate, so it only shows at the rim. Three
// times the box, so it still covers a tall box when turned.
const GLOW =
  "pointer-events-none absolute inset-[-100%] -z-20 bg-[conic-gradient(var(--fu-glow-blue),var(--fu-glow-violet),var(--fu-glow-rose),var(--fu-glow-amber),var(--fu-glow-teal),var(--fu-glow-blue))] opacity-[0.4]";

/** One box of the grid: a real, inert preview on the site's tile surface, fading out at the bottom when it is taller. */
function Cell({
  slug,
  area,
  width = 320,
  zoom = 1,
  glow,
  middle = false,
  preview,
  children,
}: {
  slug?: string;
  area: string;
  width?: number;
  zoom?: number;
  /** Degrees the ring of colour is turned; left out, the box has no glow. */
  glow?: number;
  /** A short preview sits in the middle of its box instead of at the top. */
  middle?: boolean;
  /** A preview drawn here instead of the home tile of `slug`. */
  preview?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-[28px] border border-card bg-panel" style={{ gridArea: area }}>
      {glow !== undefined && (
        <>
          <span aria-hidden className={GLOW} style={{ rotate: `${glow}deg` }} />
          <span aria-hidden className="pointer-events-none absolute inset-[3px] -z-10 rounded-[inherit] bg-panel blur-[14px]" />
        </>
      )}
      {children ?? (
        <div
          inert
          aria-hidden
          className="pointer-events-none absolute inset-0 select-none [mask-image:linear-gradient(to_bottom,#000_calc(100%-80px),transparent_calc(100%-6px))]"
        >
          <div className={`flex h-full flex-col items-center px-7 ${middle ? "justify-center pb-2" : "pt-7"}`}>
            <div className="shrink-0" style={{ width, zoom }}>
              {preview ?? <TilePreview slug={slug ?? ""} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const BOARD = "grid h-[1200px] w-[1600px] gap-5 bg-page p-11";

/** The cover: the name and the best-known filters. */
function Cover() {
  return (
    <div
      id="bento"
      className={`${BOARD} grid-cols-4 grid-rows-3`}
      style={{ gridTemplateAreas: '"brand brand colour panel" "price sentence sentence panel" "rules rules body budget"' }}
    >
      <Cell area="brand">
        <HeroBackdrop />
        <div className="flex h-full flex-col p-9">
          <Logo className="h-8 w-auto self-start" />
          <p className="mt-7 whitespace-nowrap text-[46px] font-semibold leading-[1.05] tracking-[-0.03em] text-text">{HERO.title}</p>
        </div>
      </Cell>
      <Cell area="colour" slug="color-swatches" middle glow={210} />
      <Cell area="panel" slug="filter-panel" width={310} />
      <Cell area="price" slug="range-histogram" middle glow={30} />
      <Cell area="sentence" slug="sentence-search" width={620} />
      <Cell area="rules" preview={<RulesBox />} width={670} />
      <Cell area="body" slug="icon-tiles" />
      <Cell area="budget" slug="budget" glow={120} />
    </div>
  );
}

/** The second board: the filters the cover leaves out. */
function More() {
  return (
    <div
      id="bento"
      className={`${BOARD} grid-cols-4 grid-rows-3`}
      style={{ gridTemplateAreas: '"date recent recent bar" "date year none bar" "all all chips applied"' }}
    >
      <Cell area="date" slug="date-range" glow={300} />
      <Cell area="recent" slug="recent-searches" width={620} />
      <Cell area="bar" slug="bar-list" middle />
      <Cell area="year" slug="range-select" middle />
      <Cell area="none" slug="no-results" middle />
      <Cell area="all" slug="all-filters" width={670} />
      <Cell area="chips" slug="chip-group" middle glow={160} />
      <Cell area="applied" slug="applied-filters" />
    </div>
  );
}

/** The full set, as the home page draws it, in one box. */
function FullSet() {
  return (
    <div id="bento" className={`${BOARD} grid-cols-1 grid-rows-1`} style={{ gridTemplateAreas: '"set"' }}>
      <Cell area="set" width={929} zoom={1.5} glow={250} preview={<BoardPreview />} />
    </div>
  );
}

/** A filter's page as it is: the live stage beside the prompt to copy, drawn larger. */
async function Copy() {
  const item = itemBySlug("range-histogram");
  if (!item) notFound();
  const data = await panelDataOf(item);
  return (
    <div id="bento" className="h-[1200px] w-[1600px] bg-page p-11">
      <div className="grid h-[695px] w-[945px] grid-cols-[minmax(0,58fr)_minmax(0,42fr)] gap-[12.5px]" style={{ zoom: 1.6 }}>
        <FilterStage slug={item.slug} states={item.states} />
        <CopyPanel data={data} className="h-full" />
      </div>
    </div>
  );
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// 1600 x 1200 boards for the README and for shots: shots.mjs takes #bento at twice the size, in either theme.
// ?board=cover|more|set|copy picks one.
export default async function LabBentoPage({ searchParams }: PageProps<"/lab/bento">) {
  // Private boards for making stills; never served by a production build.
  if (process.env.NODE_ENV === "production") notFound();
  const board = first((await searchParams).board) ?? "cover";

  return <main className="bg-page">{board === "more" ? <More /> : board === "set" ? <FullSet /> : board === "copy" ? <Copy /> : <Cover />}</main>;
}
