// Server only (reads the registry sources from disk). Used by pages at build time and by scripts/build-registry.mjs.
// Imports carry .ts extensions so Node can run this file directly.
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, posix, relative, resolve } from "node:path";
import { ITEMS, type RegistryItem } from "../registry/items.ts";

// npm scripts and next build both run from the repo root.
// Read only at build time; turbopackIgnore keeps the bundler from tracing the whole repo into server output.
const ROOT = resolve(/*turbopackIgnore: true*/ process.cwd());
/** Where a visitor saves the files, from their project root. Relative imports between them keep working there. */
export const INSTALL_DIR = "components/filters-ui";
/** The import alias for INSTALL_DIR in a project whose @/ points at its root. */
export const INSTALL_ALIAS = "@/components/filters-ui";

/** Imported but never installed: the host app already has them. */
const PEERS = new Set(["react", "react-dom"]);
/** Dependencies of the site itself, never of a registry file. */
const SITE_ONLY = new Set(["next", "shiki"]);
const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];
/** Demo files a filter's example may ship: drawings that import nothing from the registry, never data. */
export const EXAMPLE_ASSETS = new Set(["registry/demo/body-icons.tsx"]);

export type RegistryFileKind = "ui" | "filter" | "block" | "lib" | "demo";

export type RegistryFile = {
  /** From the repo root, e.g. "registry/ui/filter-card.tsx". */
  path: string;
  /** From the visitor's project root, e.g. "components/filters-ui/ui/filter-card.tsx". */
  savePath: string;
  kind: RegistryFileKind;
  /** The source with relative imports pointing at the other files' save paths. */
  source: string;
};

export type ItemFiles = {
  /** Entry first, then its imports depth first, then whatever the example also needs (the card), deduplicated. */
  files: RegistryFile[];
  /** npm packages the files import, sorted. React is assumed. */
  dependencies: string[];
  /** Other items whose entry file is among `files`, e.g. upper-limit needs range-histogram. */
  requires: string[];
};

const posixPath = (path: string) => path.split("\\").join("/");
const fromRoot = (absolute: string) => posixPath(relative(ROOT, absolute));

const sources = new Map<string, string>();
function read(path: string) {
  let text = sources.get(path);
  if (text === undefined) {
    text = readFileSync(join(/*turbopackIgnore: true*/ ROOT, path), "utf8");
    sources.set(path, text);
  }
  return text;
}

const IMPORT = /\b(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?["']([^"']+)["']/g;

/** Every module specifier a file imports or re-exports from. */
export function specifiersOf(source: string) {
  return [...source.matchAll(IMPORT)].map((m) => m[1]);
}

function kindOf(path: string): RegistryFileKind {
  const folder = path.split("/")[1];
  if (folder === "filters") return "filter";
  if (folder === "blocks") return "block";
  if (folder === "ui" || folder === "lib" || folder === "demo") return folder;
  throw new Error(`registry-files: ${path} is not in registry/ui, filters, blocks, lib or demo`);
}

function resolveRelative(from: string, specifier: string) {
  const base = join(/*turbopackIgnore: true*/ ROOT, dirname(from), specifier);
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (statSync(candidate, { throwIfNoEntry: false })?.isFile()) return fromRoot(candidate);
  }
  throw new Error(`registry-files: ${from} imports "${specifier}", which does not exist`);
}

type Edge = { specifier: string; target: string };

/** The relative imports of one registry file, resolved. Throws on anything outside registry/ or an unknown package. */
function edgesOf(path: string, packages: Set<string>, allowed: Set<string>): Edge[] {
  const edges: Edge[] = [];
  for (const specifier of specifiersOf(read(path))) {
    if (specifier.startsWith(".")) {
      const target = resolveRelative(path, specifier);
      if (!target.startsWith("registry/")) throw new Error(`registry-files: ${path} imports ${target}, outside registry/`);
      edges.push({ specifier, target });
    } else if (specifier.startsWith("@/") || specifier.startsWith("~/") || specifier.startsWith("next")) {
      throw new Error(`registry-files: ${path} imports "${specifier}"; registry files may import only registry/ and npm packages`);
    } else {
      const name = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
      if (PEERS.has(name)) continue;
      if (!allowed.has(name)) throw new Error(`registry-files: ${path} imports "${name}", which is not in package.json dependencies`);
      packages.add(name);
    }
  }
  return edges;
}

let allowedPackages: Set<string> | undefined;
function dependenciesAllowed() {
  if (!allowedPackages) {
    const pkg = JSON.parse(readFileSync(join(/*turbopackIgnore: true*/ ROOT, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
    allowedPackages = new Set(Object.keys(pkg.dependencies ?? {}).filter((name) => !SITE_ONLY.has(name)));
  }
  return allowedPackages;
}

export const savePathOf = (path: string) => `${INSTALL_DIR}/${path.replace(/^registry\//, "")}`;

function rewrite(path: string, edges: Edge[]) {
  const from = posix.dirname(savePathOf(path));
  let source = read(path);
  for (const { specifier, target } of edges) {
    let next = posix.relative(from, savePathOf(target)).replace(/\.tsx?$/, "");
    if (!next.startsWith(".")) next = `./${next}`;
    if (next !== specifier) source = source.replaceAll(`"${specifier}"`, `"${next}"`).replaceAll(`'${specifier}'`, `'${next}'`);
  }
  return source;
}

const cache = new Map<string, ItemFiles>();

/** Every file an item needs, in install order, with save paths and rewritten imports. Throws loudly on a broken rule. */
export function getItemFiles(item: RegistryItem): ItemFiles {
  const hit = cache.get(item.slug);
  if (hit) return hit;

  for (const path of [item.entry, item.example]) {
    if (!existsSync(join(/*turbopackIgnore: true*/ ROOT, path))) throw new Error(`registry-files: ${item.slug}: ${path} does not exist`);
  }

  const allowed = dependenciesAllowed();
  const packages = new Set<string>();
  const order: string[] = [];
  const edges = new Map<string, Edge[]>();

  const visit = (path: string) => {
    if (edges.has(path)) return;
    if (path.startsWith("registry/examples/")) throw new Error(`registry-files: ${item.slug} reaches the example ${path}`);
    kindOf(path);
    const own = edgesOf(path, packages, allowed);
    edges.set(path, own);
    order.push(path);
    for (const edge of own) visit(edge.target);
  };

  visit(item.entry);
  // The example's own imports (the card, other filters) ship too; the example itself does not.
  for (const edge of edgesOf(item.example, packages, allowed)) visit(edge.target);

  if (item.kind !== "block") {
    const demo = order.filter((path) => (kindOf(path) === "demo" && !EXAMPLE_ASSETS.has(path)) || kindOf(path) === "block");
    if (demo.length) throw new Error(`registry-files: the ${item.kind} ${item.slug} reaches ${demo.join(", ")}; only blocks may use demo data`);
  }

  const files = order.map((path) => ({ path, savePath: savePathOf(path), kind: kindOf(path), source: rewrite(path, edges.get(path)!) }));
  const requires = ITEMS.filter((other) => other.slug !== item.slug && order.includes(other.entry)).map((other) => other.slug);
  const result = { files, dependencies: [...packages].sort(), requires };
  cache.set(item.slug, result);
  return result;
}

/** The example's source as a visitor would write it: registry imports point at INSTALL_ALIAS. */
export function getExampleSource(item: RegistryItem, alias = INSTALL_ALIAS) {
  let source = read(item.example);
  for (const specifier of specifiersOf(source)) {
    if (!specifier.startsWith(".")) continue;
    const target = resolveRelative(item.example, specifier);
    const next = `${alias}/${target.replace(/^registry\//, "").replace(/\.tsx?$/, "")}`;
    source = source.replaceAll(`"${specifier}"`, `"${next}"`);
  }
  return source;
}

export type CssVariable = { name: string; fallback: string };

/**
 * Every --fu-* variable the sources read, with the fallback written beside it. Tailwind's underscores become spaces.
 * Throws when one variable has two different fallbacks.
 */
export function cssVariablesOf(sources: readonly string[]): CssVariable[] {
  const found = new Map<string, string>();
  for (const source of sources) {
    for (const { name, fallback } of varUses(source)) {
      if (fallback === null) continue;
      const value = fallback.replaceAll("_", " ").trim();
      const before = found.get(name);
      if (before !== undefined && before.toLowerCase() !== value.toLowerCase()) {
        throw new Error(`registry-files: ${name} falls back to both ${before} and ${value}`);
      }
      found.set(name, value);
    }
  }
  return [...found].map(([name, fallback]) => ({ name, fallback })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Each var(--fu-…) in a source and its fallback (null when it has none), reading nested brackets such as rgb(…). */
export function varUses(source: string): { name: string; fallback: string | null }[] {
  const uses: { name: string; fallback: string | null }[] = [];
  const start = /var\(\s*(--fu-[a-z0-9-]+)\s*(,|\))/gi;
  for (const match of source.matchAll(start)) {
    if (match[2] === ")") {
      uses.push({ name: match[1], fallback: null });
      continue;
    }
    let depth = 1;
    let i = match.index + match[0].length;
    const from = i;
    for (; i < source.length && depth > 0; i++) {
      if (source[i] === "(") depth++;
      else if (source[i] === ")") depth--;
    }
    uses.push({ name: match[1], fallback: source.slice(from, i - 1) });
  }
  return uses;
}

export const allItemFiles = () => ITEMS.map((item) => ({ item, ...getItemFiles(item) }));
