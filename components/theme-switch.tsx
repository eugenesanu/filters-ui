"use client";

import { useEffect } from "react";
import { THEME_COLOR, THEME_SCRIPT, THEME_STORAGE_KEY } from "@/lib/theme";

type Theme = "light" | "dark";

/** The <head> script that sets a stored theme before first paint. Typed text/plain on the client, so React does not
 * warn about rendering a script; the server's copy is the one that runs. */
export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}

const currentTheme = (): Theme => {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

// Icons and words both follow data-theme through CSS in app/globals.css, so the server's HTML is right before
// hydration and with JavaScript off. The icon shown is the theme a press leads to.
const ICON =
  "absolute inset-0 m-auto size-5 transition-[opacity,scale,rotate] duration-300 ease-smooth motion-reduce:transition-[opacity]";

// With a stored choice, the browser bar takes that theme's colour instead of the system's.
const paintBrowserBar = (theme: Theme) => {
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = THEME_COLOR[theme];
};

export function ThemeSwitch() {
  useEffect(() => {
    const set = document.documentElement.getAttribute("data-theme");
    if (set === "light" || set === "dark") paintBrowserBar(set);
  }, []);

  const flip = () => {
    const root = document.documentElement;
    const next: Theme = currentTheme() === "light" ? "dark" : "light";
    // One frame with transitions off, so every colour on the page changes at once; only the icon eases.
    root.setAttribute("data-theme-switching", "");
    root.setAttribute("data-theme", next);
    paintBrowserBar(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
    requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute("data-theme-switching")));
  };

  return (
    <button
      type="button"
      data-theme-switch
      onClick={flip}
      className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-[10px] text-mute transition-[color,scale] duration-200 ease-smooth hover:text-text active:scale-[0.92] motion-reduce:transition-[color]"
    >
      <span data-theme-say="dark" className="sr-only">
        Switch to light theme
      </span>
      <span data-theme-say="light" className="sr-only">
        Switch to dark theme
      </span>
      <svg data-theme-show="dark" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true" className={ICON}>
        <circle cx="10" cy="10" r="3.4" />
        <path d="M10 2.6v1.6M10 15.8v1.6M2.6 10h1.6M15.8 10h1.6M4.8 4.8l1.1 1.1M14.1 14.1l1.1 1.1M4.8 15.2l1.1-1.1M14.1 5.9l1.1-1.1" />
      </svg>
      <svg data-theme-show="light" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" aria-hidden="true" className={ICON}>
        <path d="M16.4 12.2A6.6 6.6 0 0 1 7.8 3.6a6.6 6.6 0 1 0 8.6 8.6Z" />
      </svg>
    </button>
  );
}
