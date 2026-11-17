// Server only: runs at build time while pages prerender.
// shiki/core with four grammars and the JS regex engine, so the build does not trace every theme and language.
import { createHighlighterCore, type HighlighterCore, type ThemeRegistration } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

// Only the product's own colour tokens, so the code reads as part of the page and follows the theme: the dark and
// light sets are the tokens' values in lib/theme.ts (strings in --fu-accent-pale, keywords in --fu-accent-soft).
const TEXT = "var(--fu-text)";
const MUTE = "var(--fu-mute)";
const DIM = "var(--fu-dim)";
const SOFT = "var(--fu-accent-soft)";
const PALE = "var(--fu-accent-pale)";

const theme: ThemeRegistration = {
  name: "filters-ui",
  type: "dark",
  colors: { "editor.background": "transparent", "editor.foreground": MUTE },
  tokenColors: [
    { settings: { foreground: MUTE } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: DIM } },
    { scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.operator.new", "keyword.control"], settings: { foreground: SOFT } },
    { scope: ["string", "string.template", "punctuation.definition.string", "constant.other.symbol"], settings: { foreground: PALE } },
    { scope: ["constant.numeric", "constant.language"], settings: { foreground: PALE } },
    {
      scope: ["entity.name.function", "support.function", "entity.name.tag", "support.class.component", "entity.name.type", "support.type", "entity.name.class"],
      settings: { foreground: TEXT },
    },
    { scope: ["entity.other.attribute-name"], settings: { foreground: MUTE } },
    { scope: ["punctuation", "meta.brace", "keyword.operator"], settings: { foreground: DIM } },
    { scope: ["variable.other.constant", "variable.other.readwrite.alias"], settings: { foreground: TEXT } },
  ],
};

let highlighter: Promise<HighlighterCore> | undefined;
const get = () =>
  (highlighter ??= createHighlighterCore({
    themes: [theme],
    langs: [import("shiki/langs/tsx.mjs"), import("shiki/langs/typescript.mjs"), import("shiki/langs/css.mjs"), import("shiki/langs/bash.mjs")],
    engine: createJavaScriptRegexEngine(),
  }));

export type CodeLang = "tsx" | "ts" | "css" | "bash";

export const langOf = (path: string): CodeLang => (path.endsWith(".tsx") ? "tsx" : "ts");

/** Highlighted HTML (a <pre>) for code shown on a page. */
export async function highlight(code: string, lang: CodeLang) {
  return (await get()).codeToHtml(code.trimEnd(), { lang, theme: "filters-ui" });
}
