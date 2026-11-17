"use client";

import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
} from "react";
import { cn } from "../lib/cn";
import { isRtl, onDirChange, readingKey } from "../lib/direction";
import { formatsFor, resultsLabel, type Formats } from "../lib/format";
import { ChevronDownIcon } from "../ui/icons";
import { Skeleton, SKELETON_FILL, SkeletonText, useLoading } from "../ui/skeleton";
import { StatusFrame, type StateProps } from "../ui/status-frame";
import { TextField } from "../ui/text-field";
import { TextSwap } from "../ui/text-swap";

/**
 * A span of days. { last: 7 } is the last 7 days with today, and moves on as the days pass. { start, end } are fixed
 * days, "YYYY-MM-DD", both included. null is any time.
 */
export type DateRangeValue = { last: number } | { start: string; end: string } | null;

export type DatePreset = { label: string; last: number };

export const DEFAULT_DATE_PRESETS: readonly DatePreset[] = [
  { label: "Today", last: 1 },
  { label: "Last 3 days", last: 3 },
  { label: "Last 7 days", last: 7 },
  { label: "Last 30 days", last: 30 },
];

export type DateRangeProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> &
  Omit<StateProps, "emptyText"> & {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** Today as "YYYY-MM-DD". Default: the visitor's own date, read in the browser, so the server never guesses it. */
  today?: string;
  /** The quick picks between Any time and Custom. */
  presets?: readonly DatePreset[];
  /** Items on one day ("YYYY-MM-DD"): the small number under each date and the count beside each preset. */
  countOf?: (date: string) => number;
  /** Every item, whatever its date: the count beside Any time. */
  total?: number;
  /** Accessible name of the presets and the calendar, e.g. "Listed". */
  label?: string;
  anyLabel?: string;
  customLabel?: string;
  /** Days after today can be picked too. Default false: they show dimmed. */
  allowFuture?: boolean;
  /** The first day of the week: 0 is Sunday, 1 Monday, 6 Saturday. Default: the locale's (Sunday in en-US, Monday in de-DE). */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  formatCount?: (n: number) => string;
  /** Screen-reader words for a count: "6 results". */
  countLabel?: (n: number) => string;
  /**
   * Month and weekday names, the first day of the week, the order of typed dates ("3.11." in de-DE) and the numbers
   * follow it, e.g. "de-DE". Default "en-US". The words of the presets stay as given.
   */
  locale?: string;
};

const DAY = 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");
const parts = (iso: string) => [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))] as const;
const timeOf = (iso: string) => Date.UTC(...parts(iso));
const isoOf = (time: number) => {
  const d = new Date(time);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

export const addDays = (iso: string, days: number) => isoOf(timeOf(iso) + days * DAY);
/** The day of iso in month, clamped to the month's last day. */
const sameDayIn = (month: string, iso: string) => {
  const [year, m] = parts(month);
  return `${month.slice(0, 7)}-${pad(Math.min(parts(iso)[2], daysIn(year, m)))}`;
};
/** Whole days from one date to another: 1 from today to tomorrow. */
export const daysBetween = (from: string, to: string) => Math.round((timeOf(to) - timeOf(from)) / DAY);

const firstOfMonth = (iso: string) => `${iso.slice(0, 7)}-01`;
const addMonths = (iso: string, months: number) => {
  const [y, m, d] = parts(iso);
  const first = new Date(Date.UTC(y, m + months, 1));
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();
  return isoOf(Date.UTC(year, month, Math.min(d, daysIn(year, month))));
};
const minIso = (a: string, b: string) => (a < b ? a : b);
const maxIso = (a: string, b: string) => (a > b ? a : b);

/** The fixed days a value covers, given today, or null for any time. */
export function resolveDateRange(value: DateRangeValue, today: string): { start: string; end: string } | null {
  if (!value) return null;
  if ("last" in value) return { start: addDays(today, -(Math.max(1, value.last) - 1)), end: today };
  return { start: minIso(value.start, value.end), end: maxIso(value.start, value.end) };
}

const yearOf = (iso: string) => Number(iso.slice(0, 4));
// "19. Okt." reads as "19 Okt": a dot that ends an abbreviation or a day number goes.
const noDots = (text: string) => text.replace(/\.(?=\s|$)/g, "");
// US English keeps its hand-built dates; every other locale, English ones too, takes its own from Intl.
const english = (f: Formats) => f.locale === "en" || f.locale === "en-US";
const weekdayOf = (iso: string) => new Date(timeOf(iso)).getUTCDay();

// "Nov 3", with the year only when it is not this year's.
const shortDay = (f: Formats, iso: string, today: string | null) =>
  noDots(f.day(iso, { month: "short", day: "numeric", ...(today && yearOf(today) === yearOf(iso) ? {} : { year: "numeric" }) }));
const spokenDay = (f: Formats, iso: string) => f.day(iso, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
// A day cell's name: the grid is named by its month and year, and the day number comes last in every locale, so the
// count read after it follows it, as on screen ("Sonntag, November 1, 6 cars").
const cellDay = (f: Formats, iso: string) =>
  english(f)
    ? f.day(iso, { weekday: "long", month: "long", day: "numeric" })
    : `${f.weekday(weekdayOf(iso))}, ${f.month(parts(iso)[1])} ${f.plain(parts(iso)[2])}`;
// English keeps its three-letter months and two-letter weekdays; other locales take their own short forms.
const monthShort = (f: Formats, m: number) => (english(f) ? f.month(m).slice(0, 3) : f.month(m, "short"));
const weekdayHead = (f: Formats, i: number) => {
  if (english(f)) return f.weekday(i).slice(0, 2);
  const short = f.weekday(i, "short");
  return short.length > 3 ? new Intl.DateTimeFormat(f.locale, { weekday: "narrow", timeZone: "UTC" }).format(Date.UTC(2021, 0, 3 + i)) : short;
};

function describe(f: Formats, value: DateRangeValue, presets: readonly DatePreset[], today: string | null, long: boolean) {
  if (!value) return null;
  if ("last" in value) return presets.find((p) => p.last === value.last)?.label ?? (value.last === 1 ? "Today" : `Last ${f.number(value.last)} days`);
  const start = minIso(value.start, value.end);
  const end = maxIso(value.start, value.end);
  const month = long ? "long" : "short";
  const thisYear = (iso: string) => !!today && yearOf(today) === yearOf(iso);
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  if (!english(f)) {
    const day = (iso: string, withYear: boolean) => noDots(f.day(iso, { month, day: "numeric", ...(withYear ? { year: "numeric" } : {}) }));
    if (start === end) return day(start, !thisYear(start));
    // Both ends whole: a bare last day or year after a day-first date reads as unfinished ("3. Nov. to 9").
    if (yearOf(start) !== yearOf(end) || !thisYear(end)) return `${day(start, true)} to ${day(end, true)}`;
    return `${day(start, false)} to ${day(end, false)}`;
  }
  const name = (iso: string) => (long ? f.month(parts(iso)[1]) : monthShort(f, parts(iso)[1]));
  const day = (iso: string) => `${name(iso)} ${f.plain(parts(iso)[2])}`;
  const tail = (iso: string) => (thisYear(iso) ? "" : `, ${f.plain(yearOf(iso))}`);
  if (start === end) return `${day(start)}${tail(start)}`;
  if (yearOf(start) !== yearOf(end)) return `${day(start)}, ${f.plain(yearOf(start))} to ${day(end)}, ${f.plain(yearOf(end))}`;
  return `${day(start)} to ${sameMonth ? f.plain(parts(end)[2]) : day(end)}${tail(end)}`;
}

/**
 * The value in words: a preset's label, "Nov 3", "Nov 3 to 9" or "Oct 28 to Nov 3". The year shows only when it is
 * not today's. Dates follow the locale ("3. Nov." in de-DE); the joining words stay English.
 */
export const formatDateRange = (
  value: DateRangeValue,
  presets: readonly DatePreset[] = DEFAULT_DATE_PRESETS,
  today: string | null = null,
  locale?: string,
) => describe(formatsFor(locale), value, presets, today, false);

const ENGLISH_MONTHS = Array.from({ length: 12 }, (_, m) => formatsFor().month(m).toLowerCase());

/** Days written before months in the locale's numeric dates, as "3.11." in de-DE. */
const dayFirst = (locale: string) => {
  const order = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric", timeZone: "UTC" }).formatToParts(0).map((p) => p.type);
  return order.indexOf("day") < order.indexOf("month");
};

/**
 * A date written as the locale writes it ("11月3日", "3 בנוב׳ 2025"), found by writing the days out: with no year, the
 * latest such day up to today; with one, a day of that year as the locale's calendar counts it.
 */
function shownDay(f: Formats, typed: string, today: string, norm: (text: string) => string) {
  const year = typed.match(/\d{4}/)?.[0];
  let from = today;
  let days = 366;
  if (year) {
    // 2569 in th-TH is 2026.
    const offset = Number(norm(f.day(today, { year: "numeric" })).match(/\d+/)?.[0] ?? yearOf(today)) - yearOf(today);
    const gregorian = Number(year) - offset;
    if (gregorian < 1000 || gregorian > 9998) return null;
    // Another calendar's year can start in any month, so its neighbours are searched too.
    from = `${offset ? gregorian + 1 : gregorian}-12-31`;
    days = offset ? 3 * 366 : 366;
  }
  const forms = (["short", "long"] as const).map((month): Intl.DateTimeFormatOptions => ({ month, day: "numeric", ...(year ? { year: "numeric" } : {}) }));
  for (let i = 0; i < days; i++) {
    const iso = addDays(from, -i);
    if (forms.some((o) => norm(f.day(iso, o)) === typed)) return iso;
  }
  return null;
}

/**
 * Reads a typed date: "Nov 3", "November 3, 2026", "3 Nov", "11/3", "11/3/26", "2026-11-03", "today" or "yesterday".
 * With a locale it also reads that locale's month names and digits, and takes numeric dates in its order: "3.11." and
 * "3/11/26" are 3 November in de-DE. It reads back any date as the fields show it ("11月3日" in ja-JP). With no year it
 * takes the latest such day that is not after today. Returns null for anything else.
 */
export function parseDate(text: string, today: string, locale?: string): string | null {
  const f = formatsFor(locale);
  const months = english(f) ? ENGLISH_MONTHS : Array.from({ length: 12 }, (_, m) => f.month(m).toLocaleLowerCase(f.locale));
  const shortMonths = english(f) ? [] : Array.from({ length: 12 }, (_, m) => f.month(m, "short").toLocaleLowerCase(f.locale).replace(/\./g, ""));
  const swap = !english(f) && dayFirst(f.locale);
  const norm = (text: string) => {
    let typed = text;
    for (let i = 0; i < 10; i++) typed = typed.split(f.digits[i]).join(String(i));
    return typed
      .trim()
      .toLocaleLowerCase(f.locale)
      .replace(/(\d)(st|nd|rd|th)\b/g, "$1")
      .replace(/[.,\u060c]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };
  const t = norm(text);
  if (!t) return null;
  if (t === "today") return today;
  if (t === "yesterday") return addDays(today, -1);
  let y: number | null = null;
  let m: number | null = null;
  let d: number | null = null;
  let match: RegExpMatchArray | null;
  const monthAt = (word: string) => {
    if (word.length < 3 && !shortMonths.includes(word)) return -1;
    const at = months.findIndex((name) => name.startsWith(word));
    if (at >= 0) return at;
    const short = shortMonths.indexOf(word);
    return short >= 0 ? short : ENGLISH_MONTHS.findIndex((name) => word.length >= 3 && name.startsWith(word));
  };
  if ((match = t.match(/^(\d{4})[-/ ](\d{1,2})[-/ ](\d{1,2})$/))) [y, m, d] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  else if ((match = t.match(swap ? /^(\d{1,2})[/ -](\d{1,2})(?:[/ -](\d{2}|\d{4}))?$/ : /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?$/))) {
    [m, d] = swap ? [Number(match[2]) - 1, Number(match[1])] : [Number(match[1]) - 1, Number(match[2])];
    if (match[3]) y = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  } else if ((match = t.match(/^(\p{L}+) (\d{1,2})(?: (\d{4}))?$/u)) && monthAt(match[1]) >= 0) {
    [m, d] = [monthAt(match[1]), Number(match[2])];
    if (match[3]) y = Number(match[3]);
  } else if ((match = t.match(/^(\d{1,2}) (\p{L}+)(?: (\d{4}))?$/u)) && monthAt(match[2]) >= 0) {
    [m, d] = [monthAt(match[2]), Number(match[1])];
    if (match[3]) y = Number(match[3]);
  } else return shownDay(f, t, today, norm);
  if (m === null || d === null || m < 0 || m > 11 || d < 1) return null;
  const guess = y === null;
  let year = y ?? Number(today.slice(0, 4));
  if (guess && d <= daysIn(year, m) && `${year}-${pad(m + 1)}-${pad(d)}` > today) year -= 1;
  if (d > daysIn(year, m)) return null;
  return `${year}-${pad(m + 1)}-${pad(d)}`;
}

const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
// Checked each minute, so a page left open past midnight moves on to the new day.
const subscribeToDay = (onChange: () => void) => {
  const timer = setInterval(onChange, 60_000);
  return () => clearInterval(timer);
};
const noDay = () => null;

/** Today as "YYYY-MM-DD" in the visitor's time zone, or null during the server render and hydration, so the two always match. */
export const useToday = () => useSyncExternalStore(subscribeToDay, localToday, noDay);


const SMOOTH = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const FOCUS_RING = "outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[var(--fu-accent-soft,#8FAAFF)]";
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type Band = { start: string; end: string } | null;
type Growth = { band: Band; before: Band; toward: "start" | "end" };

/**
 * Presets (Any time, Today, Last 3, 7 and 30 days, Custom) over a one-month calendar and typed From and To fields.
 * Picking a day starts a range; the band follows the pointer day by day until a second pick ends it. Each day can carry
 * its count. The calendar is a keyboard grid: arrows by day and week, Page Up and Page Down by month, with Shift by year.
 * Right to left, the week runs from the right, previous and next swap sides, and Left and Right follow the screen.
 */
export function DateRange({
  value,
  onChange,
  today: todayProp,
  presets = DEFAULT_DATE_PRESETS,
  countOf,
  total,
  label = "Dates",
  anyLabel = "Any time",
  customLabel = "Custom",
  allowFuture = false,
  weekStartsOn: weekStartsOnProp,
  formatCount: formatCountProp,
  countLabel: countLabelProp,
  locale,
  status = "ready",
  onRetry,
  errorText = "Couldn't load the counts.",
  disabled = false,
  className,
  ...props
}: DateRangeProps) {
  // Its own status, or the loading frame of an item around it, such as a block's card.
  const loading = useLoading().loading || status === "loading";
  const f = formatsFor(locale);
  const weekStartsOn = weekStartsOnProp ?? f.firstDay;
  const formatCount = formatCountProp ?? f.number;
  const countLabel = countLabelProp ?? ((n: number) => resultsLabel(n, locale));
  const id = useId();
  const browserToday = useToday();
  const today = todayProp ?? browserToday;

  // Custom pressed while the value still matches a preset: it stays checked until the value changes.
  const [customFor, setCustomFor] = useState<DateRangeValue | undefined>(undefined);
  const [pending, setPending] = useState<{ anchor: string; before: DateRangeValue } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState<string | null>(null);
  const [focusDay, setFocusDay] = useState<string | null>(null);
  const [mode, setMode] = useState<"days" | "months">("days");
  const [said, setSaid] = useState("");
  const grid = useRef<HTMLDivElement>(null);
  const months = useRef<HTMLDivElement>(null);
  const focusAfterRender = useRef<"day" | "month" | null>(null);

  const range = today ? resolveDateRange(value, today) : null;
  const shownMonth = viewMonth ?? (today ? firstOfMonth(range?.end ?? today) : null);
  // The grid's one tab stop. When the shown month moved without it (a year step, the month view), the same day of the
  // shown month takes it, so the grid never loses its tab stop.
  const wanted = focusDay ?? range?.end ?? today;
  const focused = wanted && shownMonth && wanted.slice(0, 7) !== shownMonth.slice(0, 7) ? sameDayIn(shownMonth, wanted) : wanted;
  const pickable = (iso: string) => allowFuture || !today || iso <= today;

  // While a range is half picked, the band runs from its first day to the day under the pointer or the keys.
  const band: Band = pending ? { start: minIso(pending.anchor, preview ?? pending.anchor), end: maxIso(pending.anchor, preview ?? pending.anchor) } : range;
  const bandKey = band ? `${band.start}/${band.end}` : "";
  const [growth, setGrowth] = useState<Growth>({ band, before: band, toward: "end" });
  const nextToward = useRef<"start" | "end">("end");
  if ((growth.band ? `${growth.band.start}/${growth.band.end}` : "") !== bandKey) {
    setGrowth({ band, before: growth.band, toward: nextToward.current });
  }

  // Counts per day are read once per countOf and kept, so a long typed range or a pointer sweep does not count again.
  const daily = useMemo(() => new Map<string, number>(), [countOf]);
  const dayCount = (day: string) => {
    let n = daily.get(day);
    if (n === undefined) {
      n = countOf ? countOf(day) : 0;
      daily.set(day, n);
    }
    return n;
  };
  const sum = (r: Band) => {
    if (!countOf || !r) return null;
    let all = 0;
    for (let day = r.start; day <= r.end; day = addDays(day, 1)) all += dayCount(day);
    return all;
  };

  // The month the calendar showed before, kept on screen while it slides out.
  const [leaving, setLeaving] = useState<{ month: string; dir: 1 | -1; key: number } | null>(null);
  const showMonth = (month: string) => {
    if (!shownMonth || month === shownMonth) return;
    if (!reducedMotion()) setLeaving({ month: shownMonth, dir: month > shownMonth ? 1 : -1, key: (leaving?.key ?? 0) + 1 });
    setViewMonth(month);
  };

  const commit = (next: DateRangeValue) => {
    onChange(next);
    const r = next && today ? resolveDateRange(next, today) : null;
    const total = sum(r);
    const text = describe(f, next, presets, today, true) ?? anyLabel;
    setSaid(total === null || !next ? text : `${text}, ${countLabel(total)}`);
  };

  const pickDay = (iso: string) => {
    if (!pickable(iso)) return;
    setFocusDay(iso);
    if (iso.slice(0, 7) !== shownMonth?.slice(0, 7)) showMonth(firstOfMonth(iso));
    if (pending) {
      const start = minIso(pending.anchor, iso);
      const end = maxIso(pending.anchor, iso);
      nextToward.current = iso >= pending.anchor ? "end" : "start";
      setPending(null);
      setPreview(null);
      commit({ start, end });
      return;
    }
    nextToward.current = "end";
    setPending({ anchor: iso, before: value });
    setPreview(null);
    onChange({ start: iso, end: iso });
    setSaid(`${spokenDay(f, iso)}. Now pick the last day, or press Escape.`);
  };

  const dropPending = () => {
    if (!pending) return false;
    nextToward.current = "end";
    onChange(pending.before);
    setPending(null);
    setPreview(null);
    setSaid("Range dropped.");
    return true;
  };

  // Preset choices: Any time, each preset, then Custom.
  const custom = customFor === value || (value !== null && !("last" in value && presets.some((p) => p.last === value.last)));
  const choices = [
    { key: "any", label: anyLabel, value: null as DateRangeValue, on: !custom && value === null, count: (total ?? null) as number | null },
    ...presets.map((p) => ({
      key: `last-${p.last}`,
      label: p.label,
      value: { last: p.last } as DateRangeValue,
      on: !custom && value !== null && "last" in value && value.last === p.last,
      count: today ? sum(resolveDateRange({ last: p.last }, today)) : null,
    })),
    { key: "custom", label: customLabel, value: null as DateRangeValue, on: custom, count: custom && range && !pending ? sum(range) : null },
  ];

  const choose = (index: number, viaPointer: boolean) => {
    const choice = choices[index];
    setPending(null);
    setPreview(null);
    if (choice.key === "custom") {
      setCustomFor(value);
      if (viaPointer) {
        focusAfterRender.current = "day";
        setMode("days");
      }
      return;
    }
    setCustomFor(undefined);
    nextToward.current = "end";
    if (choice.value && today) {
      showMonth(firstOfMonth(today));
      setFocusDay(today);
    }
    commit(choice.value);
  };

  // The checked preset's wash is measured onto it; until measured, the checked button paints its own.
  const presetButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const checkedIndex = choices.findIndex((c) => c.on);
  const [wash, setWash] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [washPlaced, setWashPlaced] = useState(false);
  useLayoutEffect(() => {
    const button = presetButtons.current[checkedIndex];
    if (!button) return;
    const measure = () => setWash({ left: button.offsetLeft, top: button.offsetTop, width: button.offsetWidth, height: button.offsetHeight });
    measure();
    const frame = requestAnimationFrame(() => setWashPlaced(true));
    const observer = new ResizeObserver(measure);
    observer.observe(button);
    if (button.parentElement) observer.observe(button.parentElement);
    const stop = onDirChange(measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      stop();
    };
  }, [checkedIndex]);

  const onPresetKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = Math.max(0, presetButtons.current.findIndex((b) => b === document.activeElement));
    const n = choices.length;
    const next = { ArrowRight: from + 1, ArrowDown: from + 1, ArrowLeft: from - 1, ArrowUp: from - 1, Home: 0, End: n - 1 }[readingKey(event.key, event.currentTarget)];
    if (next === undefined) return;
    event.preventDefault();
    const index = (next + n) % n;
    presetButtons.current[index]?.focus();
    choose(index, false);
  };

  // Focus follows the keys into a new month once it has rendered.
  useLayoutEffect(() => {
    const target = focusAfterRender.current;
    if (!target) return;
    focusAfterRender.current = null;
    const root = target === "day" ? grid.current : months.current;
    root?.querySelector<HTMLElement>('[tabindex="0"]')?.focus({ preventScroll: true });
  });

  const moveFocus = (iso: string) => {
    setFocusDay(iso);
    if (pending) setPreview(iso);
    if (shownMonth && iso.slice(0, 7) !== shownMonth.slice(0, 7)) showMonth(firstOfMonth(iso));
    focusAfterRender.current = "day";
  };

  const onGridKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!focused || disabled) return;
    const weekday = (weekdayOf(focused) - weekStartsOn + 7) % 7;
    const key = readingKey(event.key, event.currentTarget);
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -weekday),
      End: () => addDays(focused, 6 - weekday),
      PageUp: () => addMonths(focused, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, event.shiftKey ? 12 : 1),
    };
    if (moves[key]) {
      event.preventDefault();
      moveFocus(moves[key]());
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pickDay(focused);
    } else if (event.key === "Escape" && dropPending()) {
      event.stopPropagation();
    }
  };

  const step = (by: number) => {
    if (!shownMonth) return;
    if (mode === "months") {
      setViewMonth(addMonths(shownMonth, by * 12));
      return;
    }
    showMonth(addMonths(shownMonth, by));
    if (focused) setFocusDay(addMonths(focused, by));
  };

  // Day cells: the band segment under each day grows or shrinks one day after another, from the end that stayed put,
  // counted within the month on screen so days out of view never hold the sweep up.
  const timingIn = (first: string, last: string) => {
    const clip = (b: Band) => (b && b.end >= first && b.start <= last ? { start: maxIso(b.start, first), end: minIso(b.end, last) } : null);
    const now = clip(growth.band);
    const before = clip(growth.before);
    const toward = growth.toward;
    const order = (day: string) => {
      const inNow = !!now && day >= now.start && day <= now.end;
      const inBefore = !!before && day >= before.start && day <= before.end;
      if (now && before) {
        if (inNow && !inBefore) return day < before.start ? daysBetween(day, before.start) : daysBetween(before.end, day);
        if (inBefore && !inNow) return day < now.start ? daysBetween(before.start, day) : daysBetween(day, before.end);
        // A day that becomes an end as the band shrinks onto it changes last.
        if (day === now.start && before.start < now.start) return daysBetween(before.start, now.start);
        if (day === now.end && before.end > now.end) return daysBetween(now.end, before.end);
        return 0;
      }
      if (now && inNow) return toward === "end" ? daysBetween(day, now.end) : daysBetween(now.start, day);
      if (before && inBefore) return toward === "end" ? daysBetween(before.start, day) : daysBetween(day, before.end);
      return 0;
    };
    const changed =
      now && before
        ? Math.abs(daysBetween(before.start, now.start)) + Math.abs(daysBetween(before.end, now.end))
        : now
          ? daysBetween(now.start, now.end)
          : before
            ? daysBetween(before.start, before.end)
            : 0;
    // Each segment runs while the one before it finishes, so the band sweeps on without gaps and slows as it lands.
    const slots = changed + 1;
    const sweep = Math.min(440, Math.max(150, slots * 36));
    const landing = (t: number) => 1 - Math.pow(1 - Math.min(1, t), 2.2);
    return (day: string) => {
      const k = order(day);
      const from = landing(k / slots);
      return { delay: Math.round(sweep * from), duration: Math.max(16, Math.round(sweep * (landing((k + 1) / slots) - from))) };
    };
  };

  const weekdays = Array.from({ length: 7 }, (_, i) => (i + weekStartsOn) % 7);
  const weeksOf = (month: string) => {
    const [y, m] = parts(month);
    const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() - weekStartsOn + 7) % 7;
    const total = daysIn(y, m);
    return Array.from({ length: Math.ceil((lead + total) / 7) }, (_, w) =>
      Array.from({ length: 7 }, (_, c) => {
        const d = w * 7 + c - lead + 1;
        return d >= 1 && d <= total ? `${month.slice(0, 8)}${pad(d)}` : null;
      }),
    );
  };

  const renderGrid = (month: string, live: boolean) => {
    const [year, monthIndex] = parts(month);
    const last = `${month.slice(0, 8)}${pad(daysIn(year, monthIndex))}`;
    const timingOf = timingIn(month, last);
    return weeksOf(month).map((week, w) => (
      // Keyed by month, so a new month mounts fresh instead of animating the old days' bands away.
      <div key={`${month}-${w}`} role={live ? "row" : undefined} className="grid grid-cols-7">
        {week.map((day, c) => {
          if (!day) return <div key={c} role={live ? "gridcell" : undefined} className="h-10 pointer-coarse:h-11" />;
          const n = Number(day.slice(8, 10));
          const isToday = day === today;
          const can = pickable(day);
          // While loading, a day's count is a placeholder and its number keeps the plain colour.
          const count = countOf && can && !loading ? dayCount(day) : null;
          const countLoading = !!countOf && can && loading;
          const inBand = !!band && day >= band.start && day <= band.end;
          const isStart = !!band && day === band.start;
          const isEnd = !!band && day === band.end;
          const single = isStart && isEnd;
          const isEdge = isStart || isEnd;
          const isPreviewEnd = !!pending && !!preview && preview !== pending.anchor && day === preview;
          const selected = !!range && day >= range.start && day <= range.end;
          const timing = timingOf(day);
          const before = !band || day < band.start;
          // The band is square where it wraps to the next week or runs into another month; only its own ends are round.
          const roundStart = isStart;
          const roundEnd = isEnd;
          return (
            <div
              key={c}
              role={live ? "gridcell" : undefined}
              tabIndex={live ? (day === focused && !disabled ? 0 : -1) : undefined}
              aria-selected={live ? selected : undefined}
              aria-disabled={live && !can ? true : undefined}
              aria-current={live && isToday ? "date" : undefined}
              aria-label={live ? `${cellDay(f, day)}${count !== null ? `, ${countLabel(count)}` : ""}` : undefined}
              data-day={day}
              onClick={live ? () => pickDay(day) : undefined}
              onPointerEnter={live && pending && can ? () => setPreview(day) : undefined}
              onFocus={live ? () => setFocusDay(day) : undefined}
              className={cn(
                "group/day relative flex h-10 items-center justify-center outline-none pointer-coarse:h-11",
                can ? "cursor-pointer" : "cursor-default",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-0 bg-[var(--fu-selected,#1F2747)] pointer-coarse:inset-y-0.5",
                  "transition-[clip-path,left,right,border-radius] ease-linear motion-reduce:transition-none",
                  roundStart ? "rounded-s-[20px]" : "rounded-s-none",
                  roundEnd ? "rounded-e-[20px]" : "rounded-e-none",
                  // Out of the band, a segment is clipped to nothing at the band's side, so it grows in from there.
                  inBand && !single
                    ? "[clip-path:inset(0_0_0_0)]"
                    : before
                      ? "[clip-path:inset(0_0_0_100%)] rtl:[clip-path:inset(0_100%_0_0)]"
                      : "[clip-path:inset(0_100%_0_0)] rtl:[clip-path:inset(0_0_0_100%)]",
                )}
                style={{
                  // Neighbouring segments overlap by a pixel, so no seam shows between days.
                  insetInlineStart: inBand && isStart && !single ? "50%" : -0.5,
                  insetInlineEnd: inBand && isEnd && !single ? "50%" : -0.5,
                  transitionDelay: `${timing.delay}ms`,
                  transitionDuration: `${timing.duration}ms`,
                }}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "relative flex size-10 flex-col items-center justify-center rounded-full",
                  "transition-[color,background-color,box-shadow,scale] duration-[180ms] motion-reduce:transition-none",
                  SMOOTH,
                  isEdge && !isPreviewEnd
                    ? "bg-[var(--fu-accent,#3B57E6)] text-[var(--fu-on-accent,#FFFFFF)]"
                    : isPreviewEnd
                      ? "text-[var(--fu-accent-pale,#D1DDFF)] shadow-[inset_0_0_0_1.5px_var(--fu-accent-soft,#8FAAFF)]"
                      : inBand
                        ? "text-[var(--fu-accent-pale,#D1DDFF)]"
                        : can
                          ? count === 0
                            ? "text-[var(--fu-dim,#929292)]"
                            : "text-[var(--fu-text,#F8F5F1)]"
                          : "text-[var(--fu-line,#404040)]",
                  isToday && !isEdge && !isPreviewEnd && "shadow-[inset_0_0_0_1px_var(--fu-accent-soft,#8FAAFF)]",
                  // Forced colours drop the band's fill, so the picked days take the system highlight instead.
                  (inBand || isEdge) && "forced-colors:bg-[Highlight] forced-colors:text-[HighlightText] forced-colors:[forced-color-adjust:none]",
                  can && !isEdge && !inBand && "group-hover/day:bg-[var(--fu-item-hover,#2A2A2A)]",
                  can && "group-active/day:scale-[0.94] group-active/day:duration-75",
                  live && "group-focus-visible/day:outline-2 group-focus-visible/day:outline-offset-1 group-focus-visible/day:outline-solid group-focus-visible/day:outline-[var(--fu-accent-soft,#8FAAFF)]",
                )}
                // The day's colours change as the band reaches it; a hover never waits.
                style={{ transitionDelay: isEdge ? `${timing.delay}ms` : `${timing.delay}ms, 0ms, 0ms, 0ms` }}
              >
                <span className="text-[14px] font-medium leading-4 tabular-nums">{f.plain(n)}</span>{" "}
                {/* Every date keeps the count's line, so the numbers sit on one baseline whether a day has items or not. */}
                {countOf && (
                  <span
                    className={cn(
                      "mt-px h-3 text-[10px] leading-3 tabular-nums transition-colors duration-[180ms] motion-reduce:transition-none",
                      isEdge && !isPreviewEnd ? "text-[var(--fu-on-accent-mute,#E1E7FF)]" : inBand ? "text-[var(--fu-accent-soft,#8FAAFF)]" : "text-[var(--fu-dim,#929292)]",
                    )}
                    style={{ transitionDelay: `${timing.delay}ms` }}
                  >
                    {countLoading ? (
                      <Skeleton className="mx-auto mt-[3px] h-1.5 w-3.5 rounded-full" />
                    ) : count ? (
                      // Not a placeholder here: SkeletonText only fades the count in once when it arrives.
                      <SkeletonText loading={false}>{formatCount(count)}</SkeletonText>
                    ) : (
                      ""
                    )}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    ));
  };

  // The month crossfade: the old grid leaves 8px toward where it went, through a 2px blur, as the new one arrives.
  const leavingRef = useRef<HTMLDivElement>(null);
  const arrivingRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!leaving) return;
    // The months move the way the arrows point: in RTL the next month comes in from the left.
    const shift = 8 * leaving.dir * (isRtl(arrivingRef.current) ? -1 : 1);
    const timing = { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };
    const out = leavingRef.current?.animate(
      [
        { opacity: 1, transform: "translateX(0)", filter: "blur(0)" },
        { opacity: 0, transform: `translateX(${-shift}px)`, filter: "blur(2px)" },
      ],
      { ...timing, fill: "forwards" },
    );
    const into = arrivingRef.current?.animate(
      [
        { opacity: 0, transform: `translateX(${shift}px)`, filter: "blur(2px)" },
        { opacity: 1, transform: "translateX(0)", filter: "blur(0)" },
      ],
      { ...timing, delay: 40, fill: "backwards" },
    );
    const key = leaving.key;
    const done = () => setLeaving((current) => (current?.key === key ? null : current));
    if (into) into.onfinish = done;
    else done();
    return () => {
      out?.cancel();
      into?.cancel();
    };
  }, [leaving]);

  const monthLabelId = `${id}-month`;
  const viewYear = shownMonth ? Number(shownMonth.slice(0, 4)) : null;
  const heading = shownMonth ? (mode === "months" ? f.plain(viewYear ?? 0) : f.day(shownMonth, { month: "long", year: "numeric" })) : "";

  // The twelve-month view: one cell per month of the shown year, with its count.
  const [monthFocus, setMonthFocus] = useState<number | null>(null);
  const focusedMonth = monthFocus ?? (shownMonth ? parts(shownMonth)[1] : 0);
  const monthCount = (m: number) => {
    if (!countOf || viewYear === null || !today) return null;
    const first = `${viewYear}-${pad(m + 1)}-01`;
    const lastDay = `${viewYear}-${pad(m + 1)}-${pad(daysIn(viewYear, m))}`;
    if (!allowFuture && first > today) return null;
    return sum({ start: first, end: allowFuture ? lastDay : minIso(lastDay, today) });
  };
  const openMonth = (m: number) => {
    if (viewYear === null) return;
    const target = `${viewYear}-${pad(m + 1)}-01`;
    if (!allowFuture && today && target > today) return;
    setMode("days");
    setViewMonth(target);
    const day = focused ? Math.min(Number(focused.slice(8, 10)), daysIn(viewYear, m)) : 1;
    const next = `${target.slice(0, 8)}${pad(day)}`;
    setFocusDay(allowFuture || !today ? next : minIso(next, today));
    focusAfterRender.current = "day";
  };
  const onMonthKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
    const key = readingKey(event.key, event.currentTarget);
    if (moves[key] !== undefined) {
      event.preventDefault();
      const next = focusedMonth + moves[key];
      if (next < 0 || next > 11) {
        if (shownMonth) setViewMonth(addMonths(shownMonth, next < 0 ? -12 : 12));
        setMonthFocus((next + 12) % 12);
      } else setMonthFocus(next);
      focusAfterRender.current = "month";
    } else if (event.key === "Escape") {
      event.stopPropagation();
      setMode("days");
      focusAfterRender.current = "day";
    }
  };

  const fieldsDisabled = !today;

  const root = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setWide(node.offsetWidth >= 500));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // On a narrow card the calendar comes first and the presets sit under it; on a wide one the presets are a rail on the
  // left. The DOM follows, so the tab order matches what is seen.
  const presetsBlock = (
          <div
            key="presets"
            role="radiogroup"
            aria-label={label}
            onKeyDown={onPresetKeys}
            className={cn(
              "relative grid grid-cols-2 gap-1 self-start border-t border-[var(--fu-card-border,#2A2A2A)] pt-3",
              "@min-[500px]:col-start-1 @min-[500px]:row-start-1 @min-[500px]:grid-cols-1 @min-[500px]:border-t-0 @min-[500px]:pt-0",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute rounded-[9px] bg-[var(--fu-selected,#1F2747)]",
                washPlaced && "transition-[opacity] duration-[360ms]",
                SMOOTH,
                "motion-reduce:transition-none",
                (checkedIndex < 0 || !wash) && "opacity-0",
              )}
              style={wash ?? undefined}
            />
            {choices.map((choice, i) => (
              <button
                key={choice.key}
                ref={(node) => {
                  presetButtons.current[i] = node;
                }}
                type="button"
                role="radio"
                aria-checked={choice.on}
                tabIndex={i === Math.max(0, checkedIndex) ? 0 : -1}
                onClick={() => choose(i, true)}
                className={cn(
                  "group/preset relative flex min-h-9 min-w-0 cursor-pointer items-center gap-1.5 rounded-[9px] px-3 py-2 text-start text-[14px] leading-5 font-medium pointer-coarse:min-h-11 @min-[500px]:justify-between @min-[500px]:gap-3",
                  "transition-[color,background-color,scale] duration-200 active:scale-[0.98] active:duration-75 motion-reduce:transition-none",
                  SMOOTH,
                  FOCUS_RING,
                  choice.on
                    ? cn("text-[var(--fu-accent-pale,#D1DDFF)]", !wash && "bg-[var(--fu-selected,#1F2747)]")
                    : "text-[var(--fu-mute,#BDBDBD)] hover:bg-[var(--fu-item-hover,#2A2A2A)] hover:text-[var(--fu-text,#F8F5F1)]",
                )}
              >
                {/* A long label wraps; the count stays beside its first line. */}
                <span className="min-w-0 [overflow-wrap:anywhere]">{choice.label}</span>
                {choice.count !== null && (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "inline-flex h-5 min-w-[22px] shrink-0 items-center justify-center rounded-[6px] px-1.5 text-[12px] leading-4 font-medium tabular-nums transition-[background-color,color] duration-200 motion-reduce:transition-none",
                        loading
                          ? SKELETON_FILL
                          : choice.on
                            ? "bg-[var(--fu-accent,#3B57E6)] text-[var(--fu-on-accent,#FFFFFF)]"
                            : "bg-[var(--fu-pill,rgb(255_255_255/0.1))] text-[var(--fu-pill-text,#C8C8C8)]",
                      )}
                    >
                      {loading ? (
                        <span className="invisible">{formatCount(choice.count)}</span>
                      ) : (
                        <SkeletonText loading={false}>
                          <TextSwap>{formatCount(choice.count)}</TextSwap>
                        </SkeletonText>
                      )}
                    </span>
                    <span className="sr-only">, {countLabel(choice.count)}</span>
                  </>
                )}
              </button>
            ))}
          </div>
  );
  const calendarBlock = (
          <div
            key="calendar"
            className="min-w-0 @min-[500px]:col-start-2 @min-[500px]:row-start-1 @min-[500px]:border-s @min-[500px]:border-[var(--fu-card-border,#2A2A2A)] @min-[500px]:ps-6"
          >
            <div className="flex h-9 items-center justify-between gap-2">
              <button
                type="button"
                id={monthLabelId}
                aria-expanded={mode === "months"}
                aria-label={heading ? `${heading}, ${mode === "months" ? "back to days" : "choose a month"}` : "Choose a month"}
                onClick={() => {
                  setMonthFocus(null);
                  setMode(mode === "days" ? "months" : "days");
                  focusAfterRender.current = mode === "days" ? "month" : "day";
                }}
                className={cn(
                  "relative -ms-2 flex h-9 min-w-0 cursor-pointer items-center gap-1 rounded-[10px] px-2 text-[15px] leading-5 font-semibold text-[var(--fu-text,#F8F5F1)]",
                  "pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1 pointer-coarse:after:content-['']",
                  "transition-colors duration-200 hover:bg-[var(--fu-item-hover,#2A2A2A)]",
                  FOCUS_RING,
                )}
              >
                <TextSwap>{heading || " "}</TextSwap>
                <ChevronDownIcon
                  size={16}
                  className={cn("shrink-0 text-[var(--fu-mute,#BDBDBD)] transition-[rotate] duration-[480ms] motion-reduce:transition-none", SMOOTH, mode === "months" && "rotate-180")}
                />
              </button>
              <div className="flex shrink-0 gap-1.5">
                {([-1, 1] as const).map((by) => (
                  <button
                    key={by}
                    type="button"
                    aria-label={mode === "months" ? (by < 0 ? "Previous year" : "Next year") : by < 0 ? "Previous month" : "Next month"}
                    onClick={() => step(by)}
                    className={cn(
                      "grid size-9 cursor-pointer place-items-center rounded-[10px] border border-[var(--fu-line,#404040)] text-[var(--fu-mute,#BDBDBD)]",
                      "transition-[border-color,background-color,color,scale] duration-200 hover:border-[var(--fu-control-border,#737373)] hover:bg-[var(--fu-item-hover,#2A2A2A)] hover:text-[var(--fu-text,#F8F5F1)]",
                      "active:scale-[0.94] active:duration-75 motion-reduce:transition-none",
                      "pointer-coarse:relative pointer-coarse:after:absolute pointer-coarse:after:-inset-1 pointer-coarse:after:content-['']",
                      FOCUS_RING,
                    )}
                  >
                    <ChevronDownIcon size={18} className={by < 0 ? "rotate-90 rtl:-rotate-90" : "-rotate-90 rtl:rotate-90"} />
                  </button>
                ))}
              </div>
            </div>
  
            <div className="relative mt-2">
              <div
                inert={mode !== "days"}
                className={cn(
                  "transition-[opacity,filter,translate] duration-150 ease-in-out motion-reduce:transition-none",
                  mode === "days" ? "opacity-100" : "pointer-events-none -translate-y-1 opacity-0 blur-[2px]",
                )}
              >
                <div aria-hidden="true" className="grid h-8 grid-cols-7 items-center text-center text-[12px] leading-4 text-[var(--fu-dim,#929292)]">
                  {weekdays.map((i) => (
                    <abbr key={i} title={f.weekday(i)} className="no-underline">
                      {weekdayHead(f, i)}
                    </abbr>
                  ))}
                </div>
                {/* The grid's height follows the month's weeks, so a four-week February does not leave a gap. */}
                <div
                  className={cn(
                    "relative h-[calc(var(--weeks)*40px)] overflow-hidden pointer-coarse:h-[calc(var(--weeks)*44px)]",
                    "transition-[height] duration-[220ms] motion-reduce:transition-none",
                    SMOOTH,
                  )}
                  style={{ "--weeks": shownMonth ? weeksOf(shownMonth).length : 5 } as CSSProperties}
                >
                  <div
                    ref={(node) => {
                      grid.current = node;
                      arrivingRef.current = node;
                    }}
                    role="grid"
                    aria-labelledby={monthLabelId}
                    aria-multiselectable="true"
                    aria-disabled={disabled || undefined}
                    onKeyDown={onGridKeys}
                    onPointerLeave={() => pending && setPreview(null)}
                    className={cn("transition-opacity duration-[480ms] motion-reduce:transition-none", SMOOTH, !shownMonth && "opacity-0")}
                  >
                    {shownMonth && renderGrid(shownMonth, true)}
                  </div>
                  {leaving && (
                    <div ref={leavingRef} key={leaving.key} inert aria-hidden="true" className="pointer-events-none absolute inset-0">
                      {renderGrid(leaving.month, false)}
                    </div>
                  )}
                </div>
              </div>
  
              <div
                ref={months}
                role="group"
                aria-label={viewYear !== null ? `Months of ${f.plain(viewYear)}` : "Months"}
                inert={mode !== "months"}
                onKeyDown={onMonthKeys}
                className={cn(
                  "absolute inset-0 grid grid-cols-3 grid-rows-4 gap-1 py-2",
                  "transition-[opacity,filter,translate] duration-150 ease-in-out motion-reduce:transition-none",
                  mode === "months" ? "opacity-100" : "pointer-events-none translate-y-1 opacity-0 blur-[2px]",
                )}
              >
                {Array.from({ length: 12 }, (_, m) => monthShort(f, m)).map((name, m) => {
                  const first = viewYear !== null ? `${viewYear}-${pad(m + 1)}-01` : "";
                  const lastDay = viewYear !== null ? `${viewYear}-${pad(m + 1)}-${pad(daysIn(viewYear, m))}` : "";
                  const can = !!first && (allowFuture || !today || first <= today);
                  const covered = !!range && !!first && range.start <= lastDay && range.end >= first;
                  const isShown = shownMonth === first;
                  const holdsToday = !!today && today.slice(0, 7) === first.slice(0, 7);
                  const count = mode === "months" && !loading ? monthCount(m) : null;
                  return (
                    <button
                      key={name}
                      type="button"
                      tabIndex={m === focusedMonth ? 0 : -1}
                      aria-current={isShown || undefined}
                      aria-disabled={!can || undefined}
                      /* Named as shown: short month, then its count. The group around it names the year. */
                      aria-label={`${name}${count !== null ? `, ${countLabel(count)}` : ""}`}
                      onClick={() => openMonth(m)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openMonth(m);
                        }
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-[10px] text-[14px] leading-4 font-medium",
                        "transition-[background-color,color,box-shadow,scale] duration-200 motion-reduce:transition-none",
                        SMOOTH,
                        FOCUS_RING,
                        can ? "cursor-pointer active:scale-[0.97] active:duration-75" : "cursor-default text-[var(--fu-line,#404040)]",
                        can && (covered ? "bg-[var(--fu-selected,#1F2747)] text-[var(--fu-accent-pale,#D1DDFF)]" : "text-[var(--fu-text,#F8F5F1)] hover:bg-[var(--fu-item-hover,#2A2A2A)]"),
                        holdsToday && "shadow-[inset_0_0_0_1px_var(--fu-accent-soft,#8FAAFF)]",
                      )}
                    >
                      {name}{" "}
                      {countOf && (
                        <span className={cn("mt-1 h-3 text-[10px] leading-3 font-normal tabular-nums", covered ? "text-[var(--fu-accent-soft,#8FAAFF)]" : "text-[var(--fu-dim,#929292)]")}>
                          {count ? formatCount(count) : ""}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
  
            <div className="mt-3 grid grid-cols-2 gap-2">
              <DateField
                label={`${label}: from`}
                placeholder="From"
                shown={range ? shortDay(f, range.start, today) : ""}
                disabled={fieldsDisabled}
                read={(text) => (today ? parseDate(text, today, locale) : null)}
                onCommit={(day) => {
                  if (!today) return;
                  setPending(null);
                  setPreview(null);
                  if (day === null) return commit(null);
                  const start = allowFuture ? day : minIso(day, today);
                  const end = range ? maxIso(range.end, start) : allowFuture ? start : today;
                  nextToward.current = "end";
                  showMonth(firstOfMonth(start));
                  setFocusDay(start);
                  commit({ start, end });
                }}
              />
              <DateField
                label={`${label}: to`}
                placeholder="To"
                shown={range ? shortDay(f, range.end, today) : ""}
                disabled={fieldsDisabled}
                read={(text) => (today ? parseDate(text, today, locale) : null)}
                onCommit={(day) => {
                  if (!today) return;
                  setPending(null);
                  setPreview(null);
                  if (day === null) return commit(null);
                  const end = allowFuture ? day : minIso(day, today);
                  const start = range ? minIso(range.start, end) : end;
                  nextToward.current = "start";
                  showMonth(firstOfMonth(end));
                  setFocusDay(end);
                  commit({ start, end });
                }}
              />
            </div>
          </div>
  );

  return (
    <div ref={root} className={cn("@container", className)} {...props}>
      <StatusFrame status={status} onRetry={onRetry} errorText={errorText} disabled={disabled}>
        <div className="grid gap-4 @min-[500px]:grid-cols-[168px_minmax(0,1fr)] @min-[500px]:gap-6">
          {wide ? [presetsBlock, calendarBlock] : [calendarBlock, presetsBlock]}
        </div>
      </StatusFrame>
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
    </div>
  );
}

type DateFieldProps = {
  label: string;
  placeholder: string;
  shown: string;
  disabled: boolean;
  read: (text: string) => string | null;
  onCommit: (day: string | null) => void;
};

// Shows the day; while focused it holds what is typed, and commits on Enter or leaving. Text it cannot read puts the day back.
function DateField({ label, placeholder, shown, disabled, read, onCommit }: DateFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    if (!draft.trim()) return onCommit(null);
    const day = read(draft);
    if (day !== null) onCommit(day);
  };
  return (
    <TextField
      label={label}
      placeholder={placeholder}
      autoComplete="off"
      enterKeyHint="done"
      spellCheck={false}
      value={draft ?? shown}
      readOnly={disabled}
      onChange={setDraft}
      onClear={() => {
        setDraft(null);
        onCommit(null);
      }}
      clearLabel={`Clear ${label.replace(/:.*/, "").toLowerCase()} dates`}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        } else if (event.key === "Escape" && draft !== null) {
          event.stopPropagation();
          setDraft(null);
        }
      }}
      className="pe-2"
      inputClassName="tabular-nums"
    />
  );
}

