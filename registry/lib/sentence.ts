const MOST_ROWS = 7;
const FACET_ROWS = 4;
const COMPLETIONS = 3;
const CHIP_SEPARATOR = ", ";

// Reads a typed sentence into filters, and suggests what to add next.
//
// Nothing here knows the items: a Vocabulary says which words mean what. Terms are the named values
// ("SUV", "Toyota", "Blue"); rules are the phrases with numbers or meaning ("under 30k", "7 seats",
// "good in snow"). Swap the vocabulary and the same reader works for houses, jobs or shoes.
//
// Names match whole words in any script. Two limits: a plural is read as the name plus "s" (English), and a
// state is compared with JSON.stringify, so keep it plain data (no Set or Map).

/** A named value a word can set, e.g. the body style SUV. */
export type Term<State> = {
  /** Unique, and equal to the key of the token it adds. */
  key: string;
  label: string;
  /** The filter it belongs to, shown beside a suggestion: "Body style". */
  group: string;
  /** Other words for it: "crossover" for SUV. Plurals are read without listing them. */
  names?: readonly string[];
  /** Shown beside a suggestion instead of the group, e.g. a model's make. */
  hint?: string;
  /** Any CSS color, drawn as a dot beside the suggestion. */
  swatch?: string;
  /** A misspelt word close to this name is read as it: "telsa" as Tesla. */
  spellcheck?: boolean;
  /** The key of the term it narrows, e.g. a model's make. It completes a sentence that names that make, or none. */
  parent?: string;
  add: (state: State) => State;
};

/** One removable token in the box: a filter that is set. */
export type Token<State> = {
  /** Equal to the key of the term that adds it, when there is one. */
  key: string;
  label: string;
  /** The filter it belongs to: "Price". */
  group: string;
  hint?: string;
  swatch?: string;
  clear: (state: State) => State;
};

export type RuleContext<Item, State> = {
  items: readonly Item[];
  /** What is already set before the sentence, so "family" after a Sedan token adds nothing. */
  context: State;
  vocabulary: Vocabulary<Item, State>;
};

/** A phrase read before any name, in list order. Its words are used up as soon as it matches. */
export type Rule<Item, State> = {
  pattern: RegExp;
  read?: (draft: State, match: RegExpMatchArray, ctx: RuleContext<Item, State>) => State;
  /** Runs after every name is read, for a phrase that depends on the rest, e.g. "cheap truck". */
  finish?: (draft: State, ctx: RuleContext<Item, State>) => State;
};

/** A filter offered by name when the box is empty, or when its word is typed ("price"). */
export type Facet<Item, State> = {
  title: string;
  words: readonly string[];
  options: (state: State, items: readonly Item[]) => readonly Term<State>[];
  isSet: (state: State) => boolean;
  /** Options keep their own order (budgets, years); otherwise the most items come first. */
  stepped?: boolean;
};

export type Vocabulary<Item, State> = {
  empty: State;
  matches: (item: Item, state: State) => boolean;
  /** Adds `extra` to `base`; a filter with one answer takes the newer one. */
  merge: (base: State, extra: State) => State;
  /** The tokens for a state, in a fixed order. */
  tokens: (state: State) => Token<State>[];
  terms: readonly Term<State>[];
  rules?: readonly Rule<Item, State>[];
  facets?: readonly Facet<Item, State>[];
  /** Facet titles offered on an empty box with nothing set, then once something is set. */
  firstUp?: readonly string[];
  nextUp?: readonly string[];
  /** Suggestions for a typed number, such as "2020" or "under 30k". */
  numbers?: (typed: string, state: State, items: readonly Item[]) => Term<State>[];
  /** Words that say nothing, so leaving them unread is not worth a mention. */
  filler?: readonly string[];
  /** Everyday words one slip from a name, never fixed into it: "keep" (Jeep), "fold" (Ford). */
  notTypos?: readonly string[];
  /** Words that are never a name on their own, though a name starts with them: "car" and "cargo van". */
  stopNames?: readonly string[];
  /** Groups dropped last when nothing matches, as they name the thing itself: make and model. */
  dropLast?: readonly string[];
  /** describe() of a state with nothing set. */
  everything?: string;
};

/** A token and the words it was read from. */
export type ReadToken<State> = Token<State> & { from: string[] };

export type Correction = { word: string; name: string };

export type Reading<State> = {
  /** What the words alone say. Merge it into what is set with the vocabulary's merge. */
  value: State;
  /** In the order their words were typed. */
  tokens: ReadToken<State>[];
  /** Words it could not use, filler left out. */
  left: string[];
  /** Misspelt names it fixed. Empty unless read with fixTypos. */
  corrections: Correction[];
  /** The sentence it read, after fixes. */
  text: string;
};

export type Suggestion<State> = {
  key: string;
  label: string;
  hint?: string;
  swatch?: string;
  count: number;
  next: State;
  /** Words of the sentence the row leaves unread. */
  left?: string[];
  /** Keys of the tokens it adds, in the order their words were typed. */
  order: string[];
};

export type SuggestionGroup<State> = { title?: string; rows: Suggestion<State>[] };


export const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "rav4" reads "rav 4" and "rav-4"; a name ending in a letter may carry digits, as "rx350" does.
function namePattern(name: string) {
  const spelled = escape(fold(name))
    .replace(/[-\s]+/g, "[- ]?")
    .replace(/([a-z])(\d)/g, "$1[- ]?$2");
  const tail = /\p{L}$/u.test(name) ? "(?:s|\\d+[a-z]?)?" : "s?";
  return new RegExp(`(^|[^\\p{L}\\p{N}])${spelled}${tail}(?![\\p{L}\\p{N}])`, "u");
}

const namesOf = <State>(term: Term<State>) => [fold(term.label), ...(term.names ?? []).map(fold)];

type Compiled<State> = { term: Term<State>; pattern: RegExp; length: number };
const compiled = new WeakMap<readonly Term<unknown>[], Compiled<unknown>[]>();

// Longest names first, so "Mustang Mach-E" wins over "Mustang" and "plug-in hybrid" over "hybrid".
function patternsOf<State>(terms: readonly Term<State>[]): Compiled<State>[] {
  const hit = compiled.get(terms as readonly Term<unknown>[]);
  if (hit) return hit as Compiled<State>[];
  const list = terms
    .flatMap((term) => namesOf(term).map((name) => ({ term, pattern: namePattern(name), length: name.length })))
    .sort((a, b) => b.length - a.length);
  compiled.set(terms as readonly Term<unknown>[], list as Compiled<unknown>[]);
  return list;
}

const signatureOf = <State>(tokens: readonly Token<State>[]) =>
  tokens
    .map((token) => `${token.key}:${token.label}`)
    .sort()
    .join("|");

export const countOf = <Item, State>(vocabulary: Vocabulary<Item, State>, items: readonly Item[], state: State) => {
  let n = 0;
  for (const item of items) if (vocabulary.matches(item, state)) n++;
  return n;
};

export const hasAny = <Item, State>(vocabulary: Vocabulary<Item, State>, state: State) => vocabulary.tokens(state).length > 0;

/** The tokens as words: "Blue, SUV, Under $30k". */
export function describe<Item, State>(vocabulary: Vocabulary<Item, State>, state: State) {
  const labels = vocabulary.tokens(state).map((token) => token.label);
  return labels.length ? labels.join(CHIP_SEPARATOR) : (vocabulary.everything ?? "Everything");
}

// Swapped letters count as one slip, so "telsa" is one edit from "tesla".
function editDistance(a: string, b: string) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[a.length][b.length];
}

/**
 * The name a misspelt word is closest to: 4+ letters starting with the same letter, one slip allowed, two from
 * 7 letters. On a tie the longer name wins. Words in `notTypos` are never fixed.
 */
export function nearestName<State>(terms: readonly Term<State>[], word: string, notTypos: readonly string[] = []) {
  const typed = fold(word);
  if (typed.length < 4 || notTypos.includes(typed)) return null;
  const allowed = typed.length >= 7 ? 2 : 1;
  let best: { term: Term<State>; edits: number } | null = null;
  for (const term of terms) {
    if (!term.spellcheck) continue;
    const name = fold(term.label);
    if (name[0] !== typed[0] || Math.abs(name.length - typed.length) > allowed) continue;
    const edits = editDistance(typed, name);
    if (edits > allowed) continue;
    if (!best || edits < best.edits || (edits === best.edits && term.label.length > best.term.label.length)) best = { term, edits };
  }
  return best?.term ?? null;
}

const inSentenceOrder = <T extends { key: string }>(tokens: T[], places: ReadonlyMap<string, number>) =>
  tokens
    .map((token, i) => ({ token, at: places.get(token.key) ?? Number.MAX_SAFE_INTEGER, i }))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map(({ token }) => token);

function parse<Item, State>(vocabulary: Vocabulary<Item, State>, items: readonly Item[], text: string, context: State) {
  const ctx: RuleContext<Item, State> = { items, context, vocabulary };
  const sources = new Map<string, string[]>();
  // Where each token's first word sits, so tokens follow the order the words were typed in.
  const places = new Map<string, number>();
  let draft = vocabulary.empty;
  let rest = ` ${fold(text)} `;

  const note = (before: Set<string>, words: string, at: number) => {
    for (const token of vocabulary.tokens(draft)) {
      if (before.has(token.key)) continue;
      sources.set(token.key, [...(sources.get(token.key) ?? []), words]);
      if (!places.has(token.key)) places.set(token.key, at);
    }
  };

  // Used words become spaces of the same length, so places stay true to the sentence.
  const take = (pattern: RegExp, use: (match: RegExpMatchArray) => State) => {
    const match = rest.match(pattern);
    if (!match) return null;
    const at = rest.search(pattern);
    const words = match[0].replace(/^[^\p{L}\p{N}$]+|[^\p{L}\p{N}]+$/gu, "");
    const before = new Set(vocabulary.tokens(draft).map((token) => token.key));
    draft = use(match);
    note(before, words, at);
    rest = rest.replace(pattern, (found) => " ".repeat(found.length));
    return { words, at };
  };

  const finishing: { rule: Rule<Item, State>; words: string; at: number }[] = [];
  for (const rule of vocabulary.rules ?? []) {
    const taken = take(rule.pattern, (match) => (rule.read ? rule.read(draft, match, ctx) : draft));
    if (taken && rule.finish) finishing.push({ rule, ...taken });
  }
  // A name typed twice is read twice, so its second copy is not reported as unused.
  for (const { term, pattern } of patternsOf(vocabulary.terms)) while (take(pattern, () => term.add(draft)));
  for (const { rule, words, at } of finishing) {
    const before = new Set(vocabulary.tokens(draft).map((token) => token.key));
    draft = rule.finish!(draft, ctx);
    note(before, words, at);
  }

  const filler = new Set(vocabulary.filler ?? []);
  const left = rest.split(/[^\p{L}\p{N}'-]+/u).filter((word) => word && !filler.has(word) && !/^\d+$/.test(word));
  const tokens = inSentenceOrder(
    vocabulary.tokens(draft).map((token) => ({ ...token, from: sources.get(token.key) ?? [] })),
    places,
  );
  return { value: draft, tokens, left, places };
}

/** The sentence with misspelt names fixed. A word still being typed (`typing`) is left alone, since it is short, not wrong. */
function fixTypos<Item, State>(vocabulary: Vocabulary<Item, State>, items: readonly Item[], text: string, typing: string | null) {
  const corrections: Correction[] = [];
  const fixed = parse(vocabulary, items, text, vocabulary.empty)
    .left.filter((word) => word !== typing)
    .reduce((sentence, word) => {
      const near = nearestName(vocabulary.terms, word, vocabulary.notTypos);
      if (!near) return sentence;
      corrections.push({ word, name: near.label });
      return sentence.replace(new RegExp(`(^|[^\\p{L}])${escape(word)}(?![\\p{L}])`, "iu"), `$1${near.label}`);
    }, text);
  return { text: fixed, corrections };
}

/**
 * Reads a sentence: "blue suv under 30k" gives Blue, SUV and Under $30k. `context` is what is already set, so words
 * typed after a token read as they would in one sentence. With fixTypos, misspelt names are fixed first.
 */
export function readSentence<Item, State>(
  vocabulary: Vocabulary<Item, State>,
  items: readonly Item[],
  text: string,
  { context = vocabulary.empty, fixTypos: fix = false }: { context?: State; fixTypos?: boolean } = {},
): Reading<State> {
  const { text: sentence, corrections } = fix ? fixTypos(vocabulary, items, text, null) : { text, corrections: [] };
  const { value, tokens, left } = parse(vocabulary, items, sentence, context);
  return { value, tokens, left, corrections, text: sentence };
}

const priced = <Item, State>(vocabulary: Vocabulary<Item, State>, items: readonly Item[], term: Term<State>, state: State): Suggestion<State> => {
  const next = term.add(state);
  const before = new Set(vocabulary.tokens(state).map((token) => token.key));
  const order = vocabulary.tokens(next).filter((token) => !before.has(token.key)).map((token) => token.key);
  const row = { key: term.key, label: term.label, hint: term.hint ?? term.group, count: countOf(vocabulary, items, next), next, order };
  return term.swatch === undefined ? row : { ...row, swatch: term.swatch };
};

function uniqueResults<Item, State>(vocabulary: Vocabulary<Item, State>, rows: Suggestion<State>[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const result = signatureOf(vocabulary.tokens(row.next));
    if (seen.has(result)) return false;
    seen.add(result);
    return true;
  });
}

const changes = <State>(row: Suggestion<State>, state: State) => JSON.stringify(row.next) !== JSON.stringify(state);

function rankOf<State>(term: Term<State>, typed: string) {
  const names = namesOf(term);
  if (names.includes(typed)) return 0;
  if (names.some((name) => name.startsWith(typed))) return 1;
  if (names.some((name) => name.split(/[\s-]+/).some((word) => word.startsWith(typed)))) return 2;
  if (typed.length >= 3 && names.some((name) => name.includes(typed))) return 3;
  return null;
}

// After a make, a half word is likelier one of its models than a second make, which always has more items.
const ownChild = <Item, State>(vocabulary: Vocabulary<Item, State>, term: Term<State>, state: State) =>
  term.parent && vocabulary.tokens(state).some((token) => token.key === term.parent) ? 1 : 0;

/** One row for a reading, named by the tokens it would add, so the row says exactly what picking it does. */
function readingRow<Item, State>(
  vocabulary: Vocabulary<Item, State>,
  items: readonly Item[],
  key: string,
  state: State,
  next: State,
  fixed: boolean,
  left?: string[],
  places: ReadonlyMap<string, number> = new Map(),
): Suggestion<State> | null {
  const before = new Set(vocabulary.tokens(state).map((token) => `${token.key}:${token.label}`));
  const added = inSentenceOrder(
    vocabulary.tokens(next).filter((token) => !before.has(`${token.key}:${token.label}`)),
    places,
  );
  if (!added.length) return null;
  const one = added.length === 1 ? added[0] : undefined;
  return {
    key,
    label: added.map((token) => token.label).join(CHIP_SEPARATOR),
    hint: fixed ? "Did you mean" : one ? (one.hint ?? one.group) : "Add all",
    ...(one?.swatch !== undefined && { swatch: one.swatch }),
    count: countOf(vocabulary, items, next),
    next,
    ...(left?.length ? { left } : {}),
    order: added.map((token) => token.key),
  };
}

// Names the typed words end in the start of. Several words may spell the start of one name, as "mustang mach" does.
function namesStarted<State>(terms: readonly Term<State>[], words: string[]) {
  // No run of words longer than the longest name can start one, so only the last few words are tried.
  const longest = patternsOf(terms)[0]?.length ?? 0;
  let first = words.length;
  while (first > 0 && fold(words.slice(first - 1).join(" ")).length <= longest) first--;
  return terms.flatMap((term) => {
    const at = words.findIndex((_, index) => {
      if (index < first) return false;
      const rank = rankOf(term, fold(words.slice(index).join(" ")));
      return rank !== null && rank <= (index === words.length - 1 ? 2 : 1);
    });
    if (at < 0) return [];
    const tail = words.slice(at).join(" ");
    return [{ term, tail, span: words.length - at, rank: rankOf(term, fold(tail)) ?? 2 }];
  });
}

/** What Enter does with the words as typed: the whole reading, or that reading finished with a name the last word starts. */
function leadRows<Item, State>(vocabulary: Vocabulary<Item, State>, items: readonly Item[], text: string, state: State) {
  const words = /\S$/.test(text) ? text.trim().split(/\s+/) : [];
  const starts = namesStarted(vocabulary.terms, words);
  const half = starts.length ? words[words.length - 1] : null;
  const fixed = fixTypos(vocabulary, items, text, half ? fold(half) : null).text.trim();
  const whole = parse(vocabulary, items, fixed, state);
  const corrected = fixed !== text.trim();
  const reading = readingRow(vocabulary, items, "reading", state, vocabulary.merge(state, whole.value), corrected, whole.left, whole.places);

  // A last word the reading has no use for is still being typed. One it used, like the "car" of "electric car", is finished.
  const skipsHalf = half !== null && fixed.endsWith(half) && whole.left.includes(fold(half));
  if (!skipsHalf) return reading ? [reading] : [];

  const finished = uniqueResults(
    vocabulary,
    starts
      .flatMap(({ term, tail, span, rank }) => {
        if (!fixed.endsWith(tail)) return [];
        const head = fixed.slice(0, -tail.length).trim();
        // A single word that starts a name is already a row of its own.
        if (!head && span === 1) return [];
        const said = parse(vocabulary, items, head, vocabulary.empty).value;
        const saidTokens = vocabulary.tokens(said);
        if (head && !saidTokens.length) return [];
        if (term.parent) {
          const family = vocabulary.terms.find((other) => other.key === term.parent)?.group;
          if (saidTokens.some((token) => token.group === family) && !saidTokens.some((token) => token.key === term.parent)) return [];
        }
        // Read as one sentence, so a word like "cheap" sizes its budget to the finished name.
        const done = parse(vocabulary, items, `${head} ${term.label}`, state);
        const next = vocabulary.merge(state, term.add(done.value));
        const row = readingRow(vocabulary, items, `complete-${term.key}`, state, next, corrected, undefined, done.places);
        return row ? [{ row, span, rank, own: ownChild(vocabulary, term, vocabulary.merge(state, said)) }] : [];
      })
      .sort((a, b) => b.span - a.span || a.rank - b.rank || b.own - a.own || b.row.count - a.row.count)
      .map((entry) => entry.row),
  );
  const live = finished.filter((row) => row.count > 0);
  const completions = live.length ? live.slice(0, COMPLETIONS) : finished.slice(0, 1);
  return [...completions, ...(reading ? [reading] : [])];
}

/** The smallest change to a search that finds nothing which finds something: drop one filter, the newest first, the named thing last. */
function closestRow<Item, State>(vocabulary: Vocabulary<Item, State>, items: readonly Item[], state: State, dead: State): Suggestion<State> | null {
  const tokens = vocabulary.tokens(dead);
  const had = new Set(vocabulary.tokens(state).map((token) => `${token.key}:${token.label}`));
  const now = signatureOf(vocabulary.tokens(state));
  const last = new Set(vocabulary.dropLast ?? []);
  const singles = tokens
    .map((token) => {
      const next = token.clear(dead);
      const softness = had.has(`${token.key}:${token.label}`) ? 2 : last.has(token.group) ? 3 : 1;
      return { next, count: countOf(vocabulary, items, next), softness };
    })
    .filter((fix) => fix.count > 0 && signatureOf(vocabulary.tokens(fix.next)) !== now)
    .sort((a, b) => a.softness - b.softness || b.count - a.count);
  const deadWords = describe(vocabulary, dead);
  const fix =
    singles.find((option) => describe(vocabulary, option.next) !== deadWords) ??
    singles[0] ??
    tokens
      .flatMap((first, index) =>
        tokens.slice(index + 1).map((second) => {
          const next = second.clear(first.clear(dead));
          return { next, count: countOf(vocabulary, items, next) };
        }),
      )
      .filter((option) => option.count > 0)
      .sort((a, b) => b.count - a.count)[0];
  if (!fix) return null;
  const order = vocabulary.tokens(fix.next).map((token) => token.key);
  return { key: "closest", label: describe(vocabulary, fix.next), hint: "Closest", count: fix.count, next: fix.next, order };
}

// A first row that finds nothing hands Enter to the closest search that finds something, and stays right under it.
function withExit<Item, State>(vocabulary: Vocabulary<Item, State>, items: readonly Item[], rows: Suggestion<State>[], state: State) {
  const [first, ...rest] = rows;
  if (!first || first.count !== 0) return rows;
  const set = hasAny(vocabulary, state);
  const { swatch: _swatch, ...plain } = first;
  const exact = { ...plain, label: set ? describe(vocabulary, first.next) : first.label, hint: "No matches yet" };
  const exit = closestRow(vocabulary, items, state, first.next);
  return exit ? [exit, exact, ...rest] : [exact, ...rest];
}

function rowsOf<Item, State>(vocabulary: Vocabulary<Item, State>, items: readonly Item[], facet: Facet<Item, State>, state: State) {
  const rows = facet
    .options(state, items)
    .map((term) => priced(vocabulary, items, term, state))
    .filter((row) => row.count > 0 && changes(row, state));
  return facet.stepped ? rows : rows.sort((a, b) => b.count - a.count);
}

// What is worth asking next. A facet with one answer left, or an answer that keeps every item shown, narrows nothing.
function upNext<Item, State>(vocabulary: Vocabulary<Item, State>, items: readonly Item[], state: State) {
  const groups: SuggestionGroup<State>[] = [];
  const now = countOf(vocabulary, items, state);
  const names = (hasAny(vocabulary, state) ? vocabulary.nextUp : vocabulary.firstUp) ?? [];
  for (const name of names) {
    if (groups.length === 2) break;
    const facet = vocabulary.facets?.find((f) => f.title === name);
    if (!facet || facet.isSet(state)) continue;
    const rows = rowsOf(vocabulary, items, facet, state).filter((row) => row.count < now);
    if (rows.length < 2) continue;
    groups.push({ title: name, rows: rows.slice(0, groups.length ? FACET_ROWS - 1 : FACET_ROWS).map(({ hint: _hint, ...row }) => row) });
  }
  return groups;
}

/** The suggestion rows for what is typed, or the next filters to add while the box is empty. The first row is what Enter takes. */
export function suggest<Item, State>(vocabulary: Vocabulary<Item, State>, items: readonly Item[], text: string, state: State): SuggestionGroup<State>[] {
  const typed = fold(text);
  if (!typed) return upNext(vocabulary, items, state);

  const lead = leadRows(vocabulary, items, text, state);
  const numbers = (vocabulary.numbers?.(typed, state, items) ?? []).map((term) => priced(vocabulary, items, term, state));
  const stop = new Set(vocabulary.stopNames ?? []);
  const direct = (stop.has(typed) ? [] : vocabulary.terms)
    .map((term) => ({ row: priced(vocabulary, items, term, state), rank: rankOf(term, typed), own: ownChild(vocabulary, term, state) }))
    .filter((entry): entry is { row: Suggestion<State>; rank: number; own: number } => entry.rank !== null)
    .sort((a, b) => a.rank - b.rank || b.own - a.own || b.row.count - a.row.count)
    .map((entry) => entry.row);
  const facets = typed.length < 2 ? [] : (vocabulary.facets ?? []).filter((facet) => facet.words.some((word) => word.startsWith(typed)));
  const fromFacets = facets.flatMap((facet) => rowsOf(vocabulary, items, facet, state).slice(0, FACET_ROWS));

  const byKey = new Map([...numbers, ...direct, ...fromFacets].map((row) => [row.key, row]));
  const found = uniqueResults(vocabulary, [...lead, ...byKey.values()].filter((row) => changes(row, state)));
  // A misspelt name of more than one word, which no single word of it is near.
  const near = found.length ? null : nearestName(vocabulary.terms, typed, vocabulary.notTypos);
  const corrected = near ? readingRow(vocabulary, items, `fixed-${near.key}`, state, near.add(state), true) : null;
  const rows = corrected ? [corrected] : found;

  // The reading leads even when it finds nothing, so the way out can stand on top of it.
  const reading = lead[0] ?? numbers[0];
  const live = rows.filter((row) => row.count > 0 || row.key === reading?.key);
  const shown = uniqueResults(vocabulary, withExit(vocabulary, items, live.length ? live : rows, state)).slice(0, MOST_ROWS);
  return shown.length ? [{ rows: shown }] : [];
}

/** A word typed in full becomes a token on the space after it, unless a longer name could still follow. */
export function wholeWord<Item, State>(vocabulary: Vocabulary<Item, State>, items: readonly Item[], text: string, state: State) {
  const typed = fold(text);
  if (!typed) return null;
  const exact = vocabulary.terms.find((term) => namesOf(term).includes(typed));
  const longer = vocabulary.terms.some((term) => namesOf(term).some((name) => name.startsWith(`${typed} `)));
  return exact && !longer ? priced(vocabulary, items, exact, state) : null;
}

/** The rest of a row's label after what is typed, drawn faintly after the caret. */
export function ghostOf<State>(text: string, row?: Suggestion<State>) {
  if (!row || !text || /\s$/.test(text)) return "";
  return fold(row.label).startsWith(fold(text)) ? row.label.slice(text.length) : "";
}

/** Where the typed part sits in a label. */
export function matchIn(label: string, text: string) {
  const typed = fold(text);
  const at = typed ? fold(label).indexOf(typed) : -1;
  return at < 0 ? null : { at, length: typed.length };
}
