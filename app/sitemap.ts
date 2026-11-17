import type { MetadataRoute } from "next";
import { itemUrl, site } from "@/lib/site";
import { ITEMS } from "@/registry/items";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, changeFrequency: "weekly", priority: 1 },
    ...ITEMS.map((item) => ({ url: itemUrl(item.slug), changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${site.url}/about`, changeFrequency: "yearly", priority: 0.4 },
  ];
}
