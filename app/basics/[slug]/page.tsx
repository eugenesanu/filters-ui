import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ITEMS, itemBySlug } from "@/registry/items";
import { ItemView } from "@/components/item/item-view";
import { itemPath } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return ITEMS.filter((item) => item.kind === "basic").map((item) => ({ slug: item.slug }));
}

export async function generateMetadata(props: PageProps<"/basics/[slug]">): Promise<Metadata> {
  const item = itemBySlug((await props.params).slug);
  return item ? { title: `${item.title} · FiltersUI`, description: item.description, alternates: { canonical: itemPath(item.slug) } } : {};
}

export default async function BasicPage(props: PageProps<"/basics/[slug]">) {
  const item = itemBySlug((await props.params).slug);
  if (!item || item.kind !== "basic") notFound();
  return <ItemView item={item} />;
}
