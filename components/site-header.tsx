import Link from "next/link";
import { HeaderFrame } from "@/components/header-frame";
import { Logo } from "@/components/logo";
import { site } from "@/lib/site";
import { version } from "@/lib/version";

export function SiteHeader() {
  return (
    <HeaderFrame>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Link href="/" aria-label="FiltersUI home" className="flex h-11 items-center rounded-[8px]">
            <Logo className="block h-7 w-auto" />
          </Link>
          <span className="rounded-full bg-surface-3 px-2 max-[400px]:hidden py-0.5 text-[12px] font-medium leading-[18px] text-mute">
            v{version}
          </span>
        </div>
        <nav aria-label="Site" className="flex items-center gap-4 sm:gap-5">
          <Link
            href="/#filters"
            className="inline-flex h-11 items-center whitespace-nowrap rounded-[4px] text-[14px] text-mute transition-[color] duration-200 ease-smooth hover:text-text"
          >
            Filters
          </Link>
          {/* About goes here once its page exists. */}
          {site.isPublic && (
            <a
              href={site.repoUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex h-11 items-center whitespace-nowrap rounded-[4px] text-[14px] text-dim transition-[color] duration-200 ease-smooth hover:text-text"
            >
              GitHub
            </a>
          )}
          <a
            href="https://eugenesanu.com"
            target="_blank"
            rel="noopener"
            className="inline-flex h-11 items-center whitespace-nowrap rounded-[4px] text-[14px] text-dim transition-[color] duration-200 ease-smooth hover:text-text"
          >
            By Eugen Eşanu
          </a>
        </nav>
      </div>
    </HeaderFrame>
  );
}
