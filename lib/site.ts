export const site = {
  name: "FiltersUI",
  url: "https://filtersui.com",
  /** Until launch the repo is private: nothing links to it while this is false. */
  isPublic: false,
  repoUrl: "https://github.com/eugenesanu/filters-ui",
  author: { name: "Eugen Eşanu", url: "https://eugenesanu.com" },
} as const;

/** Where the generated shadcn registry JSON is served. */
export const registryJsonUrl = (slug: string) => `${site.url}/r/${slug}.json`;

/** Blocks live under /sets; everything else under /filters. */
const SET_PATHS: Record<string, string> = { "cars-board": "/sets/cars" };

/** The page that shows one item. */
export const itemPath = (slug: string) => SET_PATHS[slug] ?? `/filters/${slug}`;
export const itemUrl = (slug: string) => `${site.url}${itemPath(slug)}`;
