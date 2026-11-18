// Shared by the server (panel data, at build time) and the client panel, so it carries no "use client".
// Highlighted code is about seven times the size of its source, and a page carries every file of its item. So the
// page carries each source once, with "marks": for every line, the length and colour of each piece. The panel builds
// the highlighted HTML from the two when the Code tab shows a file. lib/panel-data.ts checks at build time that the
// result is, character for character, what the highlighter wrote.

/** The colour tokens lib/highlight.ts uses, in the order the marks letter them: A is --fu-text, B --fu-mute… */
const COLOURS = ["text", "mute", "dim", "accent-soft", "accent-pale"];
const OPEN = '<pre class="shiki filters-ui" style="background-color:transparent;color:var(--fu-mute)" tabindex="0"><code>';
const CLOSE = "</code></pre>";
const LINE = /^<span class="line">(.*)<\/span>$/;
const PIECE = /<span style="color:var\(--fu-([a-z-]+)\)">([^<]*)<\/span>/g;

const escaped = (text: string) => text.replace(/&/g, "&#x26;").replace(/</g, "&#x3C;");
const plain = (text: string) => text.replace(/&#x3C;/g, "<").replace(/&#x26;/g, "&");

/**
 * The marks of highlighted HTML: lines joined by commas, each a run of pieces written as a length in base 36 and a
 * colour letter, so "6D1C" is six characters in --fu-accent-soft, then one in --fu-dim. Null when the HTML is not in
 * the shape the highlighter writes today.
 */
export function marksOf(html: string): string | null {
  if (!html.startsWith(OPEN) || !html.endsWith(CLOSE)) return null;
  const lines: string[] = [];
  for (const line of html.slice(OPEN.length, -CLOSE.length).split("\n")) {
    const inner = LINE.exec(line)?.[1];
    if (inner === undefined) return null;
    let marks = "";
    let read = 0;
    for (const piece of inner.matchAll(PIECE)) {
      const colour = COLOURS.indexOf(piece[1]);
      if (colour < 0 || piece.index !== read) return null;
      read += piece[0].length;
      marks += plain(piece[2]).length.toString(36) + String.fromCharCode(65 + colour);
    }
    if (read !== inner.length) return null;
    lines.push(marks);
  }
  return lines.join(",");
}

/** The highlighted HTML (a <pre>) of a source and its marks. */
export function codeHtml(source: string, marks: string): string {
  const lines = source.trimEnd().split("\n");
  let html = OPEN;
  marks.split(",").forEach((line, i) => {
    const text = lines[i] ?? "";
    let at = 0;
    html += `${i ? "\n" : ""}<span class="line">`;
    for (const piece of line.matchAll(/([0-9a-z]+)([A-Z])/g)) {
      const length = parseInt(piece[1], 36);
      html += `<span style="color:var(--fu-${COLOURS[piece[2].charCodeAt(0) - 65]})">${escaped(text.slice(at, at + length))}</span>`;
      at += length;
    }
    html += "</span>";
  });
  return html + CLOSE;
}

/** A source with its highlighting: as marks, or as the highlighter's own HTML where the marks cannot stand for it. */
export type Highlighted = { source: string; marks?: string; html?: string };

export const htmlOf = (code: Highlighted): string => code.html ?? codeHtml(code.source, code.marks ?? "");
