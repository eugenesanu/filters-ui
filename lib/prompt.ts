// Server only: reads the registry sources through registry-files.
import { FILTER_CARD_PROPS, type PropRow, type RegistryItem } from "../registry/items.ts";
import { cssVariablesOf, getExampleSource, getItemFiles, INSTALL_ALIAS, INSTALL_DIR } from "./registry-files.ts";
import { itemUrl, registryJsonUrl } from "./site.ts";
import { TOKENS, type TokenName } from "./theme.ts";

export type PromptTarget = "claude-code" | "cursor" | "v0" | "lovable" | "other";
export type PromptLength = "full" | "short";

const WHERE: Record<PromptTarget, string> = {
  "claude-code": "this project",
  cursor: "this project",
  v0: "this app",
  lovable: "this app",
  other: "my project",
};

// A basic named "X and Y" holds several components.
const what = (item: RegistryItem) =>
  item.kind === "block"
    ? item.slug === "cars-board"
      ? "the full filter set"
      : `the "${item.title}" block`
    : item.kind === "basic"
      ? `the "${item.title}" ${/ and /.test(item.title) ? "components" : "component"}`
      : `the "${item.title}" filter`;
const FIRST = (target: PromptTarget, item: RegistryItem) => `Add ${what(item)} from FiltersUI to ${WHERE[target]}.`;

function LAST(target: PromptTarget, item: RegistryItem) {
  const change =
    item.kind === "block" ? "the result count changing as I use the filters" : item.kind === "basic" ? "it working" : "the value changing as I use the filter";
  if (target === "claude-code") return `When done, run the app, tell me which page to open, and show me ${change}.`;
  if (target === "cursor") return `When done, tell me which page to open and show me ${change}.`;
  if (target === "v0" || target === "lovable") return `When done, show it in the preview with ${change}.`;
  return `When done, show me ${change}.`;
}

const licence = "It is free and MIT licensed, from filtersui.com.";
const installLine = (item: RegistryItem) => `npx shadcn@latest add ${registryJsonUrl(item.slug)}`;

function lightOf(name: string) {
  const token = TOKENS[name as TokenName];
  if (!token) throw new Error(`prompt: ${name} is not in lib/theme.ts`);
  return token.light;
}

/** A fence longer than any run of backticks in the text, so a file can never close its own block. */
function fence(text: string, lang: string) {
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  const ticks = "`".repeat(longest + 1);
  return `${ticks}${lang}\n${text.trimEnd()}\n${ticks}`;
}

const langOf = (path: string) => (path.endsWith(".tsx") ? "tsx" : "ts");

function propLines(rows: readonly PropRow[]) {
  return rows.map((row) => {
    const tail = row.required ? "required" : row.default ? `default ${row.default}` : "optional";
    return `- ${row.name}: ${row.type} (${tail}). ${row.meaning}`;
  });
}

/** Plain text to paste into an AI coding tool. Full works with no web access; short points at the page. */
export function buildPrompt(item: RegistryItem, { target, length }: { target: PromptTarget; length: PromptLength }) {
  const first = `${FIRST(target, item)} ${licence}`;

  if (length === "short") {
    return [
      first,
      "",
      `If this project has a components.json, run: ${installLine(item)}`,
      `Otherwise read ${registryJsonUrl(item.slug)}: it holds the files with the path to save each one at, and lists any other FiltersUI items it needs.`,
      `How it works, its props and an example: ${itemUrl(item.slug)}`,
      "",
      LAST(target, item),
    ].join("\n");
  }

  const { files, dependencies } = getItemFiles(item);
  const example = getExampleSource(item);
  const variables = cssVariablesOf([...files.map((file) => file.source), example]);
  const hasCard = files.some((file) => file.path === "registry/ui/filter-card.tsx");
  const entry = files[0];
  const out: string[] = [];
  const add = (...lines: string[]) => out.push(...lines);

  add(
    first,
    "",
    `${item.title}: ${item.description}`,
    "",
    "Needs: React 19, Tailwind CSS 4 and TypeScript. If this project uses another setup, adapt the classes, keep the look.",
    "",
    "## Install",
    "",
    `If this project has a components.json, run: ${installLine(item)}`,
    "and skip the files below.",
    "",
    `Otherwise save each file below at the path shown, from the project root (or inside src/ if the project keeps its code there). Keep the folder layout: the files import each other by relative paths.`,
  );
  if (dependencies.length) add("", `Install these npm packages: npm install ${dependencies.join(" ")}`);

  for (const file of files) add("", `### ${file.savePath}`, "", fence(file.source, langOf(file.path)));

  add("", "## What it does", "", ...item.does.map((line) => `- ${line}`));

  add(
    "",
    "## Props and value",
    "",
    `${item.component} (${entry.savePath}) holds this value: ${item.value}`,
    "",
    ...propLines(item.props),
  );
  if (hasCard && item.kind === "filter" && item.card !== false) {
    add(
      "",
      `It sits inside FilterCard (${INSTALL_DIR}/ui/filter-card.tsx), the card with the title, the value in words and a Clear button:`,
      "",
      ...propLines(FILTER_CARD_PROPS),
    );
  }

  add(
    "",
    "## Usage",
    "",
    `${item.kind === "basic" && !/\bCARS\b/.test(example) ? "A working example." : "A working example with a few made-up cars."} Imports assume @/ points at the project root; change ${INSTALL_ALIAS} if this project uses another alias.`,
    "",
    fence(example, "tsx"),
  );

  add(
    "",
    "## Connect it to my data",
    "",
    item.connect ??
    (item.kind === "block"
      ? `The board filters a list of Car records (${INSTALL_DIR}/demo/cars.ts) and counts every option itself in ${INSTALL_DIR}/demo/cars-facets.ts. Ask me where my records come from and which of my fields match each card. Then map my records onto the Car type, or change Car and the facet tests in cars-facets.ts to my fields, and remove the cards I have no field for. Keep the counting as it is: each option is counted with every other filter applied and its own left out.`
      : "Ask me which field it filters and where the list of items comes from. Counts are numbers I pass in: work them out from my items, and when there are other filters on the page, count each option with every other filter applied but this one left out, so a count says how many results picking it would give."),
  );

  add(
    "",
    "## Keep the look",
    "",
    "It is dark by default and needs no setup. To change colours, set these CSS variables on :root or on a parent element. These are the dark defaults:",
    "",
    fence(`:root {\n${variables.map((v) => `  ${v.name}: ${v.fallback};`).join("\n")}\n}`, "css"),
    "",
    "To turn on the light theme, set these values under this project's own light selector (written as .light here). If it has none, put them on :root inside @media (prefers-color-scheme: light).",
    "",
    fence(`.light {\n${variables.map((v) => `  ${v.name}: ${lightOf(v.name)};`).join("\n")}\n}`, "css"),
    "",
    "Keep the sizes, corners, spacing and motion as they are.",
  );

  add("", "## Keep the accessibility", "", ...[...item.accessibility, ...item.keyboard].map((line) => `- ${line}`));

  add("", LAST(target, item));
  return out.join("\n");
}
