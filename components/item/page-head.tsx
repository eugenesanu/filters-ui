import Link from "next/link";
import type { RegistryItem } from "@/registry/items";
import { ITEMS } from "@/registry/items";
import { itemPath } from "@/lib/site";
import { LinkArrow, linkClasses } from "@/registry/ui/link";

const QUIET_LINK = linkClasses({ variant: "quiet", tone: "dim" });

export function PageHead({ item }: { item: RegistryItem }) {
  const at = ITEMS.findIndex((i) => i.slug === item.slug);
  const previous = ITEMS[at - 1];
  const next = ITEMS[at + 1];

  return (
    <div className="pt-5 sm:pt-6">
      <div className="flex items-center justify-between gap-4">
        <Link href={item.kind === "basic" ? "/#basics" : "/#filters"} className={`${QUIET_LINK} -ms-1 pe-2`}>
          <LinkArrow direction="back" />
          {item.kind === "basic" ? "Basics" : "Filters"}
        </Link>
        {(previous || next) && (
          <nav aria-label="Previous and next" className="flex items-center gap-6 max-lg:hidden">
            {previous && (
              <Link href={itemPath(previous.slug)} className={QUIET_LINK}>
                <LinkArrow direction="back" />
                {previous.title}
              </Link>
            )}
            {next && (
              <Link href={itemPath(next.slug)} className={QUIET_LINK}>
                {next.title}
                <LinkArrow />
              </Link>
            )}
          </nav>
        )}
      </div>
      <h1 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-text sm:text-[40px]">{item.title}</h1>
      <p className="mt-3 max-w-[760px] text-[16px] leading-[1.55] text-pretty text-mute sm:text-[17px]">{item.description}</p>
      <p className="mt-2 text-[13px] leading-5 text-dim">Added in v{item.addedIn}</p>
    </div>
  );
}
