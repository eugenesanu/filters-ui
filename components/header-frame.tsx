"use client";

import { useEffect, useState, type ReactNode } from "react";

/** The sticky header: clear at the top, a blurred page colour and its hairline once the page scrolls. */
export function HeaderFrame({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 4);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-40 border-b border-transparent transition-[background-color,border-color] duration-300 ease-smooth data-[scrolled]:border-card data-[scrolled]:bg-[#0A0A0A]/90 data-[scrolled]:backdrop-blur-xl"
    >
      {children}
    </header>
  );
}
