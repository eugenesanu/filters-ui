"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { countOf, type Token, type Vocabulary } from "../lib/sentence";
import { CountPill } from "../ui/count-pill";
import { CheckIcon, HistoryIcon, StarIcon, XIcon } from "../ui/icons";
import { SentenceSearch, type OwnRow, type OwnRowProps, type SentenceSearchProps } from "./sentence-search";

/** A search kept by the page: in Recent, or in Saved with a name. */
export type SavedSearch<State> = { id: string; value: State; name?: string };

export type RecentSearchesProps<Item, State> = Omit<SentenceSearchProps<Item, State>, "emptyRows" | "open" | "onOpenChange"> & {
  /** Newest first. A search that is also saved shows in Saved only. */
  recent: readonly SavedSearch<State>[];
  saved: readonly SavedSearch<State>[];
  /** A search worth keeping: called when the field loses focus with filters set, and with the old search when the box is cleared. */
  onSearch: (value: State) => void;
  /** "Save this search", or the star on a recent row. `name` is read from its tokens: "Blue SUV under $30k". */
  onSave: (value: State, name: string) => void;
  /** The cross on a row, or Delete while it is highlighted. */
  onForget: (id: string) => void;
  /** How many recent searches show. */
  recentLimit?: number;
};

const SMOOTH = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const defaultCountLabel = (n: number) => (n === 1 ? "1 result" : `${new Intl.NumberFormat("en-US").format(n)} results`);
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const newId = () => Math.random().toString(36).slice(2, 10);

/** One string per search, whatever order its filters were added in. "" for a search with nothing set. */
export const signatureOf = <Item, State>(vocabulary: Vocabulary<Item, State>, value: State) =>
  vocabulary
    .tokens(value)
    .map((token) => `${token.key}:${token.label}`)
    .sort()
    .join("|");

/** Puts a search at the top of a recent list, once, keeping at most `limit`. A search with nothing set is skipped. */
export function remember<Item, State>(vocabulary: Vocabulary<Item, State>, list: SavedSearch<State>[], value: State, limit = 6) {
  const key = signatureOf(vocabulary, value);
  if (!key) return list;
  const same = list.find((entry) => signatureOf(vocabulary, entry.value) === key);
  if (same && list[0] === same) return list;
  return [{ id: same?.id ?? newId(), value }, ...list.filter((entry) => entry !== same)].slice(0, limit);
}

const PHRASE = /^(Under|Over|From|Up to|At least|At most|Less|More|Between|With|Without|Not|No) /;

/** A name read from a search's tokens: "Blue SUV under $30k". */
export const nameOf = <State,>(tokens: readonly Token<State>[]) =>
  tokens.map((token, i) => (i > 0 && PHRASE.test(token.label) ? token.label[0].toLowerCase() + token.label.slice(1) : token.label)).join(" ");

const wordsOf = <State,>(tokens: readonly Token<State>[]) => tokens.map((token) => token.label).join(" · ");

function Glyph({ children, tone = "dim" }: { children: ReactNode; tone?: "dim" | "accent" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-[9px] transition-[background-color,color] duration-200 motion-reduce:transition-none",
        SMOOTH,
        tone === "accent"
          ? "bg-[var(--fu-card,#1F1F1F)] text-[var(--fu-accent-soft,#8FAAFF)] group-aria-selected/row:bg-[var(--fu-selected,#1F2747)]"
          : "text-[var(--fu-dim,#8C8C8C)] group-aria-selected/row:text-[var(--fu-mute,#BDBDBD)]",
      )}
    >
      {children}
    </span>
  );
}

/**
 * A small press target inside a row, for the pointer only: the keys reach the same action through the row. A mouse
 * over it shows its tip above it (below near the top of the window), on the page's top layer, so neither the list's
 * scroll area nor the folded actions clip it.
 */
function RowAction({ tip, onPress, children }: { tip: string; onPress: () => void; children: ReactNode }) {
  const bubble = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // A removed row takes its open tip with it: the browser closes a popover that leaves the page.
  useEffect(() => () => clearTimeout(timer.current), []);

  const show = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const node = bubble.current;
    if (event.pointerType === "touch" || !node) return;
    clearTimeout(timer.current);
    if (!node.matches(":popover-open")) {
      try {
        node.showPopover();
      } catch {
        return;
      }
    }
    const box = event.currentTarget.getBoundingClientRect();
    const below = box.top < 40;
    node.style.left = `${box.left + box.width / 2}px`;
    node.style.top = `${below ? box.bottom + 6 : box.top - 6}px`;
    node.dataset.side = below ? "below" : "above";
    // Read the start position before the shown state, so the tip rises in rather than appearing.
    node.getBoundingClientRect();
    node.dataset.shown = "";
  };

  const hide = () => {
    const node = bubble.current;
    if (!node) return;
    delete node.dataset.shown;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (node.matches(":popover-open")) node.hidePopover();
    }, 150);
  };

  return (
    <span
      aria-hidden="true"
      onPointerEnter={show}
      onPointerLeave={hide}
      onClick={(event) => {
        event.stopPropagation();
        hide();
        onPress();
      }}
      className={cn(
        "group/act relative grid size-7 shrink-0 cursor-pointer place-items-center rounded-[8px] text-[var(--fu-dim,#8C8C8C)]",
        "transition-[background-color,color] duration-150 motion-reduce:transition-none",
        "hover:bg-[var(--fu-hover,#333333)] hover:text-[var(--fu-text,#F8F5F1)]",
        "pointer-coarse:after:absolute pointer-coarse:after:-inset-2 pointer-coarse:after:content-['']",
      )}
    >
      {children}
      <span
        ref={bubble}
        popover="manual"
        className={cn(
          "pointer-events-none fixed inset-auto m-0 -translate-x-1/2 overflow-visible rounded-[8px] border-0 px-2 py-1 whitespace-nowrap",
          "bg-[var(--fu-text,#F8F5F1)] text-[12px] leading-4 font-medium text-[var(--fu-surface-1,#171717)]",
          "opacity-0 transition-[opacity,translate] duration-150 ease-in-out motion-reduce:transition-none data-shown:opacity-100",
          "data-[side=above]:translate-y-[calc(-100%+4px)] data-[side=above]:data-shown:-translate-y-full",
          "data-[side=below]:-translate-y-1 data-[side=below]:data-shown:translate-y-0",
        )}
      >
        {tip}
      </span>
    </span>
  );
}

/** The row's actions, folded away until the row is hovered or highlighted, so the counts keep one column at rest. */
function RowActions({ children, width }: { children: ReactNode; width: "one" | "two" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-end overflow-hidden opacity-0 blur-[2px]",
        "w-0 transition-[width,opacity,filter] duration-200 motion-reduce:transition-none",
        SMOOTH,
        width === "one"
          ? "group-hover/row:w-8 group-aria-selected/row:w-8 pointer-coarse:w-8"
          : "group-hover/row:w-[60px] group-aria-selected/row:w-[60px] pointer-coarse:w-[60px]",
        "group-hover/row:opacity-100 group-hover/row:blur-none group-aria-selected/row:opacity-100 group-aria-selected/row:blur-none pointer-coarse:opacity-100 pointer-coarse:blur-none",
      )}
    >
      {children}
    </span>
  );
}

/** A forgotten row, drawn once more where it was while it blurs away; the rows under it glide up over it. */
function Leaving({ top, height, onDone, children }: { top: number; height: number; onDone: () => void; children: ReactNode }) {
  const node = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  useLayoutEffect(() => {
    const fade = node.current?.animate(
      [
        { opacity: 1, filter: "blur(0)", scale: "1" },
        { opacity: 0, filter: "blur(4px)", scale: "0.98" },
      ],
      { duration: 220, easing: EASE, fill: "forwards" },
    );
    if (!fade) return done.current();
    fade.onfinish = () => done.current();
    return () => fade.cancel();
  }, []);
  return (
    <div
      ref={node}
      aria-hidden="true"
      style={{ top, height }}
      className="pointer-events-none absolute inset-x-1.5 flex items-center gap-3 rounded-[12px] pr-3 pl-2"
    >
      {children}
    </div>
  );
}

const TITLE = "px-3 pt-2 pb-1 text-[13px] leading-[18px] text-[var(--fu-mute,#BDBDBD)]";
const EMPTY = "px-3 pb-2 text-[14px] leading-5 text-[var(--fu-dim,#8C8C8C)]";

/**
 * The sentence search with your searches under it. While the box is empty and nothing is set, the list shows Saved and
 * Recent searches; highlight one and its filters show faintly in the box, with its count at the foot. Once something is
 * set, "Save this search" leads the suggestions. Keeping the lists is up to the page: pass them in and change them in
 * onSearch, onSave and onForget.
 */
export function RecentSearches<Item, State>({
  vocabulary,
  items,
  value,
  onChange,
  recent,
  saved,
  onSearch,
  onSave,
  onForget,
  recentLimit = 4,
  defaultOpen = false,
  formatCount,
  countLabel = defaultCountLabel,
  className,
  onBlur,
  ...props
}: RecentSearchesProps<Item, State>) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const drawn = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(defaultOpen);
  const [said, setSaid] = useState("");
  const [leaving, setLeaving] = useState<{ key: string; top: number; height: number; body: ReactNode } | null>(null);

  const tokens = vocabulary.tokens(value);
  const sig = signatureOf(vocabulary, value);
  const savedSigs = new Set(saved.map((entry) => signatureOf(vocabulary, entry.value)));
  const savedNow = sig ? saved.find((entry) => signatureOf(vocabulary, entry.value) === sig) : undefined;
  const recents = recent
    .filter((entry) => {
      const key = signatureOf(vocabulary, entry.value);
      return key && !savedSigs.has(key);
    })
    .slice(0, recentLimit);
  const pill = (n: number) => <CountPill count={n} {...(formatCount && { format: formatCount })} />;
  const rowId = (kind: "saved" | "recent", entryId: string) => `${id}-${kind}-${entryId}`;
  const saveId = `${id}-save`;

  // The last search handed to onSearch, so leaving the field twice does not report it twice.
  const reported = useRef("");
  const previous = useRef({ sig, value });
  const report = useRef(onSearch);
  useLayoutEffect(() => {
    report.current = onSearch;
  });
  useEffect(() => {
    const was = previous.current;
    if (was.sig && !sig && was.sig !== reported.current) {
      reported.current = was.sig;
      report.current(was.value);
    }
    previous.current = { sig, value };
  }, [sig, value]);

  // Opened on first render, the list has no focus to lose, so a press outside closes it. Not in an inert still picture,
  // such as a preview, where a press elsewhere on the page must leave it as drawn.
  useEffect(() => {
    if (!open || root.current?.closest("[inert]")) return;
    const onDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  // A row that moves (one above it forgotten, or a recent search saved) glides from where it was; a new one rises in.
  const places = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const next = new Map<string, number>();
    const moving = !reducedMotion();
    for (const node of drawn.current?.querySelectorAll<HTMLElement>("[data-flip]") ?? []) {
      const key = node.dataset.flip!;
      const top = node.offsetTop;
      next.set(key, top);
      const was = places.current.get(key);
      if (!moving) continue;
      if (was !== undefined && was !== top) {
        node.animate([{ translate: `0 ${was - top}px` }, { translate: "0 0" }], { duration: 380, easing: EASE });
      } else if (was === undefined && places.current.size > 0) {
        node.animate(
          [
            { opacity: 0, filter: "blur(2px)", translate: "0 4px" },
            { opacity: 1, filter: "blur(0)", translate: "0 0" },
          ],
          { duration: 300, easing: EASE },
        );
      }
    }
    places.current = next;
  });

  const savedBody = (entry: SavedSearch<State>) => {
    const own = vocabulary.tokens(entry.value);
    return (
      <>
        <Glyph tone="accent">
          <StarIcon size={16} className="fill-current" />
        </Glyph>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-5 font-medium text-[var(--fu-text,#F8F5F1)]">{entry.name ?? nameOf(own)}</span>
          <span className="block truncate text-[13px] leading-[18px] text-[var(--fu-mute,#BDBDBD)]">{wordsOf(own)}</span>
        </span>
      </>
    );
  };

  const recentBody = (entry: SavedSearch<State>) => (
    <>
      <Glyph>
        <HistoryIcon size={16} />
      </Glyph>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {vocabulary.tokens(entry.value).map((token) => (
          <span
            key={`${token.key}-${token.label}`}
            className={cn(
              "block h-6 max-w-full min-w-0 truncate rounded-full bg-[var(--fu-pill,rgb(255_255_255/0.1))] px-2.5 text-[13px] leading-6 whitespace-nowrap text-[var(--fu-text,#F8F5F1)]",
              "transition-[background-color,color] duration-200 motion-reduce:transition-none",
              SMOOTH,
              "group-aria-selected/row:bg-[var(--fu-selected,#1F2747)] group-aria-selected/row:text-[var(--fu-accent-pale,#D1DDFF)]",
            )}
          >
            {token.label}
          </span>
        ))}
      </span>
    </>
  );

  const countCell = (entry: SavedSearch<State>) => (
    <span aria-hidden="true" className="flex shrink-0 items-center pl-2">
      {pill(countOf(vocabulary, items, entry.value))}
    </span>
  );

  const forget = (entry: SavedSearch<State>, kind: "saved" | "recent") => {
    const node = document.getElementById(rowId(kind, entry.id));
    if (node && !reducedMotion()) {
      const body = (
        <>
          {kind === "saved" ? savedBody(entry) : recentBody(entry)}
          {countCell(entry)}
        </>
      );
      setLeaving({ key: `${entry.id}-${Date.now()}`, top: node.offsetTop, height: node.offsetHeight, body });
    }
    setSaid(`Removed ${entry.name ?? wordsOf(vocabulary.tokens(entry.value))}`);
    onForget(entry.id);
  };

  const save = (target: State) => {
    const name = nameOf(vocabulary.tokens(target));
    setSaid(`Saved as ${name}`);
    onSave(target, name);
  };

  const pickRow = (entry: SavedSearch<State>, kind: "saved" | "recent"): OwnRow<State> => ({
    id: rowId(kind, entry.id),
    onSelect: () => onChange(entry.value),
    closes: true,
    onRemove: () => forget(entry, kind),
    preview: entry.value,
  });

  const spoken = (entry: SavedSearch<State>) => {
    const own = vocabulary.tokens(entry.value).map((token) => token.label).join(", ");
    return `${entry.name ? `${entry.name}: ` : ""}${own}, ${countLabel(countOf(vocabulary, items, entry.value))}`;
  };

  let rows: OwnRow<State>[];
  let render: (option: (id: string) => OwnRowProps) => ReactNode;

  if (!sig) {
    rows = [...saved.map((entry) => pickRow(entry, "saved")), ...recents.map((entry) => pickRow(entry, "recent"))];
    render = (option) => (
      <div ref={drawn}>
        {leaving && (
          <Leaving key={leaving.key} top={leaving.top} height={leaving.height} onDone={() => setLeaving((now) => (now?.key === leaving.key ? null : now))}>
            {leaving.body}
          </Leaving>
        )}
        <div role="group" aria-label="Saved searches, Delete removes one">
          <p data-flip="saved-title" className={TITLE}>
            Saved
          </p>
          {saved.length === 0 && (
            <p data-flip="saved-empty" className={EMPTY}>
              Save a search to keep it here.
            </p>
          )}
          {saved.map((entry) => (
            <div
              key={entry.id}
              {...option(rowId("saved", entry.id))}
              data-flip={signatureOf(vocabulary, entry.value)}
              aria-label={spoken(entry)}
              className="group/row relative flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[12px] py-2 pr-3 pl-2"
            >
              {savedBody(entry)}
              <span className="flex shrink-0 items-center">
                <RowActions width="one">
                  <RowAction tip="Remove" onPress={() => forget(entry, "saved")}>
                    <XIcon size={16} />
                  </RowAction>
                </RowActions>
                {countCell(entry)}
              </span>
            </div>
          ))}
        </div>
        <div role="group" aria-label="Recent searches, Delete removes one">
          <p data-flip="recent-title" className={cn(TITLE, "mt-1")}>
            Recent
          </p>
          {recents.length === 0 && (
            <p data-flip="recent-empty" className={EMPTY}>
              Your searches show here.
            </p>
          )}
          {recents.map((entry) => (
            <div
              key={entry.id}
              {...option(rowId("recent", entry.id))}
              data-flip={signatureOf(vocabulary, entry.value)}
              aria-label={spoken(entry)}
              className="group/row relative flex min-h-11 cursor-pointer items-center gap-3 rounded-[12px] py-1.5 pr-3 pl-2"
            >
              {recentBody(entry)}
              <span className="flex shrink-0 items-center">
                <RowActions width="two">
                  <RowAction tip="Save" onPress={() => save(entry.value)}>
                    <StarIcon size={16} className="fill-transparent transition-[fill] duration-150 group-hover/act:fill-current motion-reduce:transition-none" />
                  </RowAction>
                  <RowAction tip="Remove" onPress={() => forget(entry, "recent")}>
                    <XIcon size={16} />
                  </RowAction>
                </RowActions>
                {countCell(entry)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    rows = savedNow ? [] : [{ id: saveId, onSelect: () => save(value) }];
    render = (option) => (
      <div ref={drawn} className="mb-1.5 border-b border-[var(--fu-line,#404040)] pb-1.5">
        {savedNow ? (
          <div className="flex min-h-[52px] items-center gap-3 py-2 pr-3 pl-2">
            <Glyph tone="accent">
              <CheckIcon
                size={16}
                strokeWidth={2.5}
                className={cn(
                  // The path is about 23 units long; it draws from the short leg up as the line appears.
                  "[&_path]:[stroke-dasharray:23] [&_path]:[stroke-dashoffset:0] [&_path]:transition-[stroke-dashoffset] [&_path]:duration-500 motion-reduce:[&_path]:transition-none",
                  "[&_path]:ease-[cubic-bezier(0.22,1,0.36,1)] starting:[&_path]:[stroke-dashoffset:-23]",
                )}
              />
            </Glyph>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] leading-5 text-[var(--fu-mute,#BDBDBD)]">
                Saved as <span className="font-medium text-[var(--fu-text,#F8F5F1)]">{savedNow.name ?? nameOf(tokens)}</span>
              </span>
              <span className="block truncate text-[13px] leading-[18px] text-[var(--fu-dim,#8C8C8C)]">{wordsOf(tokens)}</span>
            </span>
          </div>
        ) : (
          <div
            {...option(saveId)}
            aria-label={`Save this search: ${tokens.map((token) => token.label).join(", ")}`}
            className="group/row relative flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[12px] py-2 pr-3 pl-2"
          >
            <Glyph tone="accent">
              <StarIcon size={16} />
            </Glyph>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] leading-5 font-medium text-[var(--fu-accent-soft,#8FAAFF)]">Save this search</span>
              <span className="block truncate text-[13px] leading-[18px] text-[var(--fu-mute,#BDBDBD)]">{wordsOf(tokens)}</span>
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={root}
      className={cn("w-full", className)}
      onBlur={(event) => {
        onBlur?.(event);
        if (root.current?.contains(event.relatedTarget) || !sig || sig === reported.current) return;
        reported.current = sig;
        onSearch(value);
      }}
    >
      <SentenceSearch
        vocabulary={vocabulary}
        items={items}
        value={value}
        onChange={onChange}
        open={open}
        onOpenChange={setOpen}
        countLabel={countLabel}
        {...(formatCount && { formatCount })}
        emptyRows={{
          rows,
          render,
          replace: !sig,
          ...(!sig && {
            keys: [
              { key: "↑↓", label: "Move" },
              { key: "Enter", label: "Search" },
              { key: "Del", label: "Remove" },
            ],
          }),
        }}
        {...props}
      />
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
    </div>
  );
}
