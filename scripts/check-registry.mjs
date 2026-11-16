// Checks the rules the registry relies on. Runs in prebuild; exits 1 with every problem listed.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ITEMS } from "../registry/items.ts";
import { cssVariablesOf, EXAMPLE_ASSETS, getItemFiles, specifiersOf, varUses } from "../lib/registry-files.ts";

const ROOT = process.cwd();
const problems = [];
const fail = (message) => problems.push(message);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [relative(ROOT, full).split("\\").join("/")];
  });
}

const registryFiles = walk(join(ROOT, "registry")).filter((path) => /\.(ts|tsx)$/.test(path));

// Items: unique slugs, entry and example files that exist, related slugs that exist, one example per item.
const slugs = new Set();
for (const item of ITEMS) {
  if (slugs.has(item.slug)) fail(`${item.slug}: slug used twice`);
  slugs.add(item.slug);
  if (!existsSync(join(ROOT, item.entry))) fail(`${item.slug}: entry ${item.entry} does not exist`);
  if (!existsSync(join(ROOT, item.example))) fail(`${item.slug}: example ${item.example} does not exist`);
  if (item.example !== `registry/examples/${item.slug}.tsx`) fail(`${item.slug}: example should be registry/examples/${item.slug}.tsx`);
  if (item.does.length < 3 || item.does.length > 5) fail(`${item.slug}: needs 3 to 5 "does" lines`);
  const source = existsSync(join(ROOT, item.entry)) ? readFileSync(join(ROOT, item.entry), "utf8") : "";
  if (!new RegExp(`export function ${item.component}\\b`).test(source)) fail(`${item.slug}: ${item.entry} does not export ${item.component}`);
}
for (const item of ITEMS) {
  for (const slug of item.related) if (!slugs.has(slug) || slug === item.slug) fail(`${item.slug}: related "${slug}" is not another item`);
}
for (const path of registryFiles.filter((p) => p.startsWith("registry/examples/"))) {
  if (!ITEMS.some((item) => item.example === path)) fail(`${path}: example with no item`);
}

// The site renders an example through a literal import in components/stage/example-of.ts, and the code panel
// rewrites only double-quoted relative imports in an example.
const exampleMap = readFileSync(join(ROOT, "components/stage/example-of.ts"), "utf8");
for (const item of ITEMS) {
  if (!exampleMap.includes(`import("@/registry/examples/${item.slug}")`)) fail(`${item.slug}: add it to components/stage/example-of.ts`);
  if (existsSync(join(ROOT, item.example)) && /\bfrom\s+'\./.test(readFileSync(join(ROOT, item.example), "utf8"))) {
    fail(`${item.example}: use double quotes for relative imports`);
  }
}

// A basic is a plain control from registry/ui with its own prompt text and its own tile preview.
const previews = readFileSync(join(ROOT, "components/tile/previews.tsx"), "utf8");
for (const item of ITEMS.filter((i) => i.kind === "basic")) {
  if (!item.entry.startsWith("registry/ui/")) fail(`${item.slug}: a basic's entry belongs in registry/ui`);
  if (!item.connect) fail(`${item.slug}: a basic needs its own connect text`);
  if (!previews.includes(`slug === "${item.slug}"`)) fail(`${item.slug}: add its tile preview to components/tile/previews.tsx`);
}

// Every item's file set resolves: nothing outside registry/, no demo in a filter or basic, one fallback per variable.
for (const item of ITEMS) {
  try {
    const { files } = getItemFiles(item);
    cssVariablesOf(files.map((file) => file.source));
  } catch (error) {
    fail(error.message);
  }
}

// Filters and the shared UI never touch the demo data, wherever they are imported from.
for (const path of registryFiles.filter((p) => /^registry\/(filters|ui|lib)\//.test(p))) {
  for (const specifier of specifiersOf(readFileSync(join(ROOT, path), "utf8"))) {
    if (/(^|\/)demo(\/|$)/.test(specifier) || /(^|\/)blocks(\/|$)/.test(specifier)) fail(`${path}: imports ${specifier}`);
  }
}

// A filter's example may ship an asset from demo/; it must stand alone, or it would pull the demo data in with it.
for (const path of EXAMPLE_ASSETS) {
  if (!existsSync(join(ROOT, path))) fail(`${path}: in EXAMPLE_ASSETS but does not exist`);
  else if (specifiersOf(readFileSync(join(ROOT, path), "utf8")).some((s) => s.startsWith("."))) fail(`${path}: an example asset imports another registry file`);
}

// Registry files stay portable: no site code, no theme classes, every colour variable with a literal fallback.
const SITE = /^(@\/|~\/)?(app|components|lib)(\/|$)|^\.\.\/\.\.\/(app|components|lib)(\/|$)|^next(\/|$)/;
const THEME_COLOURS = "page|surface-1|card|surface-3|hover|line|card-border|control-border|text|mute|dim|accent|accent-hover|accent-soft|accent-pale|selected";
const THEME_CLASS = new RegExp(`(?<![\\w-])(?:[\\w-]+:)*(?:bg|text|border|outline|ring|fill|stroke|from|to|via|shadow|decoration|divide|placeholder|caret|accent)-(?:${THEME_COLOURS})(?![\\w-])`, "g");
const FALLBACK = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|transparent)$/i;

for (const path of registryFiles) {
  if (path === "registry/items.ts") continue;
  const source = readFileSync(join(ROOT, path), "utf8");
  for (const specifier of specifiersOf(source)) {
    if (SITE.test(specifier)) fail(`${path}: imports ${specifier} (site code)`);
  }
  for (const line of source.split("\n").map((text, i) => ({ text, n: i + 1 }))) {
    for (const match of line.text.matchAll(THEME_CLASS)) fail(`${path}:${line.n}: theme class "${match[0]}" (use var(--fu-…,#hex))`);
  }
  for (const use of varUses(source)) {
    if (use.fallback === null) fail(`${path}: var(${use.name}) has no fallback`);
    else if (!FALLBACK.test(use.fallback.replaceAll("_", " ").trim())) fail(`${path}: var(${use.name}) falls back to "${use.fallback}", not a hex or rgb() colour`);
  }
}

if (problems.length) {
  console.error(`registry:check: ${problems.length} problem(s)`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`registry:check: clean (${ITEMS.length} items, ${registryFiles.length} registry files)`);
