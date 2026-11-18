// Shared by lib/prompt.ts on the server and the client panel, so it imports no server code.
import type { CodeFile, PanelData, Target } from "@/components/copy/panel-types";

/** A fence longer than any run of backticks in the text, so a file can never close its own block. */
export function fence(text: string, lang: string) {
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  const ticks = "`".repeat(longest + 1);
  return `${ticks}${lang}\n${text.trimEnd()}\n${ticks}`;
}

export const langOf = (path: string) => (path.endsWith(".tsx") ? "tsx" : "ts");

/** The files as the full prompt lists them: each one's path as a heading, then its source in a fence. */
export const filesText = (files: readonly Pick<CodeFile, "savePath" | "source">[]) =>
  files.map((file) => `\n\n### ${file.savePath}\n\n${fence(file.source, langOf(file.savePath))}`).join("");

/** One target's prompt: its first line, the shared middle (the full one with its files put back) and its last line. */
export function promptText(data: Pick<PanelData, "prompt" | "files">, target: Target, length: "full" | "short") {
  const { heads, tails, full, short } = data.prompt;
  const middle = length === "short" ? short : full.before + filesText(data.files) + full.after;
  return [heads[target], middle, tails[target]].join("\n");
}
