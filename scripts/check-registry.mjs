// Checks the rules the registry relies on. Runs in prebuild; exits 1 with every problem listed.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ITEM_STATES, ITEMS } from "../registry/items.ts";
import { cssVariablesOf, EXAMPLE_ASSETS, getItemFiles, specifiersOf, varUses } from "../lib/registry-files.ts";
import { TOKENS } from "../lib/theme.ts";

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

// Colour tokens: lib/theme.ts is the one list. Every token has a dark and a light value, and app/globals.css holds
// exactly those values: dark on :root, light under :root[data-theme="light"] and under the light media query.
const norm = (value) =>
  value.replaceAll("_", " ").trim().toLowerCase().replace(/\s+/g, " ").replace(/\s*([(),/])\s*/g, "$1");
const COLOUR = /^(#[0-9a-f]{6}|rgb\(\d{1,3} \d{1,3} \d{1,3}\/(0|1|0?\.\d+)\))$/;
for (const [name, token] of Object.entries(TOKENS)) {
  if (!/^--fu-[a-z0-9-]+$/.test(name)) fail(`lib/theme.ts: ${name} is not a --fu-* name`);
  for (const scheme of ["dark", "light"]) {
    if (typeof token[scheme] !== "string" || !token[scheme].trim()) fail(`lib/theme.ts: ${name} has no ${scheme} value`);
    else if (!COLOUR.test(norm(token[scheme]))) fail(`lib/theme.ts: ${name} ${scheme} "${token[scheme]}" is not #RRGGBB or rgb(r g b/a)`);
  }
}

const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
/** The declarations directly inside the first block whose selector is exactly `selector`. */
function blockOf(selector) {
  const at = css.split("\n").findIndex((line) => line.trim() === `${selector} {`);
  if (at === -1) return null;
  const declared = new Map();
  for (const line of css.split("\n").slice(at + 1)) {
    if (line.trim() === "}") break;
    const m = line.match(/^\s*(--fu-[a-z0-9-]+)\s*:\s*(.+?);\s*$/);
    if (m && declared.has(m[1])) fail(`app/globals.css: ${selector} sets ${m[1]} twice`);
    if (m) declared.set(m[1], m[2]);
  }
  return declared;
}
const SCHEME_BLOCKS = [
  [":root", "dark"],
  [':root[data-theme="light"]', "light"],
  [':root:not([data-theme="dark"])', "light"],
];
if (!/@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme="dark"\]\) \{/.test(css)) {
  fail('app/globals.css: the light values must also sit under @media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { … } }');
}
for (const [selector, scheme] of SCHEME_BLOCKS) {
  const declared = blockOf(selector);
  if (!declared) {
    fail(`app/globals.css: no "${selector} {" block`);
    continue;
  }
  for (const [name, token] of Object.entries(TOKENS)) {
    if (!declared.has(name)) fail(`app/globals.css: ${selector} does not set ${name}`);
    else if (norm(declared.get(name)) !== norm(token[scheme])) fail(`app/globals.css: ${selector} sets ${name} to ${declared.get(name)}, lib/theme.ts says ${token[scheme]}`);
  }
  for (const [name, value] of declared) {
    if (!(name in TOKENS) && /^(#|rgb|hsl)/i.test(value.trim())) fail(`app/globals.css: ${selector} sets colour ${name}, which is not in lib/theme.ts`);
  }
}

// Every item says what its stage offers (the Locale control, and later others) in components/stage/stage-specs.ts.
const stageSpecs = readFileSync(join(ROOT, "components/stage/stage-specs.ts"), "utf8");
for (const item of ITEMS) {
  if (!new RegExp(`^\\s*(?:"${item.slug}"|${item.slug}): \\{ locale: (?:true|false)`, "m").test(stageSpecs)) {
    fail(`${item.slug}: add it to STAGE_SPECS in components/stage/stage-specs.ts`);
  }
}

// States: each item lists the states it supports in registry/items.ts (ITEM_STATES order, "ready" first); the stage's
// State switch and the prompt's States part read that list. A listed state needs its props in the props table, and once
// an item lists more than "ready", every state prop it documents needs its state listed. loading and error come
// together (one status prop), and an item that loads or fails draws them with the shared StatusFrame, never its own.
const STATE_NEEDS = { loading: ["status"], error: ["status", "onRetry", "errorText"], empty: ["emptyText"], disabled: ["disabled"] };
const PROP_GIVES = { status: ["loading", "error"], onRetry: ["error"], errorText: ["error"], emptyText: ["empty"], disabled: ["disabled"] };
for (const item of ITEMS) {
  if (!Array.isArray(item.states)) {
    fail(`${item.slug}: add states (registry/items.ts), at least ["ready"]`);
    continue;
  }
  const states = item.states;
  const documented = new Set(item.props.flatMap((row) => row.name.split("/").map((name) => name.trim())));
  if (states[0] !== "ready") fail(`${item.slug}: states must start with "ready"`);
  let last = -1;
  for (const state of states) {
    const at = ITEM_STATES.indexOf(state);
    if (at === -1) fail(`${item.slug}: "${state}" is not one of ITEM_STATES`);
    else if (at <= last) fail(`${item.slug}: states must follow ITEM_STATES order, each once`);
    last = Math.max(last, at);
    for (const prop of STATE_NEEDS[state] ?? []) {
      if (!documented.has(prop)) fail(`${item.slug}: lists the "${state}" state, but its props do not document ${prop}`);
    }
  }
  if (states.includes("loading") !== states.includes("error")) fail(`${item.slug}: loading and error come together (both are status)`);
  if (states.length > 1) {
    for (const [prop, needs] of Object.entries(PROP_GIVES)) {
      if (!documented.has(prop)) continue;
      for (const state of needs) if (!states.includes(state)) fail(`${item.slug}: documents ${prop}, but its states do not list "${state}"`);
    }
  }
  for (const key of Object.keys(item.stateNotes ?? {})) {
    if (!states.includes(key)) fail(`${item.slug}: stateNotes has "${key}", which is not one of its states`);
  }
  if (states.includes("loading")) {
    try {
      if (!getItemFiles(item).files.some((file) => file.path === "registry/ui/status-frame.tsx")) {
        fail(`${item.slug}: lists loading and error, but does not use StatusFrame (registry/ui/status-frame.tsx)`);
      }
    } catch {}
  }
}

// Right to left: layout runs on start and end. A physical-direction class (ml-, pr-(--x), left-, text-right, border-l,
// rounded-tl, [margin-left:…]…) or a physical style key in a style={{…}} object is a problem, unless a comment holding
// "physical:" sits on that line or the line above and says why. A centred left-1/2 with -translate-x-1/2 on the same
// line passes. Right-to-left overrides use Tailwind's rtl: variant. A :dir() selector is out: Tailwind's CSS step
// rewrites it into a list of :lang() tests for older browsers, which ignores dir="rtl" altogether.
// Not covered, as it would need a parser: a style given as an expression (style={rtl ? {…} : {…}}), and a "//" inside
// a string that does not follow a ":" (the rest of that line is read as a comment).
const PHYSICAL_CLASS =
  /(?<![\w\-[/.])(?:[\w\-[\]&:()=.>*@/~+%,#']+:)*(-?(?:m[lr]|p[lr]|scroll-[mp][lr])-(?:\d|\[|\(|px\b|auto\b)[^\s"'`]*|-?(?:left|right)-(?:\d|\[|px\b|auto\b|full\b|\()[^\s"'`]*|\[(?:(?:margin|padding|scroll-margin|scroll-padding|border)-(?:left|right)[\w-]*|border-(?:top|bottom)-(?:left|right)-radius|left|right):[^\s"'`]*|\[(?:text-align|float|clear):(?:left|right)\][^\s"'`]*|rounded-(?:[lr]|tl|tr|bl|br)(?:-[^\s"'`]+)?|border-[lr](?:-[^\s"'`]+)?|text-(?:left|right)|float-(?:left|right)|clear-(?:left|right))(?![\w-])/g;
const DIR_PSEUDO = /:dir\(/;
const PHYSICAL_KEY =
  /\b(left|right|marginLeft|marginRight|paddingLeft|paddingRight|scroll(?:Margin|Padding)(?:Left|Right)|borderLeft\w*|borderRight\w*|border(?:Top|Bottom)(?:Left|Right)Radius)["']?\s*:|\b(?:textAlign|float|clear)\s*:\s*["'](left|right)["']|\[[^\]\n]*["'](left|right)["'][^\]\n]*\]\s*:/g;
const withoutComments = (text) => text.replace(/(?<!:)\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
for (const path of registryFiles) {
  if (path === "registry/items.ts") continue;
  const lines = readFileSync(join(ROOT, path), "utf8").split("\n");
  const marked = (i) => /physical:/.test(lines[i]) || /physical:/.test(lines[i - 1] ?? "");
  const code = lines.map(withoutComments);
  code.forEach((text, i) => {
    if (marked(i)) return;
    for (const match of text.matchAll(PHYSICAL_CLASS)) {
      if (/^left-1\/2$/.test(match[1]) && /-translate-x-1\/2/.test(text)) continue;
      fail(`${path}:${i + 1}: physical-direction class "${match[0]}" (use ms-/me-/ps-/pe-/inset-s-/inset-e-/text-start/border-s/rounded-s…, or mark it with a "physical:" comment saying why)`);
    }
    if (DIR_PSEUDO.test(text)) fail(`${path}:${i + 1}: ":dir(" is compiled to :lang() tests and ignores dir="rtl"; use the rtl: variant`);
  });
  // A style object may run over several lines: it is read whole, up to its closing braces.
  const source = code.join("\n");
  for (const open of source.matchAll(/style=\{\{/g)) {
    let depth = 2;
    let end = open.index + open[0].length;
    while (depth && end < source.length) depth += { "{": 1, "}": -1 }[source[end++]] ?? 0;
    const first = source.slice(0, open.index).split("\n").length - 1;
    source
      .slice(open.index, end)
      .split("\n")
      .forEach((text, k) => {
        if (marked(first + k)) return;
        for (const match of text.matchAll(PHYSICAL_KEY)) {
          fail(`${path}:${first + k + 1}: physical style key "${match[1] ?? match[2] ?? match[3]}" (use insetInlineStart, marginInlineEnd…, or a "physical:" comment)`);
        }
      });
  }
}

// Registry files stay portable: no site code, no theme classes, every colour a --fu-* token whose fallback is its dark value.
const SITE = /^(@\/|~\/)?(app|components|lib)(\/|$)|^\.\.\/\.\.\/(app|components|lib)(\/|$)|^next(\/|$)/;
const THEME_COLOURS = Object.keys(TOKENS).map((name) => name.slice("--fu-".length)).sort((a, b) => b.length - a.length).join("|");
const THEME_CLASS = new RegExp(
  `(?<![\\w-])(?:[\\w-]+:)*(?:bg|text|border(?:-[xytrblse])?|outline|ring(?:-offset)?|inset-ring|fill|stroke|from|to|via|shadow|inset-shadow|drop-shadow|text-shadow|decoration|divide|placeholder|caret|accent)-(?:${THEME_COLOURS})(?![\\w-])`,
  "g",
);

// Every CSS named colour, longest first so "whitesmoke" is not read as "white".
const NAMED_COLOURS = (
  "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue " +
  "chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey " +
  "darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray " +
  "darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen " +
  "fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki " +
  "lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen " +
  "lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime " +
  "limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue " +
  "mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive " +
  "olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum " +
  "powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver " +
  "skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white " +
  "whitesmoke yellow yellowgreen"
)
  .split(" ")
  .sort((a, b) => b.length - a.length)
  .join("|");
const NAMED_WORD = new RegExp(`(?<![\\w-])(?:${NAMED_COLOURS})(?![\\w-])`, "gi");
// Tailwind colour utilities, with every prefix that takes a colour (ring-offset, inset-ring, drop-shadow, border sides…).
const COLOUR_UTILITY =
  "bg|text|border(?:-[xytrblse])?|outline|ring(?:-offset)?|inset-ring|fill|stroke|from|to|via|shadow|inset-shadow|drop-shadow|text-shadow|decoration|divide|placeholder|caret|accent";
// A style or prop value that carries colour: boxShadow: "0 0 0 1px white", borderColor: "Black", background: "…".
const STYLE_VALUE = /\b[A-Za-z-]*(?:color|background|border|outline|fill|stroke|shadow)[A-Za-z-]*\s*:\s*(["'`])((?:(?!\1).)*)\1/gi;
// A raw colour anywhere in a registry file, comments included, once every var(--fu-…, fallback) is taken out.
const RAW_COLOUR = [
  /#[0-9a-f]{3,8}\b/gi,
  // Not \b: a Tailwind arbitrary value puts "_" (a word character) right before the function, as in 0_1px_rgb(…).
  /(?<![A-Za-z0-9-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/gi,
  new RegExp(
    `(?<![\\w-])(?:[\\w-]+:)*(?:${COLOUR_UTILITY})-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|mauve|olive|mist|taupe)-\\d{2,3})(?![\\w-])`,
    "g",
  ),
  /\b(?:fill|stroke|stopColor|stop-color|floodColor|lightingColor)\s*=\s*\{?\s*["'](?!none|currentColor|transparent|inherit|url\(|var\(--)[a-z#]/gi,
  // A named colour as a value inside brackets or a colour function: bg-[white], border-[color:black], color-mix(in_srgb,white_10%,…).
  new RegExp(`(?<=[\\[:,_(]\\s*)(?:${NAMED_COLOURS})(?=\\s*[\\]_,)/]|\\s+\\d)`, "gi"),
];
/** Named colours inside a colour-carrying style value, in any letter case and at any place in it. */
function namedInStyles(line) {
  const hits = [];
  for (const value of line.matchAll(STYLE_VALUE)) for (const word of value[2].matchAll(NAMED_WORD)) hits.push(word[0]);
  return hits;
}
// Data, not theme: the paint of each colour swatch.
const DATA_COLOUR = /^\s*[A-Z][a-z]+: "#[0-9A-F]{6}",$/;
const DATA_FILES = new Set(["registry/demo/cars.ts", "registry/examples/color-swatches.tsx"]);
// Data, not theme: the colour name of a demo car (a record line with make: "…" or name: "…"), only in demo and example files.
const CAR_COLOUR = /\bcolor: "[A-Z][a-z]+"/g;
const carRecord = (path, line) => /^registry\/(demo|examples)\//.test(path) && /\b(?:make|name): "/.test(line);
// Alpha masks: only the opacity of their stops counts. Only the mask's own value is exempt: the string assigned to a
// MASK_… constant, a [mask-image:…] class, a maskImage: "…" style or a mask-image: … declaration. The rest of the line is checked.
const MASK_VALUE = [
  /\bMASK_[A-Z_]+\s*=\s*(["'`])(?:(?!\1).)*\1/g,
  /\bmaskImage\s*:\s*(["'`])(?:(?!\1).)*\1/g,
  /mask-image\s*:[^;"'`]*/g,
];

/** The line with every mask value cut out. A [mask-image:…] class is cut up to its matching "]". */
function withoutMasks(line) {
  let out = line;
  for (let at; (at = out.search(/\[(?:-webkit-)?mask-image:/)) !== -1; ) {
    let depth = 0;
    let j = at;
    for (; j < out.length; j++) {
      if (out[j] === "[") depth++;
      else if (out[j] === "]" && --depth === 0) break;
    }
    out = out.slice(0, at) + "MASK" + out.slice(j + 1);
  }
  for (const pattern of MASK_VALUE) out = out.replace(pattern, "MASK");
  return out;
}

function withoutTokens(source) {
  let out = "";
  let i = 0;
  const start = /var\(\s*--fu-[a-z0-9-]+\s*,/gi;
  for (let m; (m = start.exec(source)); ) {
    out += source.slice(i, m.index) + "VAR";
    let depth = 1;
    let j = m.index + m[0].length;
    for (; j < source.length && depth > 0; j++) {
      if (source[j] === "(") depth++;
      else if (source[j] === ")") depth--;
    }
    i = j;
    start.lastIndex = j;
  }
  return out + source.slice(i);
}

for (const path of registryFiles) {
  if (path === "registry/items.ts") continue;
  const source = readFileSync(join(ROOT, path), "utf8");
  for (const specifier of specifiersOf(source)) {
    if (SITE.test(specifier)) fail(`${path}: imports ${specifier} (site code)`);
  }
  for (const line of source.split("\n").map((text, i) => ({ text, n: i + 1 }))) {
    for (const match of line.text.matchAll(THEME_CLASS)) fail(`${path}:${line.n}: theme class "${match[0]}" (use var(--fu-…,#hex))`);
    if (DATA_FILES.has(path) && DATA_COLOUR.test(line.text)) continue;
    let bare = withoutTokens(withoutMasks(line.text));
    if (carRecord(path, bare)) bare = bare.replace(CAR_COLOUR, "DATA");
    const raw = RAW_COLOUR.flatMap((pattern) => [...bare.matchAll(pattern)].map((match) => match[0]));
    for (const colour of new Set([...raw, ...namedInStyles(bare)])) {
      fail(`${path}:${line.n}: raw colour "${colour}" (use var(--fu-token,<its dark value>) from lib/theme.ts)`);
    }
  }
  for (const use of varUses(source)) {
    const token = TOKENS[use.name];
    if (use.fallback === null) fail(`${path}: var(${use.name}) has no fallback`);
    else if (!token) fail(`${path}: ${use.name} is not a token in lib/theme.ts`);
    else if (token.site) fail(`${path}: ${use.name} is a site-only token`);
    else if (norm(use.fallback) !== norm(token.dark)) fail(`${path}: var(${use.name}) falls back to "${use.fallback}", but its dark value is ${token.dark}`);
  }
}

if (problems.length) {
  console.error(`registry:check: ${problems.length} problem(s)`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`registry:check: clean (${ITEMS.length} items, ${registryFiles.length} registry files)`);
