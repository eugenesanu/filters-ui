import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/theme-switch";
import { HOME_SEO } from "@/lib/seo";
import { site } from "@/lib/site";
import { THEME_COLOR } from "@/lib/theme";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: HOME_SEO.title,
  description: HOME_SEO.description,
  openGraph: { type: "website", siteName: site.name, locale: "en_US", title: HOME_SEO.title, description: HOME_SEO.description },
  twitter: { card: "summary_large_image" },
  applicationName: site.name,
  authors: [{ name: site.author.name, url: site.author.url }],
  creator: site.author.name,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={outfit.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
