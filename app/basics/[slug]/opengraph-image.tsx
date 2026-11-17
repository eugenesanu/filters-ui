import { itemImage } from "@/components/og/og-image";
import { ITEMS } from "@/registry/items";

export const alt = "A FiltersUI basic control: its name, what it does, and a drawing of it.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamicParams = false;

export function generateStaticParams() {
  return ITEMS.filter((item) => item.kind === "basic").map((item) => ({ slug: item.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return itemImage((await params).slug);
}
