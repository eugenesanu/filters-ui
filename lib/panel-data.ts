// Server only: builds what an item page's copy panel shows, at build time.
import { ITEMS, type RegistryItem } from "@/registry/items";
import { getExampleSource, getItemFiles } from "@/lib/registry-files";
import { buildPrompt } from "@/lib/prompt";
import { highlight, langOf } from "@/lib/highlight";
import { registryJsonUrl } from "@/lib/site";
import { TARGETS, type PanelData, type Target } from "@/components/copy/panel-types";

const baseName = (path: string) => path.split("/").pop()!;
const NAMES: Record<string, string> = {
  "filter-card": "card",
  segmented: "segmented control",
  cn: "class helper",
  facets: "facet counter",
  "body-icons": "car silhouettes",
  sentence: "sentence reader",
};
const words = (path: string) => {
  const name = baseName(path).replace(/\.tsx?$/, "");
  return NAMES[name] ?? name.replaceAll("-", " ");
};

function listOf(parts: string[]) {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** Splits each target's prompt into first line, shared middle and last line, and checks the middle really is shared. */
function promptParts(item: RegistryItem): PanelData["prompt"] {
  const heads = {} as Record<Target, string>;
  const tails = {} as Record<Target, string>;
  const middles = { full: "", short: "" };
  for (const length of ["full", "short"] as const) {
    for (const target of TARGETS) {
      const lines = buildPrompt(item, { target, length }).split("\n");
      const head = lines[0];
      const tail = lines.at(-1)!;
      const middle = lines.slice(1, -1).join("\n");
      if (length === "full") {
        heads[target] = head;
        tails[target] = tail;
      } else if (heads[target] !== head || tails[target] !== tail) {
        throw new Error(`panel-data: ${item.slug} ${target}: short and full prompts start or end differently`);
      }
      if (target === TARGETS[0]) middles[length] = middle;
      else if (middles[length] !== middle) throw new Error(`panel-data: ${item.slug} ${target}: prompt body differs by target`);
    }
  }
  return { heads, tails, ...middles };
}

function needsLine(item: RegistryItem) {
  const { files, requires } = getItemFiles(item);
  const shipped = new Set(requires.flatMap((slug) => getItemFiles(ITEMS.find((i) => i.slug === slug)!).files.map((f) => f.path)));
  const brings = files
    .slice(1)
    .filter((f) => !shipped.has(f.path) && (f.kind === "ui" || f.kind === "lib" || (item.kind === "filter" && f.kind === "demo")))
    .map((f) => words(f.path))
    .sort((a, b) => Number(b === "card") - Number(a === "card"));
  const parts = [`Needs React 19 and Tailwind CSS 4.`];
  if (requires.length) {
    const names = requires.map((slug) => ITEMS.find((i) => i.slug === slug)!.title);
    parts.push(`Adds ${requires.length > 3 ? `all ${requires.length} filters` : listOf(names)} first.`);
  }
  if (brings.length) parts.push(`Also brings the ${listOf(brings)}.`);
  return parts.join(" ");
}

export async function panelDataOf(item: RegistryItem): Promise<PanelData> {
  const { files, dependencies } = getItemFiles(item);
  const usage = getExampleSource(item);
  return {
    prompt: promptParts(item),
    usage: { source: usage, html: await highlight(usage, "tsx") },
    files: await Promise.all(
      files.map(async (file) => ({
        savePath: file.savePath,
        name: baseName(file.path),
        source: file.source,
        html: await highlight(file.source, langOf(file.path)),
      })),
    ),
    dependencies,
    registryUrl: registryJsonUrl(item.slug),
    needs: needsLine(item),
  };
}
