import { ITEMS, type RegistryItem } from "@/registry/items";
import { panelDataOf } from "@/lib/panel-data";
import { CopyPanel } from "@/components/copy/copy-panel";
import { FilterStage } from "@/components/stage/filter-stage";
import { ItemPager, PageHead } from "@/components/item/page-head";
import { ItemDetails } from "@/components/item/item-details";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ItemTile, TileGrid } from "@/components/tile/item-tile";

/** One item's page: head, the live stage beside the copy panel (or above it for a block or a wide filter), then the details. */
export async function ItemView({ item }: { item: RegistryItem }) {
  const data = await panelDataOf(item);
  const wide = (item.kind === "block" && !item.narrow) || item.wide === true;
  // Named related items first, then the next ones in order, so the row always fills three tiles.
  const named = item.related.flatMap((slug) => ITEMS.filter((i) => i.slug === slug));
  const at = ITEMS.indexOf(item);
  // A basic's row takes the other basics first, then filters; a filter's row takes filters only.
  const after = [...ITEMS.slice(at + 1), ...ITEMS.slice(0, at)]
    .filter((i) => !named.includes(i) && (i.kind === "filter" || (item.kind === "basic" && i.kind === "basic")))
    .sort((a, b) => Number(b.kind === item.kind) - Number(a.kind === item.kind));
  const related = [...named, ...after].slice(0, 3);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-24 sm:px-8">
        <PageHead item={item} />
        <div
          className={
            wide
              ? "mt-8 flex flex-col gap-6"
              : "mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,58fr)_minmax(0,42fr)] lg:items-start"
          }
        >
          <div className={wide ? "" : "lg:self-stretch"}>
            {/* Examples title their cards at h3 or below; this keeps the outline in order under the page's h1. */}
            <h2 className="sr-only">Live example</h2>
            <FilterStage slug={item.slug} />
          </div>
          <CopyPanel
            data={data}
            wide={wide}
            className={
              wide ? "lg:max-h-[min(760px,calc(100dvh-112px))]" : "lg:sticky lg:top-[88px] lg:h-[min(580px,calc(100dvh-112px))]"
            }
          />
        </div>
        <div className="mt-20">
          <ItemDetails item={item} />
        </div>
        <ItemPager item={item} />
        {related.length > 0 && (
          <section aria-labelledby="more-heading" className="mt-12 border-t border-card pt-8">
            <h2 id="more-heading" className="mb-6 text-[20px] font-semibold leading-7 tracking-[-0.01em] text-text">
              {item.kind === "basic" ? "Related" : "More filters"}
            </h2>
            <TileGrid>
              {related.map((other) => (
                <ItemTile key={other.slug} item={other} />
              ))}
            </TileGrid>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
