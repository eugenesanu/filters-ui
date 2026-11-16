import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BoardTile, ItemTile, TileGrid } from "@/components/tile/item-tile";
import { HERO } from "@/lib/home-copy";
import { site } from "@/lib/site";
import { ITEMS } from "@/registry/items";

const BUTTON =
  "inline-flex h-11 items-center whitespace-nowrap rounded-[10px] px-4 text-[15px] font-medium leading-5 transition-[background-color] duration-200 ease-smooth";

export default function Home() {
  const filters = ITEMS.filter((item) => item.kind === "filter");
  const block = ITEMS.find((item) => item.kind === "block");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 sm:px-8">
        <section className="pb-12 pt-14 sm:pb-14 sm:pt-16">
          <h1 className="max-w-[760px] text-[clamp(36px,5vw,56px)] font-semibold leading-[1.05] tracking-[-0.03em] text-balance text-text">
            {HERO.title}
          </h1>
          <p className="mt-4 max-w-[560px] text-[17px] leading-[1.5] text-pretty text-mute sm:text-[18px]">{HERO.subtitle}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#filters" className={`${BUTTON} bg-accent text-white hover:bg-accent-hover`}>
              Browse filters
            </a>
            {site.isPublic && (
              <a href={site.repoUrl} target="_blank" rel="noopener" className={`${BUTTON} bg-surface-3 text-text hover:bg-hover`}>
                View on GitHub
              </a>
            )}
          </div>
        </section>

        <section id="filters" aria-labelledby="filters-heading" className="scroll-mt-24">
          <h2 id="filters-heading" className="mb-5 text-[20px] font-semibold leading-7 tracking-[-0.01em] text-text">
            Filters
          </h2>
          <TileGrid>
            {filters.map((item) => (
              <ItemTile key={item.slug} item={item} />
            ))}
          </TileGrid>
        </section>

        {block && (
          <div className="pb-24 pt-14 sm:pb-28 sm:pt-16">
            <BoardTile item={block} />
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
