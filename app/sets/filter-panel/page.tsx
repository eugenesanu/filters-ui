import type { Metadata } from "next";
import { itemBySlug } from "@/registry/items";
import { ItemView } from "@/components/item/item-view";
import { itemMetadata } from "@/lib/seo";

const item = itemBySlug("filter-panel")!;

export const metadata: Metadata = itemMetadata(item);

export default function FilterPanelPage() {
  return <ItemView item={item} />;
}
