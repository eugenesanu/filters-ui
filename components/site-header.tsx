import Link from "next/link";
import { Logo } from "@/components/logo";
import { version } from "@/lib/version";

export function SiteHeader() {
  return (
    <header className="border-b border-card">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <Link href="/" aria-label="FiltersUI home" className="rounded-[8px]">
            <Logo className="block h-7 w-auto" />
          </Link>
          <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[12px] font-medium leading-[18px] text-mute">
            v{version}
          </span>
        </div>
        <a
          href="https://eugenesanu.com"
          target="_blank"
          rel="noopener"
          className="whitespace-nowrap rounded-[4px] text-[14px] text-dim transition-[color] duration-200 ease-smooth hover:text-text"
        >
          By Eugen Eşanu
        </a>
      </div>
    </header>
  );
}
