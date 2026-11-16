import type { Metadata } from "next";
import { itemBySlug } from "@/registry/items";
import { ItemView } from "@/components/item/item-view";
import { itemPath } from "@/lib/site";

const item = itemBySlug("cars-board")!;

export const metadata: Metadata = { title: `${item.title} · FiltersUI`, description: item.description, alternates: { canonical: itemPath(item.slug) } };

export default function CarsSetPage() {
  return <ItemView item={item} />;
}
