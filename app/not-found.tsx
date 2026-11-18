import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import { SEARCH_ART } from "@/registry/ui/art-search";

export const metadata: Metadata = { title: `Page not found · ${site.name}` };

// Next sends this with every page, so it stays a Server Component. It looks like the filters' empty states.
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center sm:px-8">
        <img src={SEARCH_ART} alt="" width={56} height={56} draggable={false} className="mb-3 size-14 select-none" />
        <h1 className="text-[15px] font-medium leading-5 text-text">No page at this address</h1>
        <Link
          href="/#filters"
          className="relative mt-2 rounded-[6px] text-[14px] font-medium leading-5 text-accent-soft outline-none transition-[color] duration-200 ease-smooth before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] hover:text-accent-pale focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-accent-soft active:opacity-80 motion-reduce:transition-none"
        >
          See the filters
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
