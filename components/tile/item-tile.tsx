import Link from "next/link";
import type { ReactNode } from "react";
import type { RegistryItem } from "@/registry/items";
import { itemPath } from "@/lib/site";
import { cn } from "@/registry/lib/cn";
import { BoardPreview, TilePreview } from "@/components/tile/previews";

const FIRST_RELEASE = [1, 0, 0];

/** True for an item added after the first release. */
function isNew(item: RegistryItem) {
  const parts = item.addedIn.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (parts[i] !== FIRST_RELEASE[i]) return parts[i] > FIRST_RELEASE[i];
  return false;
}

// The link's ::after covers the whole tile, so the tile is one target while the preview stays outside the link.
function Tile({ item, heading: Heading, stageClassName, children }: {
  item: RegistryItem;
  heading: "h2" | "h3";
  stageClassName: string;
  children: ReactNode;
}) {
  return (
    <div className="group/tile relative rounded-[28px] has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-solid has-[a:focus-visible]:outline-accent-soft">
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-[24px] border border-card bg-panel transition-[border-color] duration-300 ease-smooth group-hover/tile:border-surface-3",
          stageClassName,
        )}
      >
        {/* On hover a ring of colour fades in and turns slowly behind a blurred plate, so it only glows in from the rim. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-20 aspect-square w-[max(160%,480px)] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(#4C6BFF,#8A6CFF,#E56FB0,#F59E6C,#2DD4BF,#4C6BFF)] opacity-0 transition-[opacity,rotate] duration-[700ms,2400ms] ease-smooth group-hover/tile:rotate-[120deg] group-hover/tile:opacity-[0.36] motion-reduce:transition-[opacity] motion-reduce:group-hover/tile:rotate-0"
        />
        <span aria-hidden className="pointer-events-none absolute inset-[3px] -z-10 rounded-[inherit] bg-panel blur-[14px]" />
        <div
          inert
          aria-hidden
          className="pointer-events-none absolute inset-0 select-none [mask-image:linear-gradient(to_bottom,#000_calc(100%-72px),transparent_calc(100%-6px))]"
        >
          {children}
        </div>
      </div>
      <div className="flex h-12 items-center justify-between gap-3 pt-1">
        <Heading className="min-w-0 truncate text-[15px] font-semibold leading-5 text-text transition-[color] duration-200 ease-smooth group-hover/tile:text-accent-soft">
          <Link
            href={itemPath(item.slug)}
            className="outline-none after:absolute after:inset-0 after:rounded-[24px] after:content-['']"
          >
            {item.title}
          </Link>
        </Heading>
        {isNew(item) && (
          <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[12px] font-medium leading-[18px] text-mute">New</span>
        )}
      </div>
    </div>
  );
}

/** One filter: its real card in a set state, inert, over its title. The whole tile opens the filter's page. */
export function ItemTile({ item, heading = "h3" }: { item: RegistryItem; heading?: "h2" | "h3" }) {
  return (
    <Tile item={item} heading={heading} stageClassName="aspect-[4/3] [container-type:inline-size]">
      {/* Every card starts on the same top line; a tall one fades out at the bottom. */}
      <div className="flex h-full flex-col items-center px-8 pt-8">
        {/* Natural size; zoomed down only where the stage is narrower than the card. */}
        <div className="w-[320px] shrink-0 [zoom:min(1,tan(atan2(100cqw-64px,320px)))]">
          <TilePreview slug={item.slug} />
        </div>
      </div>
    </Tile>
  );
}

/** The whole board as one wide tile, scaled down to fit narrow screens and cropped as a peek. */
export function BoardTile({ item }: { item: RegistryItem }) {
  return (
    <Tile item={item} heading="h2" stageClassName="h-[clamp(300px,42vw,500px)] [container-type:inline-size]">
      <div className="absolute left-1/2 top-[clamp(20px,4cqw,44px)] origin-top -translate-x-1/2 [scale:min(1,tan(atan2(100cqw-40px,929px)))]">
        <div>
          <BoardPreview />
        </div>
      </div>
    </Tile>
  );
}

/** Three columns from 1100px, two from 700px, one below. */
export function TileGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-6 min-[700px]:grid-cols-2 min-[1100px]:grid-cols-3", className)}>{children}</div>;
}
