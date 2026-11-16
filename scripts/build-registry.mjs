// Writes public/r/<slug>.json for every item and public/r/registry.json, in the shadcn registry format.
// Runs in prebuild, so the JSON always matches the sources. public/r is generated and git-ignored.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ITEMS } from "../registry/items.ts";
import { getItemFiles } from "../lib/registry-files.ts";
import { registryJsonUrl, site } from "../lib/site.ts";

const OUT = join(process.cwd(), "public", "r");
const ITEM_SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";
// REGISTRY_BASE_URL=http://localhost:3000 points registryDependencies at a preview or local server instead of filtersui.com.
const BASE = process.env.REGISTRY_BASE_URL?.replace(/\/+$/, "");
const dependencyUrl = (slug) => (BASE ? `${BASE}/r/${slug}.json` : registryJsonUrl(slug));

const FILE_TYPE = {
  filter: "registry:component",
  block: "registry:block",
  ui: "registry:ui",
  lib: "registry:lib",
  demo: "registry:lib",
};

// Files land where getItemFiles saves them, under the project's components alias, so relative imports keep working.
const target = (savePath) => savePath.replace(/^components\//, "@components/");

function itemJson(item) {
  const { files, dependencies, requires } = getItemFiles(item);
  // A file another required item already ships comes in through that item.
  const elsewhere = new Set(
    requires.flatMap((slug) => getItemFiles(ITEMS.find((other) => other.slug === slug)).files.map((file) => file.path)),
  );
  const own = files.filter((file) => !elsewhere.has(file.path));
  return {
    $schema: ITEM_SCHEMA,
    name: item.slug,
    type: item.kind === "block" ? "registry:block" : item.kind === "basic" ? "registry:ui" : "registry:component",
    title: item.title,
    description: item.description,
    author: `${site.author.name} <${site.author.url}>`,
    dependencies,
    ...(requires.length ? { registryDependencies: requires.map(dependencyUrl) } : {}),
    files: own.map((file) => ({
      path: file.path,
      type: FILE_TYPE[file.kind],
      target: target(file.savePath),
      content: file.source,
    })),
    meta: { addedIn: item.addedIn, updatedIn: item.updatedIn },
  };
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const items = ITEMS.map(itemJson);
for (const json of items) writeFileSync(join(OUT, `${json.name}.json`), `${JSON.stringify(json, null, 2)}\n`);

const registry = {
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "filtersui",
  homepage: site.url,
  items: items.map(({ $schema, ...item }) => ({ ...item, files: item.files.map(({ content, ...file }) => file) })),
};
writeFileSync(join(OUT, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`);

console.log(`registry:build: wrote ${items.length} items and registry.json to public/r`);
