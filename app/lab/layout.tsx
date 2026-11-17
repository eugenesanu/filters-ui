import type { Metadata } from "next";

// Lab pages make stills for the lead; search engines never index them, and the sitemap leaves them out.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
