// Numbers, prices, distances, percents and dates for one locale, built on Intl with no dependency. Pass any BCP 47
// tag ("de-DE", "ar-EG"); a tag Intl cannot read falls back to en-US instead of throwing. The default is en-US, never
// the browser's own locale, so the server and the browser always print the same text. UI words stay English.

export const DEFAULT_LOCALE = "en-US";

export type FormatOptions = {
  /** ISO 4217 code for price and priceShort. Default "USD". */
  currency?: string;
  /** The unit of distance. Default "kilometer". */
  unit?: "kilometer" | "mile";
};

/** Every formatter takes the value alone, so any of them can be passed straight to a format prop. */
export type Formats = {
  /** The locale these formatters use, after any fallback. */
  locale: string;
  /** "1,234" in en-US, "1.234" in de-DE, up to three decimals. */
  number: (value: number) => string;
  /** A number with no group marks, such as a year: "2026", or "٢٠٢٦" in ar-EG. */
  plain: (value: number) => string;
  /** "45k", "1.2M". */
  compact: (value: number) => string;
  /** "$45,000" in en-US, "45.000 $" in de-DE: whole units of the currency. */
  price: (value: number) => string;
  /** "$45k" and "$97.5k" from a thousand up, "$950" below. */
  priceShort: (value: number) => string;
  /** "50,000 km" or "31,069 mi". */
  distance: (value: number) => string;
  /** A percentage given in percent, up to two decimals: 6.5 gives "6.5%" in en-US and "6,5 %" in de-DE. */
  percent: (value: number) => string;
  /** A day given as "YYYY-MM-DD", in words. Read in UTC, so it never shifts by a time zone. */
  day: (iso: string, options: Intl.DateTimeFormatOptions) => string;
  /** The name of a month, 0 for January. */
  month: (index: number, style?: "long" | "short") => string;
  /** The name of a weekday, 0 for Sunday. */
  weekday: (index: number, style?: "long" | "short") => string;
  /** The day weeks start on: 0 for Sunday, 1 for Monday, 6 for Saturday. */
  firstDay: 0 | 1 | 5 | 6;
  /** The locale's digits, 0 to 9: "0123456789", or "٠١٢٣٤٥٦٧٨٩" in ar-EG. */
  digits: string;
  /**
   * Reads a number typed the locale's way, with an optional k or m: "45,000", "$45k" and "1.2m" in en-US, "45.000"
   * and "1,2m" in de-DE. A unit such as "km" is not a suffix. Returns null when the text holds no number.
   */
  readNumber: (text: string) => number | null;
};

/**
 * A locale Intl has data for, or en-US. A well-formed tag with no data ("zz") would otherwise print in the
 * runtime's own locale, which differs between server and browser.
 */
export function safeLocale(locale?: string): string {
  if (!locale) return DEFAULT_LOCALE;
  try {
    const [tag] = Intl.getCanonicalLocales(locale);
    if (!tag) return DEFAULT_LOCALE;
    if (!Intl.NumberFormat.supportedLocalesOf(tag).length || !Intl.DateTimeFormat.supportedLocalesOf(tag).length) return DEFAULT_LOCALE;
    return tag;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** A currency code Intl can read, or USD. */
function safeCurrency(currency?: string): string {
  if (!currency) return "USD";
  try {
    new Intl.NumberFormat(DEFAULT_LOCALE, { style: "currency", currency });
    return currency.toUpperCase();
  } catch {
    return "USD";
  }
}

// Where weeks start, by region, as CLDR has it; every other region starts on Monday. A table rather than
// Intl.Locale weekInfo, which not every browser has, so the server and every browser agree.
const SUNDAY = new Set(
  "AG AS BD BR BS BT BW BZ CA CN CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW".split(" "),
);
const SATURDAY = new Set("AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY".split(" "));

function firstDayOf(locale: string): 0 | 1 | 5 | 6 {
  let region: string | undefined;
  try {
    region = new Intl.Locale(locale).maximize().region;
  } catch {}
  if (!region) return 0;
  if (region === "MV") return 5;
  if (SATURDAY.has(region)) return 6;
  return SUNDAY.has(region) ? 0 : 1;
}

const cache = new Map<string, Formats>();

/** Formatters for one locale. Cheap to call on every render: each locale and option set is built once. */
export function formatsFor(locale?: string, options: FormatOptions = {}): Formats {
  const tag = safeLocale(locale);
  const currency = safeCurrency(options.currency);
  const unit = options.unit === "mile" ? "mile" : "kilometer";
  const key = `${tag}|${currency}|${unit}`;
  const known = cache.get(key);
  if (known) return known;

  const nf = (o: Intl.NumberFormatOptions) => new Intl.NumberFormat(tag, o);
  const dates = new Map<string, Intl.DateTimeFormat>();
  const df = (o: Intl.DateTimeFormatOptions) => {
    const id = JSON.stringify(o);
    let format = dates.get(id);
    if (!format) {
      format = new Intl.DateTimeFormat(tag, { ...o, timeZone: "UTC" });
      dates.set(id, format);
    }
    return format;
  };
  // English writes thousands with a small k, as the filters always have.
  const english = tag === "en" || tag.startsWith("en-");
  const smallK = (text: string) => (english ? text.replace(/K\b/, "k") : text);

  const number = nf({});
  const plain = nf({ useGrouping: false, maximumFractionDigits: 20 });
  const compact = nf({ notation: "compact", maximumFractionDigits: 1 });
  const price = nf({ style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const priceShort = nf({ style: "currency", currency, notation: "compact", minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const distance = nf({ style: "unit", unit, maximumFractionDigits: 0 });
  const percent = nf({ style: "percent", maximumFractionDigits: 2 });

  const digits = plain.format(1234567890).replace(/^(.*)(.)$/, "$2$1");
  const parts = number.formatToParts(12345.6);
  const group = parts.find((p) => p.type === "group")?.value ?? ",";
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";

  const formats: Formats = {
    locale: tag,
    number: (value) => number.format(value),
    plain: (value) => plain.format(value),
    compact: (value) => smallK(compact.format(value)),
    price: (value) => price.format(value),
    priceShort: (value) => (Math.abs(value) >= 1000 ? smallK(priceShort.format(value)) : price.format(value)),
    distance: (value) => distance.format(value),
    percent: (value) => percent.format(value / 100),
    day: (iso, o) => df(o).format(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))),
    month: (index, style = "long") => df({ month: style }).format(Date.UTC(2021, index, 1)),
    // 3 January 2021 was a Sunday.
    weekday: (index, style = "long") => df({ weekday: style }).format(Date.UTC(2021, 0, 3 + index)),
    firstDay: firstDayOf(tag),
    digits,
    readNumber: (text) => {
      let t = text.replace(/[\s  ‎‏؜]/g, "");
      for (let i = 0; i < 10; i++) t = t.split(digits[i]).join(String(i));
      if (!/\s/.test(group)) t = t.split(group).join("");
      if (decimal !== ".") t = t.split(decimal).join(".");
      const match = t.match(/(\d*\.?\d+)([km](?![a-z]))?/i);
      if (!match) return null;
      const scale = match[2] ? (match[2].toLowerCase() === "k" ? 1e3 : 1e6) : 1;
      return Number(match[1]) * scale;
    },
  };
  cache.set(key, formats);
  return formats;
}

/** "1 result", "1,204 results": the default words for a count, with the number in the locale. */
export const resultsLabel = (n: number, locale?: string) => (n === 1 ? "1 result" : `${formatsFor(locale).number(n)} results`);
