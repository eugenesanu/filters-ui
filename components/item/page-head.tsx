import Link from "next/link";
import type { RegistryItem } from "@/registry/items";
import { ITEMS } from "@/registry/items";
import { itemPath } from "@/lib/site";
import { LinkArrow, linkClasses } from "@/registry/ui/link";

const QUIET_LINK = linkClasses({ variant: "quiet", tone: "dim" });

const isBasic = (item: RegistryItem) => item.kind === "basic";

export function PageHead({ item }: { item: RegistryItem }) {
  return (
    <div className="pt-5 sm:pt-6">
      <Link href={isBasic(item) ? "/#basics" : "/#filters"} className={`${QUIET_LINK} -ms-1 pe-2`}>
        <LinkArrow direction="back" />
        {isBasic(item) ? "Basics" : "Filters"}
      </Link>
      <h1 className="mt-4 text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-text sm:text-[40px]">{item.title}</h1>
      <p className="mt-3 max-w-[760px] text-[16px] leading-[1.55] text-pretty text-mute sm:text-[17px]">{item.description}</p>
    </div>
  );
}

// The words turn the link blue with the card; the arrow sits 1px low, on the middle of the lowercase letters.
const PAGER_TITLE =
  "flex min-w-0 items-center gap-1.5 text-[16px] font-medium leading-6 text-text transition-[color] duration-200 ease-smooth group-hover/link:text-accent-soft motion-reduce:transition-none";
const PAGER_ARROW = "size-[18px] translate-y-px";

const PAGER_CARD =
  "group/link flex min-w-0 flex-col gap-1 rounded-[20px] border border-card bg-panel px-5 py-4 outline-none transition-[background-color,border-color,scale] duration-200 ease-smooth hover:border-surface-3 hover:bg-page active:scale-[0.99] active:duration-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-solid focus-visible:outline-accent-soft motion-reduce:transition-none";

/** The items before and after this one in its own section (basics, or filters and blocks), at the end of the page. */
export function ItemPager({ item }: { item: RegistryItem }) {
  const section = ITEMS.filter((other) => isBasic(other) === isBasic(item));
  const at = section.indexOf(item);
  const previous = section[at - 1];
  const next = section[at + 1];
  if (!previous && !next) return null;
  return (
    <nav aria-label="Previous and next" className="mt-16 grid grid-cols-2 gap-3 sm:gap-4">
      {previous ? (
        <Link href={itemPath(previous.slug)} className={PAGER_CARD}>
          <span className="text-[13px] leading-5 text-dim">Previous</span>{" "}
          <span className={PAGER_TITLE}>
            <LinkArrow direction="back" className={`${PAGER_ARROW} -ms-1.5`} />
            <span className="truncate">{previous.title}</span>
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={itemPath(next.slug)} className={`${PAGER_CARD} items-end text-end`}>
          <span className="text-[13px] leading-5 text-dim">Next</span>{" "}
          <span className={PAGER_TITLE}>
            <span className="truncate">{next.title}</span>
            <LinkArrow className={`${PAGER_ARROW} -me-1.5`} />
          </span>
        </Link>
      )}
    </nav>
  );
}
