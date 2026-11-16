import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-20 sm:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[min(1100px,140vw)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(143,170,255,0.06),transparent)]"
        />
        <div className="relative flex max-w-[960px] flex-col items-center text-center">
          <span className="rounded-full bg-surface-3 px-3 py-1 text-[13px] font-medium leading-5 text-mute">
            Coming soon
          </span>
          <h1 className="mt-7 text-[clamp(44px,7.5vw,88px)] font-semibold leading-[1.02] tracking-[-0.03em] text-balance text-text">
            Filters, ready to use.
          </h1>
          <p className="mt-6 max-w-[560px] text-[18px] leading-[1.5] text-balance text-mute sm:text-[20px]">
            Free filter cards for search pages. Try one, then copy the code or a prompt for your AI tool.
          </p>
        </div>
      </main>
      <footer className="border-t border-card">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-6 text-[13px] text-dim sm:px-8">
          <span className="whitespace-nowrap">MIT licence</span>
          <span className="whitespace-nowrap">
            Designed and built by{" "}
            <a
              href="https://eugenesanu.com"
              target="_blank"
              rel="noopener"
              className="rounded-[4px] text-mute transition-[color] duration-200 ease-smooth hover:text-text"
            >
              Eugen Eşanu
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
