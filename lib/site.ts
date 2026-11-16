import { ITEMS } from "../registry/items.ts";

export const site = {
  name: "FiltersUI",
  url: "https://filtersui.com",
  /** The header's GitHub icon always links to the repo; true also shows the hero and footer GitHub links. */
  isPublic: false,
  repoUrl: "https://github.com/eugenesanu/filters-ui",
  author: { name: "Eugen Eşanu", url: "https://eugenesanu.com", github: "https://github.com/eugenesanu" },
} as const;

/** Where the generated shadcn registry JSON is served. */
export const registryJsonUrl = (slug: string) => `${site.url}/r/${slug}.json`;

/** Blocks live under /sets, basics under /basics, filters under /filters. */
const SET_PATHS: Record<string, string> = { "cars-board": "/sets/cars", "filter-panel": "/sets/filter-panel" };

/** The page that shows one item. */
export const itemPath = (slug: string) =>
  SET_PATHS[slug] ?? `${ITEMS.find((item) => item.slug === slug)?.kind === "basic" ? "/basics" : "/filters"}/${slug}`;
export const itemUrl = (slug: string) => `${site.url}${itemPath(slug)}`;
