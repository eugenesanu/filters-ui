import type { Metadata } from "next";
import type { RegistryItem } from "../registry/items.ts";
import { itemPath, itemUrl, site } from "./site.ts";
import { version } from "./version.ts";

/**
 * Search words for every page: a headline for the title and a lead for the description, per item. The description is
 * the lead plus one shared tail, 140 to 160 characters in all. An item with no entry falls back to its own title and
 * description, so a new item still gets a page head; give it an entry here when it lands.
 */
const ITEM_SEO: Record<string, { headline: string; lead: string }> = {
  "icon-tiles": {
    headline: "Icon tiles filter",
    lead: "Icon tiles: pick one or more types by icon, each with a count.",
  },
  "color-swatches": {
    headline: "Colour swatches filter",
    lead: "Colour swatches: pick one or more colours, each with a count.",
  },
  "searchable-list": {
    headline: "Searchable checkbox list filter",
    lead: "Searchable list: tick makes and models, or any items and sub-items.",
  },
  "sentence-search": {
    headline: "Sentence search filter",
    lead: "Sentence search: type \u201cblue suv under 30k\u201d and get filters.",
  },
  "range-histogram": {
    headline: "Price range slider with histogram",
    lead: "Price range slider on a histogram, with two handles and fields.",
  },
  "chip-group": {
    headline: "Filter chips with counts",
    lead: "Filter chips: turn on one or more options, each with a count.",
  },
  "range-select": {
    headline: "Year range slider",
    lead: "Year range slider: pick a range of set values on a bar chart.",
  },
  "upper-limit": {
    headline: "Upper limit slider",
    lead: "Upper limit slider: set a top value, such as kilometres driven.",
  },
  "segmented-choice": {
    headline: "Segmented choice filter",
    lead: "Segmented control: pick one option or Any, with a count on each.",
  },
  "date-range": {
    headline: "Date range picker",
    lead: "Date range picker: first and last day on a calendar, or a preset.",
  },
  "cascading-dropdown": {
    headline: "Cascading dropdown filter",
    lead: "Cascading dropdown: two linked selects, such as make then model.",
  },
  "bar-list": {
    headline: "Bar list filter",
    lead: "Bar list filter: tick options, with a soft bar behind each count.",
  },
  budget: {
    headline: "Budget and monthly payment filter",
    lead: "Budget filter: a total price, or a monthly payment as a top price.",
  },
  "applied-filters": {
    headline: "Applied filter chips",
    lead: "Applied filters as removable chips, with Clear all at the end.",
  },
  "no-results": {
    headline: "No results state with suggestions",
    lead: "No results state: suggests the smallest changes that find results.",
  },
  "recent-searches": {
    headline: "Recent and saved searches",
    lead: "Recent and saved searches under the search box, with their counts.",
  },
  rules: {
    headline: "Rule builder filter",
    lead: "Rule builder: field, condition and value rows joined by And or Or.",
  },
  "filter-pills": {
    headline: "Filter pills with panels",
    lead: "Filter pills: each pill opens its filter in a panel below it.",
  },
  "all-filters": {
    headline: "All filters panel",
    lead: "All filters panel: a list, with the picked filter open beside it.",
  },
  dropdown: {
    headline: "Dropdown menu",
    lead: "Dropdown menu behind a small pill, such as Sort by Newest.",
  },
  select: {
    headline: "Select field",
    lead: "Select field that opens a list to pick one value, with counts.",
  },
  buttons: {
    headline: "Buttons and links",
    lead: "Buttons in five looks and three sizes, a busy state, and links.",
  },
  "cars-board": {
    headline: "Search filters board",
    lead: "A full board of search filters, with Clear all and a Show button.",
  },
  "filter-panel": {
    headline: "Filter panel sidebar",
    lead: "Filter panel: every filter as rows that open and close.",
  },
};

const TAIL = "Free, MIT: copy-paste React + Tailwind or an AI prompt for Claude Code, Cursor, v0, Lovable.";

export const HOME_SEO = {
  title: "FiltersUI: free filter components for React and Tailwind",
  description:
    "Free, MIT filter components for search pages: price range, chips, dates and more. Copy-paste React + Tailwind or a prompt for Claude Code, Cursor, v0, Lovable.",
};

export const ABOUT_SEO = {
  title: `About ${site.author.name} · ${site.name}`,
  heading: site.author.name,
  role: "Product designer and design engineer",
  summary: `${site.name}: free, open-source filters for search pages, with code and prompts to copy.`,
  description: `${site.author.name}, product designer and design engineer, made ${site.name}: free, MIT-licensed filter components for React and Tailwind, with prompts for AI tools.`,
};

export const KIND_LABEL: Record<RegistryItem["kind"], string> = { filter: "Filter", basic: "Basic", block: "Block" };

export function itemSeo(item: RegistryItem) {
  const own = ITEM_SEO[item.slug];
  const headline = own?.headline ?? item.title;
  return {
    title: `${headline} for React · ${site.name}`,
    socialTitle: `${headline} for React`,
    description: `${own?.lead ?? item.description} ${TAIL}`,
  };
}

/** Title, description, canonical URL and the social cards' words. The image comes from the route's opengraph-image. */
export function pageMetadata({ title, socialTitle = title, description, path }: { title: string; socialTitle?: string; description: string; path: string }): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: site.name, locale: "en_US", url: path, title: socialTitle, description },
    twitter: { card: "summary_large_image", title: socialTitle, description },
  };
}

export const itemMetadata = (item: RegistryItem): Metadata => {
  const seo = itemSeo(item);
  return pageMetadata({ title: seo.title, socialTitle: seo.socialTitle, description: seo.description, path: itemPath(item.slug) });
};

const AUTHOR_ID = `${site.url}/#author`;
const LIBRARY_ID = `${site.url}/#library`;
const LICENSE = "https://opensource.org/licenses/MIT";

const author = {
  "@type": "Person",
  "@id": AUTHOR_ID,
  name: site.author.name,
  url: site.author.url,
  sameAs: [site.author.github],
};

export function homeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        description: HOME_SEO.description,
        inLanguage: "en",
        author: { "@id": AUTHOR_ID },
      },
      author,
      {
        "@type": "SoftwareSourceCode",
        "@id": LIBRARY_ID,
        name: site.name,
        description: HOME_SEO.description,
        url: site.url,
        codeRepository: site.repoUrl,
        programmingLanguage: ["TypeScript", "React"],
        runtimePlatform: "React 19, Tailwind CSS 4",
        license: LICENSE,
        version,
        isAccessibleForFree: true,
        author: { "@id": AUTHOR_ID },
      },
    ],
  };
}

export function aboutJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${site.url}/about`,
    name: ABOUT_SEO.title,
    description: ABOUT_SEO.description,
    mainEntity: { ...author, jobTitle: ABOUT_SEO.role },
  };
}

const SECTION: Record<RegistryItem["kind"], { name: string; path: string }> = {
  filter: { name: "Filters", path: "/#filters" },
  basic: { name: "Basics", path: "/#basics" },
  block: { name: "Filters", path: "/#filters" },
};

export function itemJsonLd(item: RegistryItem) {
  const seo = itemSeo(item);
  const url = itemUrl(item.slug);
  const section = SECTION[item.kind];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareSourceCode",
        name: `${item.title} · ${site.name}`,
        description: seo.description,
        url,
        codeRepository: site.repoUrl,
        programmingLanguage: ["TypeScript", "React"],
        runtimePlatform: "React 19, Tailwind CSS 4",
        license: LICENSE,
        version: item.updatedIn,
        isAccessibleForFree: true,
        isPartOf: { "@type": "SoftwareSourceCode", "@id": LIBRARY_ID, name: site.name, url: site.url },
        author,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: site.name, item: site.url },
          { "@type": "ListItem", position: 2, name: section.name, item: `${site.url}${section.path}` },
          { "@type": "ListItem", position: 3, name: item.title, item: url },
        ],
      },
    ],
  };
}
