import type { Metadata } from "next";
import { itemBySlug } from "@/registry/items";
import { ItemView } from "@/components/item/item-view";
import { itemMetadata } from "@/lib/seo";

const item = itemBySlug("cars-board")!;

export const metadata: Metadata = itemMetadata(item);

export default function CarsSetPage() {
  return <ItemView item={item} />;
}
