import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://filtersui.com"),
  title: "FiltersUI",
  alternates: { canonical: "/" },
  description:
    "Free, open-source filter cards for search pages, ready to copy as code or as a prompt.",
  // remove at launch
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={outfit.variable} data-scroll-behavior="smooth">
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
