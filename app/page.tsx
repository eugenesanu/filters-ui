import type { Metadata } from "next";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BoardTile, ItemTile, TileGrid } from "@/components/tile/item-tile";
import { HERO } from "@/lib/home-copy";
import { HOME_SEO, homeJsonLd, pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { ITEMS } from "@/registry/items";
import { buttonClasses } from "@/registry/ui/button-classes";

export const metadata: Metadata = pageMetadata({ title: HOME_SEO.title, description: HOME_SEO.description, path: "/" });

export default function Home() {
  // Narrow blocks, such as the filter panel, take an ordinary tile at the end of the Filters grid, before All filters,
  // which spans two columns beside it and closes the grid.
  const all = ITEMS.filter((item) => item.kind === "filter");
  const filters = [
    ...all.filter((item) => item.slug !== "all-filters"),
    ...ITEMS.filter((item) => item.kind === "block" && item.narrow),
    ...all.filter((item) => item.slug === "all-filters"),
  ];
  const basics = ITEMS.filter((item) => item.kind === "basic");
  const block = ITEMS.find((item) => item.kind === "block" && !item.narrow);

  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={homeJsonLd()} />
      <SiteHeader />
      <main className="flex-1">
        {/* Pulled up under the sticky header so the backdrop runs behind it; the bottom padding is room for its bars
            and keeps its handles about 40px above the Filters heading. */}
        <div className="relative isolate -mt-16 pb-[100px] pt-16 lg:pb-24">
          <HeroBackdrop />
          <section className="mx-auto max-w-[1200px] px-4 pb-12 pt-14 sm:px-8 sm:pb-14 sm:pt-16">
            <h1 className="max-w-[760px] text-[clamp(36px,5vw,56px)] font-semibold leading-[1.05] tracking-[-0.03em] text-balance text-text">
              {HERO.title}
            </h1>
            <p className="mt-4 max-w-[560px] text-[17px] leading-[1.5] text-pretty text-mute sm:text-[18px]">{HERO.subtitle}</p>
            {site.isPublic && (
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a href={site.repoUrl} target="_blank" rel="noopener" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                  View on GitHub
                </a>
              </div>
            )}
          </section>
        </div>

        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-8">
          <section id="filters" aria-labelledby="filters-heading" className="scroll-mt-24">
            <h2 id="filters-heading" className="mb-5 text-[20px] font-semibold leading-7 tracking-[-0.01em] text-text">
              Filters
            </h2>
            <TileGrid>
              {filters.map((item) => (
                <ItemTile key={item.slug} item={item} wide={item.slug === "all-filters"} apart />
              ))}
            </TileGrid>
          </section>

          {basics.length > 0 && (
            <section id="basics" aria-labelledby="basics-heading" className="scroll-mt-24 pt-14 sm:pt-16">
              <h2 id="basics-heading" className="mb-5 text-[20px] font-semibold leading-7 tracking-[-0.01em] text-text">
                Basics
              </h2>
              <TileGrid>
                {basics.map((item) => (
                  <ItemTile key={item.slug} item={item} apart />
                ))}
              </TileGrid>
            </section>
          )}

          {block && (
            <div className="pb-24 pt-14 sm:pb-28 sm:pt-16">
              <BoardTile item={block} />
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
