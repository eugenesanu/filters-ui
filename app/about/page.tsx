import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { GitHubMark, SiteHeader } from "@/components/site-header";
import { site } from "@/lib/site";
import { buttonClasses } from "@/registry/ui/button-classes";

export const metadata: Metadata = {
  title: "About · FiltersUI",
  description: "FiltersUI is made by Eugen Eşanu, a product designer and design engineer.",
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-24 sm:px-8 sm:pb-28">
        <section className="max-w-[640px] pt-14 sm:pt-16">
          <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-text sm:text-[40px]">
            {site.author.name}
          </h1>
          <p className="mt-3 text-[16px] leading-[1.55] text-mute sm:text-[17px]">
            Product designer and design engineer
          </p>

          <div className="mt-10 space-y-5 text-[16px] leading-[1.65] text-pretty text-mute sm:text-[17px]">
            <p className="text-text">
              I lead concepts from 0 to 1. I design web products, write the code that ships them, and study how
              customers use them.
            </p>
            <p>
              For 12+ years I’ve designed and shipped products, since 2020 mostly with US startups: 47 shipped, 3
              acquired (Clearbit by HubSpot, Qualibrate by Copado, and AlphaUX). I led design for the last five years,
              Apollo.io among them.
              The products I’ve designed have reached over 2 million users.
            </p>
            <p>
              I start with the problem, not the screen, and put the most care into the parts nobody puts in a
              portfolio: the empty table, the failed payment, the step that isn’t set up yet.
            </p>
            <p>
              FiltersUI grew out of the filters I designed for a car search concept. I rebuilt them as a free,
              open-source library, and more will follow.
            </p>
            <p>I work across US and European time zones and I’m open to full-time roles and long contracts.</p>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              href={site.author.url}
              target="_blank"
              rel="noopener"
              className={buttonClasses({ size: "lg" })}
            >
              Visit eugenesanu.com
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a
              href={`${site.author.url}/contact/`}
              target="_blank"
              rel="noopener"
              className={buttonClasses({ variant: "secondary", size: "lg" })}
            >
              Get in touch
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a
              href={site.author.github}
              target="_blank"
              rel="noopener"
              className={buttonClasses({ variant: "secondary", size: "lg", before: true })}
            >
              <GitHubMark className="size-5" />
              GitHub
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
