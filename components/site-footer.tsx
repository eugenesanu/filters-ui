import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-card">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-6 text-[13px] text-dim max-[360px]:flex-wrap max-[360px]:gap-y-2 sm:px-8">
        <span className="flex items-center gap-4 whitespace-nowrap">
          MIT licence
          {site.isPublic && (
            <a
              href={site.repoUrl}
              target="_blank"
              rel="noopener"
              className="rounded-[4px] text-mute transition-[color] duration-200 ease-smooth hover:text-text"
            >
              GitHub
            </a>
          )}
        </span>
        <span className="whitespace-nowrap">
          Designed and built by{" "}
          <a
            href={site.author.url}
            target="_blank"
            rel="noopener"
            className="rounded-[4px] text-mute underline decoration-control-border decoration-1 underline-offset-[3px] transition-[color,text-decoration-color] duration-200 ease-smooth hover:text-text hover:decoration-current"
          >
            {site.author.name}
          </a>
        </span>
      </div>
    </footer>
  );
}
