import type { CSSProperties, ReactNode } from "react";
import { PROFILES, type BodyStyle } from "@/registry/demo/body-icons";
import { BODIES, CARS, COLOR_PAINTS, COLORS, FUELS, type Car } from "@/registry/demo/cars";
import { KM_BARS, PRICE_BARS, YEARS } from "@/registry/demo/cars-facets";
import { ArrowRightIcon, CheckIcon, CopyIcon, PlusIcon, SearchIcon, SearchXIcon, StarIcon, ListTreeIcon } from "@/registry/ui/icons";
import { AscendingGlyph, CalendarGlyph, ClockGlyph, GaugeGlyph } from "@/registry/ui/sort-glyphs";
import { Bars, C, Card, Checkbox, Chevron, Chip, Count, Cross, FadeFoot, Field, Rail, Results, col, row } from "./parts";

// One drawing per item, in the site's own look and the demo's own numbers, for the right half of its share image.

const count = (test: (car: Car) => boolean) => CARS.filter(test).length;
const TOTAL = CARS.length;
const PRICE = Array.from({ length: PRICE_BARS }, (_, i) => count((car) => Math.min(PRICE_BARS - 1, Math.floor(car.price / 5000)) === i));
const KM = Array.from({ length: KM_BARS }, (_, i) => count((car) => car.km !== null && Math.min(KM_BARS - 1, Math.floor(car.km / 10000)) === i));
const YEAR_COUNTS = YEARS.map((year) => count((car) => car.year === year));
const BODY = Object.fromEntries(BODIES.map((body) => [body, count((car) => car.body === body)])) as Record<BodyStyle, number>;
const FUEL = Object.fromEntries(FUELS.map((fuel) => [fuel, count((car) => car.fuel === fuel)]));
const MAKE = (make: string) => count((car) => car.make === make);
const MODEL = (make: string, model: string) => count((car) => car.make === make && car.model === model);
const SEATS = (min: number) => count((car) => (car.seats ?? 0) >= min);

/** The inside width of a 432px card: its 24px padding and 1.5px edges off. */
const INNER = 381;

function Stack({ children, gap = 22, style }: { children: ReactNode; gap?: number; style?: CSSProperties }) {
  return <div style={col({ gap, ...style })}>{children}</div>;
}

function PriceChart({ width = INNER, height = 96 }: { width?: number; height?: number }) {
  return (
    <div style={col()}>
      <Bars values={PRICE} on={(i) => i >= 3 && i <= 8} width={width} height={height} />
      <div style={{ display: "flex", marginTop: -9 }}>
        <Rail width={width} from={3 / PRICE_BARS} to={9 / PRICE_BARS} />
      </div>
    </div>
  );
}

function Body({ body, color, ground, height = 39 }: { body: BodyStyle; color: string; ground: string; height?: number }) {
  const [outline, wheels] = PROFILES[body];
  return (
    <svg viewBox="0 0 320 140" width={(height * 320) / 140} height={height}>
      <path d={outline} fill={color} />
      {wheels.map((x) => (
        <circle key={x} cx={x} cy={112} r={19} fill={color} stroke={ground} strokeWidth={7} />
      ))}
    </svg>
  );
}

function Tile({ body, on = false, width = 184, height = 105, scale = 1 }: { body: BodyStyle; on?: boolean; width?: number; height?: number; scale?: number }) {
  const ground = on ? C.selected : C.card;
  return (
    <div
      style={col({
        width,
        height,
        justifyContent: "space-between",
        padding: `${12 * scale}px ${12 * scale}px ${10 * scale}px ${15 * scale}px`,
        borderRadius: 21 * scale,
        border: `1.5px solid ${on ? C.accentSoft : C.control}`,
        background: ground,
      })}
    >
      <div style={row({ justifyContent: "center" })}>
        <Body body={body} color={on ? C.accentSoft : C.mute} ground={ground} height={39 * scale} />
      </div>
      <div style={row({ justifyContent: "space-between", fontSize: 20 * scale, color: C.text })}>
        {body}
        <Count
          n={BODY[body]}
          on={on}
          style={scale < 1 ? { height: 30 * scale, minWidth: 33 * scale, fontSize: 18 * scale, borderRadius: 9 * scale, padding: `0 ${9 * scale}px` } : undefined}
        />
      </div>
    </div>
  );
}

function Swatch({ name, on = false, width = 95, dot = 42 }: { name: (typeof COLORS)[number]; on?: boolean; width?: number; dot?: number }) {
  return (
    <div style={col({ alignItems: "center", gap: 6, width, padding: "15px 0 9px", borderRadius: 18, background: on ? C.wash : "transparent" })}>
      <div
        style={{
          width: dot,
          height: dot,
          borderRadius: dot,
          background: COLOR_PAINTS[name],
          border: `1.5px solid ${on ? C.text : C.control}`,
          ...(on && { boxShadow: "0 0 0 4.5px rgba(248,245,241,0.18)" }),
        }}
      />
      <div style={{ fontSize: 19, color: C.swatchText }}>{name}</div>
    </div>
  );
}

function SearchBox({ placeholder, style }: { placeholder: string; style?: CSSProperties }) {
  return (
    <div style={row({ height: 60, gap: 12, padding: "0 18px", borderRadius: 18, border: `1.5px solid ${C.control}`, fontSize: 21, color: C.dim, ...style })}>
      <SearchIcon size={22} stroke={C.mute} />
      {placeholder}
    </div>
  );
}

function CheckRow({ label, n, on = false, indent = false }: { label: string; n: number; on?: boolean; indent?: boolean }) {
  return (
    <div style={row({ height: 51, gap: 15, paddingLeft: indent ? 39 : 6, paddingRight: 3, fontSize: 21, color: C.text })}>
      <Checkbox on={on} />
      <div style={{ flex: 1 }}>{label}</div>
      <Count n={n} on={on} square />
    </div>
  );
}

function Token({ label, outline = false }: { label: string; outline?: boolean }) {
  return (
    <div
      style={row({
        height: 36,
        gap: 4,
        padding: outline ? "0 12px" : "0 8px 0 12px",
        borderRadius: 12,
        fontSize: 19,
        fontWeight: 500,
        background: outline ? "transparent" : C.token,
        border: outline ? `1.5px solid ${C.accentSoft}` : "none",
        color: outline ? C.accentSoft : C.tokenText,
      })}
    >
      {label}
      {!outline && <Cross size={17} color={C.tokenText} />}
    </div>
  );
}

/** A floating list under a field: the menu look shared by the select, the dropdown and the search boxes. */
function Menu({ children, width = 432, style }: { children: ReactNode; width?: number; style?: CSSProperties }) {
  return (
    <div
      style={col({
        width,
        padding: 9,
        borderRadius: 24,
        background: C.search,
        border: `1.5px solid ${C.hover}`,
        boxShadow: `0 36px 72px -24px ${C.shadow}`,
        ...style,
      })}
    >
      {children}
    </div>
  );
}

function Button({ children, kind = "primary", size = "md" }: { children: ReactNode; kind?: "primary" | "secondary"; size?: "sm" | "md" | "lg" }) {
  const height = { sm: 48, md: 57, lg: 63 }[size];
  return (
    <div
      style={row({
        height,
        gap: 9,
        padding: `0 ${size === "sm" ? 18 : 24}px`,
        borderRadius: size === "sm" ? 12 : 15,
        fontSize: size === "sm" ? 19 : 21,
        fontWeight: 500,
        background: kind === "primary" ? C.accent : C.surface,
        color: kind === "primary" ? C.onAccent : C.text,
      })}
    >
      {children}
    </div>
  );
}

/** A row in a list whose soft bar behind it shows its count. */
function BarRow({ label, n, share, on = false }: { label: string; n: number; share: number; on?: boolean }) {
  // As on the site: the chosen row's wash spans the row, and the bar starts after the checkbox, its length the count's share.
  const bar = (INNER - 60) * share;
  return (
    <div style={row({ position: "relative", width: INNER, height: 60, padding: "0 18px", gap: 18, fontSize: 21 })}>
      <div style={{ position: "absolute", left: 0, top: 3, width: INNER, height: 54, borderRadius: 10.5, background: on ? C.selected : "transparent" }} />
      <div style={{ position: "absolute", left: 60, top: 3, width: Math.max(3, bar), height: 54, borderRadius: 9, background: on ? "rgba(143,170,255,0.15)" : C.share }} />
      <Checkbox on={on} />
      <div style={{ flex: 1, color: on ? C.accentPale : C.text }}>{label}</div>
      <div style={{ color: on ? C.accentSoft : C.mute }}>{String(n)}</div>
    </div>
  );
}

const MOTIFS: Record<string, () => ReactNode> = {
  "range-histogram": () => (
    <Stack>
      <Card title="Price">
        <PriceChart />
        <div style={row({ gap: 12, marginTop: 18 })}>
          <Field value="$15,000" />
          <Field value="$45,000" />
        </div>
      </Card>
      <Results shown={count((car) => car.price >= 15000 && car.price <= 45000)} of={TOTAL} />
    </Stack>
  ),

  "range-select": () => (
    <Stack>
      <Card title="Year">
        <Bars values={YEAR_COUNTS} on={(i) => i >= 3 && i <= 7} width={INNER} height={90} gap={6} />
        <div style={{ display: "flex", marginTop: -9 }}>
          <Rail width={INNER} from={3.5 / YEARS.length} to={7.5 / YEARS.length} />
        </div>
        <div style={row({ gap: 12, marginTop: 18 })}>
          <Field label="From" value="2020" end="chevron" />
          <Field label="To" value="2024" end="chevron" />
        </div>
      </Card>
      <Results shown={count((car) => car.year >= 2020 && car.year <= 2024)} of={TOTAL} />
    </Stack>
  ),

  "upper-limit": () => (
    <Stack>
      <Card title="Kilometres">
        <Bars values={KM} on={(i) => i <= 5} width={INNER} height={90} />
        <div style={{ display: "flex", marginTop: -9 }}>
          <Rail width={INNER} from={0} to={6 / KM_BARS} single />
        </div>
        <div style={row({ marginTop: 18 })}>
          <Field value="60,000 km" />
        </div>
      </Card>
      <Results shown={count((car) => car.km !== null && car.km <= 60000)} of={TOTAL} />
    </Stack>
  ),

  "chip-group": () => (
    <Stack>
      <Card title="Fuel">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {FUELS.map((fuel) => (
            <Chip key={fuel} label={fuel} count={FUEL[fuel]} on={fuel === "Hybrid" || fuel === "Electric"} />
          ))}
        </div>
      </Card>
      <Results shown={FUEL.Hybrid + FUEL.Electric} of={TOTAL} />
    </Stack>
  ),

  "segmented-choice": () => (
    <Stack>
      <Card title="Seats" width={468}>
        <div style={row({ height: 72, padding: 6, borderRadius: 19.5, background: C.track })}>
          {(["Any", 6, 7, 8] as const).map((seats) => (
            <div
              key={seats}
              style={row({
                flex: 1,
                height: 60,
                gap: 8,
                justifyContent: "center",
                borderRadius: 14.5,
                fontSize: 22.5,
                fontWeight: seats === 7 ? 500 : 400,
                background: seats === 7 ? C.thumb : "transparent",
                color: seats === 7 ? C.text : C.mute,
              })}
            >
              {seats === "Any" ? "Any" : `${seats}+`}
              {seats !== "Any" && <Count n={SEATS(seats)} square style={seats === 7 ? { background: C.hover, color: C.text } : undefined} />}
            </div>
          ))}
        </div>
      </Card>
      <Results shown={SEATS(7)} of={TOTAL} />
    </Stack>
  ),

  "icon-tiles": () => (
    <Stack>
      <Card title="Body style">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Tile body="SUV" on />
          <Tile body="Sedan" />
          <Tile body="Truck" />
          <Tile body="Hatchback" />
        </div>
      </Card>
      <Results shown={BODY.SUV} of={TOTAL} />
    </Stack>
  ),

  "color-swatches": () => (
    <Stack>
      <Card title="Colour">
        <div style={{ display: "flex", flexWrap: "wrap", rowGap: 6 }}>
          {COLORS.map((name) => (
            <Swatch key={name} name={name} on={name === "Blue" || name === "White"} />
          ))}
        </div>
      </Card>
      <Results shown={count((car) => car.color === "Blue" || car.color === "White")} of={TOTAL} />
    </Stack>
  ),

  "searchable-list": () => (
    <Card title="Make and model">
      <SearchBox placeholder="Search makes" />
      <FadeFoot height={60}>
        <div style={col({ marginTop: 12 })}>
          <CheckRow label="Toyota" n={MAKE("Toyota")} on />
          <CheckRow label="RAV4" n={MODEL("Toyota", "RAV4")} on indent />
          <CheckRow label="Corolla" n={MODEL("Toyota", "Corolla")} indent />
          <CheckRow label="Camry" n={MODEL("Toyota", "Camry")} indent />
          <CheckRow label="Honda" n={MAKE("Honda")} />
        </div>
      </FadeFoot>
    </Card>
  ),

  "sentence-search": () => (
    <Stack gap={12}>
      <div style={col({ width: 432, gap: 9, padding: "15px 18px", borderRadius: 24, border: `1.5px solid ${C.control}`, background: C.card })}>
        <div style={row({ gap: 9 })}>
          <SearchIcon size={24} stroke={C.mute} />
          <Token label="White" />
          <Token label="AWD" />
          <Token label="SUV" />
          <div style={{ display: "flex", flex: 1 }} />
          <Cross size={24} />
        </div>
        <div style={{ paddingLeft: 36, fontSize: 21, color: C.dim }}>Add another filter</div>
      </div>
      <Menu>
        <div style={{ padding: "9px 12px 6px", fontSize: 18, color: C.dim }}>Year</div>
        {[
          ["2024 or newer", 4],
          ["2022 or newer", 8],
          ["2020 or newer", 11],
        ].map(([label, n], index) => (
          <div
            key={label}
            style={row({ height: 54, padding: "0 12px", borderRadius: 15, fontSize: 21, color: C.text, background: index === 0 ? C.rowActive : "transparent" })}
          >
            <div style={{ flex: 1 }}>{label}</div>
            <Count n={n} square />
          </div>
        ))}
      </Menu>
    </Stack>
  ),

  "date-range": () => (
    <Card title="Listed" width={444}>
      <div style={row({ justifyContent: "space-between", marginBottom: 12 })}>
        <div style={row({ gap: 6, fontSize: 21, fontWeight: 600, color: C.text })}>
          November 2026
          <Chevron size={20} color={C.text} />
        </div>
        <div style={row({ gap: 9 })}>
          {[0, 1].map((side) => (
            <div key={side} style={row({ justifyContent: "center", width: 45, height: 45, borderRadius: 45, border: `1.5px solid ${C.line}` })}>
              <div style={{ display: "flex", transform: side ? "rotate(-90deg)" : "rotate(90deg)" }}>
                <Chevron size={20} color={C.text} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={row({ marginBottom: 3 })}>
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} style={{ display: "flex", flex: 1, justifyContent: "center", fontSize: 16.5, color: C.dim }}>
            {day}
          </div>
        ))}
      </div>
      {[0, 1, 2].map((week) => (
        <div key={week} style={row({ height: 54 })}>
          {Array.from({ length: 7 }, (_, d) => {
            const day = week * 7 + d + 1;
            const [start, stop] = [3, 18];
            const end = day === start || day === stop;
            const inside = day > start && day < stop;
            const first = d === 0;
            const last = d === 6;
            // The band runs behind the inner half of each end's circle, and rounds off at the week's edges.
            const band = inside
              ? { background: C.selected }
              : day === start
                ? { backgroundImage: `linear-gradient(to right, rgba(0,0,0,0) 50%, ${C.selected} 50%)` }
                : day === stop
                  ? { backgroundImage: `linear-gradient(to right, ${C.selected} 50%, rgba(0,0,0,0) 50%)` }
                  : {};
            return (
              <div
                key={day}
                style={row({
                  flex: 1,
                  height: 48,
                  justifyContent: "center",
                  ...band,
                  borderRadius: `${first ? 12 : 0}px ${last ? 12 : 0}px ${last ? 12 : 0}px ${first ? 12 : 0}px`,
                })}
              >
                <div
                  style={row({
                    justifyContent: "center",
                    width: 48,
                    height: 48,
                    borderRadius: 48,
                    fontSize: 20,
                    fontWeight: end ? 600 : 400,
                    background: end ? C.accent : "transparent",
                    color: end ? C.onAccent : inside ? C.accentPale : C.text,
                  })}
                >
                  {String(day)}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </Card>
  ),

  "cascading-dropdown": () => (
    <Card title="Make and model">
      <Field label="Make" value="Toyota" end="chevron" style={{ flex: "none" }} />
      <div style={row({ alignItems: "flex-start" })}>
        <div style={{ width: 24, height: 45, marginLeft: 18, borderLeft: `1.5px solid ${C.line}`, borderBottom: `1.5px solid ${C.line}`, borderBottomLeftRadius: 12 }} />
        <Field label="Model" value="Any model" end="chevron" style={{ marginTop: 12, flex: 1 }} />
      </div>
      <div style={row({ gap: 9, marginTop: 18, paddingLeft: 42 })}>
        <div style={{ fontSize: 18, color: C.dim, marginRight: 6 }}>Popular</div>
        {["RAV4", "Corolla"].map((model) => (
          <div key={model} style={row({ height: 42, gap: 9, padding: "0 12px", borderRadius: 12, border: `1.5px solid ${C.control}`, fontSize: 19, color: C.text })}>
            {model}
            <div style={{ color: C.dim }}>{String(MODEL("Toyota", model))}</div>
          </div>
        ))}
      </div>
    </Card>
  ),

  "bar-list": () => {
    const makes = ["Toyota", "Ford", "Honda", "Chevrolet", "Kia"];
    const most = MAKE("Toyota");
    return (
      <Card title="Make">
        <FadeFoot height={54}>
          <div style={col()}>
            {makes.map((make) => (
              <BarRow key={make} label={make} n={MAKE(make)} share={MAKE(make) / most} on={make === "Toyota" || make === "Honda"} />
            ))}
          </div>
        </FadeFoot>
      </Card>
    );
  },

  budget: () => {
    const radio = (on: boolean) => (
      <div style={row({ justifyContent: "center", width: 27, height: 27, borderRadius: 27, border: `2.25px solid ${on ? C.accentSoft : C.control}` })}>
        {on && <div style={{ width: 12, height: 12, borderRadius: 12, background: C.accentSoft }} />}
      </div>
    );
    return (
      <Card title="Budget">
        <div style={row({ height: 60, gap: 15, padding: "0 18px", borderRadius: 18, border: `1.5px solid ${C.line}`, fontSize: 21, color: C.text })}>
          {radio(false)}
          Total price
        </div>
        <div style={col({ marginTop: 12, padding: "18px 18px 15px", borderRadius: 21, border: `1.5px solid ${C.accentSoft}` })}>
          <div style={row({ gap: 15, fontSize: 21, color: C.text })}>
            {radio(true)}
            Monthly payment
          </div>
          <div style={row({ justifyContent: "space-between", alignItems: "flex-end", marginTop: 15 })}>
            <div style={{ fontSize: 18, color: C.mute }}>Top price</div>
            <div style={{ fontSize: 30, fontWeight: 600, color: C.text }}>$25,700</div>
          </div>
          <div style={col({ marginTop: 12 })}>
            <Bars values={PRICE.slice(0, 14)} on={(i) => i <= 5} width={340} height={60} gap={4.5} lit={C.controlHover} />
            <div style={{ height: 4.5, width: 340, borderRadius: 3, background: C.rail }} />
          </div>
          <div style={row({ justifyContent: "space-between", marginTop: 12, fontSize: 18, color: C.mute })}>
            <div style={row({ gap: 6 })}>
              <div style={{ color: C.text }}>$450</div>
              each month
            </div>
            <div style={row({ gap: 6 })}>
              <div style={{ color: C.text }}>$3,000</div>
              down
            </div>
          </div>
        </div>
      </Card>
    );
  },

  "applied-filters": () => {
    const chip = (label: string, value: string) => (
      <div style={row({ height: 48, gap: 9, padding: "0 12px 0 16px", borderRadius: 12, background: C.surface, fontSize: 20 })}>
        <div style={{ color: C.mute }}>{label}</div>
        <div style={{ color: C.text, fontWeight: 500 }}>{value}</div>
        <Cross size={19} />
      </div>
    );
    return (
      <Stack gap={18} style={{ width: 456 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {chip("Price", "$15k to $45k")}
          {chip("Body style", "SUV")}
          {chip("Fuel", "Hybrid")}
          <div style={row({ height: 48, padding: "0 12px", fontSize: 20, fontWeight: 500, color: C.text })}>Clear all</div>
        </div>
        <Results shown={4} of={12} />
        <div style={col({ padding: "6px 24px", borderRadius: 24, background: C.card, border: `1.5px solid ${C.cardBorder}` })}>
          {[
            ["Toyota RAV4", "2021", "$31,900"],
            ["Honda CR-V", "2022", "$33,500"],
            ["Kia Sorento", "2020", "$29,800"],
          ].map(([name, year, price], index) => (
            <div
              key={name}
              style={row({ height: 63, gap: 9, fontSize: 21, borderTop: index ? `1.5px solid ${C.cardBorder}` : "none" })}
            >
              <div style={{ color: C.text, fontWeight: 500 }}>{name}</div>
              <div style={{ flex: 1, color: C.dim }}>{year}</div>
              <div style={{ color: C.accentSoft, fontWeight: 500 }}>{price}</div>
            </div>
          ))}
        </div>
      </Stack>
    );
  },

  "no-results": () => (
    <div style={col({ width: 444, padding: 24, borderRadius: 36, background: C.card, border: `1.5px solid ${C.cardBorder}`, boxShadow: `0 36px 72px -24px ${C.shadow}` })}>
      <div style={row({ gap: 18, marginBottom: 18 })}>
        <div style={row({ justifyContent: "center", width: 54, height: 54, borderRadius: 15, background: C.surface })}>
          <SearchXIcon size={26} stroke={C.text} />
        </div>
        <div style={col({ gap: 3 })}>
          <div style={{ fontSize: 23, fontWeight: 600, color: C.text }}>No cars match</div>
          <div style={{ fontSize: 19, color: C.mute }}>Try one of these changes.</div>
        </div>
      </div>
      {[
        ["Seats", "7+", "Any", 3],
        ["Fuel", "Hybrid", "Any", 2],
        ["Price", "Under $20k", "$25k", 1],
      ].map(([facet, from, to, n]) => (
        <div key={facet} style={row({ height: 60, gap: 12, marginTop: 9 })}>
          <div style={row({ flex: 1, height: 60, gap: 9, padding: "0 15px", borderRadius: 15, background: C.surface, fontSize: 19, whiteSpace: "nowrap" })}>
            <div style={{ color: C.dim }}>{facet}</div>
            <div style={{ color: C.mute }}>{from}</div>
            <ArrowRightIcon size={17} stroke={C.mute} />
            <div style={{ color: C.text, fontWeight: 500 }}>{to}</div>
          </div>
          <div style={row({ gap: 6, width: 66, justifyContent: "flex-end", fontSize: 19 })}>
            <div style={{ color: C.accentSoft, fontWeight: 600 }}>{String(n)}</div>
            <div style={{ color: C.dim }}>{n === 1 ? "car" : "cars"}</div>
          </div>
        </div>
      ))}
    </div>
  ),

  "recent-searches": () => (
    <Stack gap={12}>
      <div style={row({ width: 432, height: 66, gap: 10, padding: "0 18px", borderRadius: 21, border: `1.5px solid ${C.control}`, background: C.card })}>
        <SearchIcon size={24} stroke={C.mute} />
        <Token label="Hybrid" outline />
        <Token label="7+ seats" outline />
      </div>
      <Menu>
        <div style={{ padding: "9px 12px 6px", fontSize: 18, color: C.dim }}>Saved</div>
        {[
          ["Family hybrid", "Hybrid · 7+ seats", 6],
          ["City electric", "Electric · Under $40k", 11],
          ["Weekend truck", "4WD · Truck", 26],
        ].map(([name, detail, n], index) => (
          <div key={name} style={row({ height: 72, gap: 15, padding: "0 12px", borderRadius: 15, background: index === 0 ? C.rowActive : "transparent" })}>
            <div style={row({ justifyContent: "center", width: 39, height: 39, borderRadius: 10.5, background: C.selected })}>
              <StarIcon size={20} stroke={C.accentSoft} fill={C.accentSoft} />
            </div>
            <div style={col({ flex: 1, gap: 1 })}>
              <div style={{ fontSize: 21, color: C.text }}>{name}</div>
              <div style={{ fontSize: 17, color: C.dim }}>{detail}</div>
            </div>
            <Count n={n} square />
          </div>
        ))}
      </Menu>
    </Stack>
  ),

  rules: () => {
    const select = (text: string) => (
      <div style={row({ height: 48, gap: 6, padding: "0 12px 0 15px", borderRadius: 12, background: C.surface, fontSize: 19, color: C.text })}>
        {text}
        <Chevron size={18} color={C.mute} />
      </div>
    );
    const left = (n: number) => <div style={{ display: "flex", marginLeft: "auto" }}><Count n={`${n} left`} square /></div>;
    return (
      <div style={row({ alignItems: "stretch", width: 456 })}>
        <div style={col({ alignItems: "center", width: 54 })}>
          <div style={{ flex: 1, width: 18, marginLeft: 18, marginTop: 36, borderLeft: `1.5px solid ${C.line}`, borderTop: `1.5px solid ${C.line}`, borderTopLeftRadius: 12 }} />
          <div style={row({ height: 33, padding: "0 10px", borderRadius: 9, background: C.selected, color: C.accentSoft, fontSize: 16.5, fontWeight: 500 })}>And</div>
          <div style={{ flex: 1, width: 18, marginLeft: 18, marginBottom: 36, borderLeft: `1.5px solid ${C.line}`, borderBottom: `1.5px solid ${C.line}`, borderBottomLeftRadius: 12 }} />
        </div>
        <div style={col({ flex: 1, gap: 15 })}>
          <div style={col({ gap: 12, padding: 15, borderRadius: 24, background: C.card, border: `1.5px solid ${C.cardBorder}` })}>
            <div style={row({ gap: 9 })}>
              {select("Price")}
              {select("at most")}
              {left(196)}
            </div>
            <Field value="$45,000" style={{ flex: "none", height: 54 }} />
          </div>
          <div style={col({ gap: 12, padding: 15, borderRadius: 24, background: C.card, border: `1.5px solid ${C.cardBorder}` })}>
            <div style={row({ gap: 9 })}>
              {select("Fuel")}
              {select("any of")}
              {left(28)}
            </div>
            <div style={row({ gap: 9 })}>
              <Token label="Hybrid" />
              <Token label="Electric" />
              <div style={row({ gap: 4, marginLeft: 6, fontSize: 19, color: C.mute })}>
                Add
                <Chevron size={18} />
              </div>
            </div>
          </div>
          <div style={row({ gap: 18, paddingLeft: 6, fontSize: 19, color: C.mute })}>
            <div style={row({ gap: 6 })}>
              <PlusIcon size={20} stroke={C.mute} />
              Add rule
            </div>
            <div style={row({ gap: 6 })}>
              <ListTreeIcon size={20} stroke={C.mute} />
              Add group
            </div>
          </div>
        </div>
      </div>
    );
  },

  "filter-pills": () => (
    <Stack gap={12} style={{ width: 456 }}>
      <div style={row({ gap: 10 })}>
        <div style={row({ height: 51, gap: 10, padding: "0 12px 0 18px", borderRadius: 15, border: `1.5px solid ${C.accentSoft}`, background: C.selected, fontSize: 20 })}>
          <div style={{ color: C.accentPale }}>Price</div>
          <div style={{ width: 1.5, height: 21, background: C.accentSoft, opacity: 0.5 }} />
          <div style={{ color: C.accentSoft, fontWeight: 500 }}>$15k to $45k</div>
          <Cross size={19} color={C.accentSoft} />
        </div>
        {["Body style"].map((name) => (
          <div key={name} style={row({ height: 51, gap: 6, padding: "0 12px 0 18px", borderRadius: 15, border: `1.5px solid ${C.control}`, fontSize: 20, color: C.text, whiteSpace: "nowrap" })}>
            {name}
            <Chevron size={19} />
          </div>
        ))}
      </div>
      <div style={col({ width: 432, padding: 24, borderRadius: 30, background: C.card, border: `1.5px solid ${C.cardBorder}`, boxShadow: `0 36px 72px -24px ${C.shadow}` })}>
        <PriceChart />
        <div style={row({ gap: 12, marginTop: 18 })}>
          <Field value="$15,000" />
          <Field value="$45,000" />
        </div>
        <div style={row({ justifyContent: "space-between", marginTop: 18 })}>
          <div style={{ fontSize: 20, fontWeight: 500, color: C.text, paddingLeft: 6 }}>Clear</div>
          <Button size="sm">{`Show ${count((car) => car.price >= 15000 && car.price <= 45000)} cars`}</Button>
        </div>
      </div>
    </Stack>
  ),

  "all-filters": () => (
    <div style={col({ width: 480, borderRadius: 30, background: C.card, border: `1.5px solid ${C.cardBorder}`, boxShadow: `0 36px 72px -24px ${C.shadow}` })}>
      <div style={row({ gap: 12, height: 81, padding: "0 21px 0 24px", borderBottom: `1.5px solid ${C.cardBorder}` })}>
        <div style={{ fontSize: 25, fontWeight: 600, color: C.text }}>Filters</div>
        <div style={row({ height: 33, gap: 5, padding: "0 9px 0 11px", borderRadius: 10, background: C.selected, fontSize: 17, color: C.accentSoft })}>
          2 set
          <Cross size={15} color={C.accentSoft} />
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        <Button size="sm">Show 9 cars</Button>
      </div>
      <div style={row({ alignItems: "flex-start", gap: 15, padding: 15 })}>
        <div style={col({ width: 180, gap: 6 })}>
          <SearchBox placeholder="Find" style={{ height: 51, fontSize: 19, padding: "0 13px", gap: 9 }} />
          <div style={{ padding: "12px 9px 3px", fontSize: 15, color: C.dim }}>Body and engine</div>
          {["Body style", "Fuel", "Drive"].map((name, index) => (
            <div
              key={name}
              style={row({ height: 48, padding: "0 12px", borderRadius: 12, fontSize: 19, background: index === 0 ? C.selected : "transparent", color: index === 0 ? C.accentPale : C.text })}
            >
              <div style={{ flex: 1 }}>{name}</div>
              {index === 0 ? (
                <div style={{ display: "flex", transform: "rotate(-90deg)" }}>
                  <Chevron size={17} color={C.accentSoft} />
                </div>
              ) : index === 1 ? (
                <div style={{ fontSize: 16, color: C.accentSoft }}>Hybrid</div>
              ) : null}
            </div>
          ))}
        </div>
        <div style={col({ flex: 1, padding: 18, borderRadius: 21, background: C.surface })}>
          <div style={row({ justifyContent: "space-between" })}>
            <div style={{ fontSize: 22, fontWeight: 600, color: C.text }}>Body style</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: C.accentSoft }}>Clear</div>
          </div>
          <div style={{ fontSize: 17, color: C.mute, marginTop: 3 }}>Pick one or more.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 15 }}>
            {(
              [
                ["SUV", 6, true],
                ["Sedan", 3, true],
                ["Minivan", 2, false],
              ] as const
            ).map(([body, n, on]) => (
              <div
                key={body}
                style={row({
                  height: 42,
                  gap: 7,
                  padding: "0 7px 0 14px",
                  borderRadius: 21,
                  border: `1.5px solid ${on ? C.accentSoft : C.control}`,
                  background: on ? C.selected : "transparent",
                  fontSize: 18,
                  color: on ? C.accentPale : C.text,
                })}
              >
                {body}
                <Count n={n} on={on} style={{ height: 25, minWidth: 25, fontSize: 15, borderRadius: 13, padding: "0 7px" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),

  dropdown: () => {
    const options = [
      { label: "Newest listings", note: "Today", glyph: ClockGlyph },
      { label: "Price low to high", note: "$17,900", glyph: AscendingGlyph, on: true },
      { label: "Lowest kilometres", note: "9,000 km", glyph: GaugeGlyph },
      { label: "Newest model year", note: "2026", glyph: CalendarGlyph },
    ];
    return (
      <Stack gap={12} style={{ alignItems: "flex-end", width: 456 }}>
        <div style={row({ width: 456, justifyContent: "space-between" })}>
          <div style={{ fontSize: 20, color: C.dim, paddingLeft: 6 }}>{`${TOTAL} cars`}</div>
          <div style={row({ height: 51, gap: 8, padding: "0 15px 0 18px", borderRadius: 26, background: C.surface, fontSize: 20 })}>
            <div style={{ color: C.mute }}>Sort by</div>
            <div style={{ color: C.text, fontWeight: 500 }}>Price low to high</div>
            <Chevron up size={19} color={C.text} />
          </div>
        </div>
        <Menu width={408}>
          {options.map(({ label, note, glyph: Glyph, on }) => (
            <div key={label} style={row({ height: 57, gap: 13, padding: "0 12px", borderRadius: 15, background: on ? C.selected : "transparent" })}>
              <div style={row({ justifyContent: "center", width: 33, height: 33, borderRadius: 9, background: on ? C.accent : C.hover })}>
                <Glyph width={20} height={20} stroke={on ? C.onAccent : C.mute} />
              </div>
              <div style={{ flex: 1, fontSize: 20, color: on ? C.accentPale : C.text }}>{label}</div>
              <div style={{ fontSize: 17, color: on ? C.accentSoft : C.dim }}>{note}</div>
              {on ? <CheckIcon size={20} stroke={C.accentSoft} strokeWidth={2.5} /> : <div style={{ width: 20 }} />}
            </div>
          ))}
        </Menu>
      </Stack>
    );
  },

  select: () => {
    const years = [2024, 2023, 2022, 2021, 2020];
    const most = Math.max(...YEAR_COUNTS);
    return (
      <Stack gap={12}>
        <Field label="From" value="2021" end="chevron-up" focus style={{ flex: "none", width: 432 }} />
        <Menu>
          <FadeFoot height={48}>
            <div style={col()}>
              {years.map((year) => {
                const n = YEAR_COUNTS[YEARS.indexOf(year)];
                const on = year === 2021;
                return (
                  <div key={year} style={row({ height: 57, gap: 15, padding: "0 15px", borderRadius: 15, background: on ? C.selected : "transparent", fontSize: 21 })}>
                    <div style={{ flex: 1, color: on ? C.accentPale : C.text }}>{String(year)}</div>
                    <div style={{ display: "flex", width: 69, height: 4.5, borderRadius: 3, background: C.wash }}>
                      <div style={{ width: (69 * n) / most, height: 4.5, borderRadius: 3, background: on ? C.accentSoft : C.dim }} />
                    </div>
                    <div style={{ width: 30, color: on ? C.accentSoft : C.dim, fontSize: 18 }}>{String(n)}</div>
                    {on ? <CheckIcon size={20} stroke={C.accentSoft} strokeWidth={2.5} /> : <div style={{ width: 20 }} />}
                  </div>
                );
              })}
            </div>
          </FadeFoot>
        </Menu>
      </Stack>
    );
  },

  buttons: () => (
    <Stack gap={27} style={{ alignItems: "flex-start" }}>
      <div style={row({ gap: 12 })}>
        <Button>{`Show ${count((car) => car.price >= 15000 && car.price <= 45000)} cars`}</Button>
        <Button kind="secondary">Save search</Button>
        <div style={row({ justifyContent: "center", width: 57, height: 57, borderRadius: 15, background: C.surface })}>
          <CopyIcon size={24} stroke={C.text} />
        </div>
      </div>
      <div style={row({ gap: 12 })}>
        <Button size="sm">Small</Button>
        <Button>Medium</Button>
        <Button size="lg" kind="secondary">
          <svg width={22} height={22} viewBox="0 0 24 24">
            <circle cx={12} cy={12} r={9} fill="none" stroke={C.line} strokeWidth={3} />
            <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke={C.text} strokeWidth={3} strokeLinecap="round" />
          </svg>
          Saving
        </Button>
      </div>
      <div style={row({ gap: 7, fontSize: 21, color: C.mute })}>
        Free and MIT licensed, from
        <div style={{ color: C.text, borderBottom: `1.5px solid ${C.accentSoft}`, paddingBottom: 2 }}>filtersui.com</div>
      </div>
    </Stack>
  ),

  "cars-board": () => {
    // The stage itself is the board: its head, then two columns of cards running on past the foot, as on the site.
    const mini = (title: string, children: ReactNode) => (
      <div style={col({ width: 234, flexShrink: 0, borderRadius: 27, background: C.card, border: `1.5px solid ${C.cardBorder}` })}>
        <div style={row({ height: 63, padding: "0 18px", justifyContent: "space-between", fontSize: 20, fontWeight: 600, color: C.text })}>
          {title}
          <Chevron up size={20} />
        </div>
        <div style={col({ padding: "0 18px 18px" })}>{children}</div>
      </div>
    );
    const inner = 195;
    return (
      <div style={col({ position: "relative", width: 548, height: 542, padding: "34px 32px 0" })}>
        <div style={row({ gap: 18, marginBottom: 24 })}>
          <div style={{ flex: 1, fontSize: 27, fontWeight: 600, color: C.text }}>Filters</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: C.text }}>Clear all</div>
          <Button size="sm">{`Show ${count((car) => car.body === "SUV" || car.body === "Sedan")} cars`}</Button>
        </div>
        <div style={row({ alignItems: "flex-start", gap: 15 })}>
          <div style={col({ gap: 15 })}>
            {mini(
              "Price",
              <div style={col()}>
                <Bars values={PRICE} on={(i) => i >= 3 && i <= 8} width={inner} height={72} gap={3} />
                <div style={{ display: "flex", position: "relative", width: inner, height: 24, marginTop: -8 }}>
                  <div style={{ position: "absolute", left: 0, top: 10, width: inner, height: 4.5, borderRadius: 3, background: C.rail }} />
                  <div style={{ position: "absolute", left: inner * 0.15, top: 10, width: inner * 0.3, height: 4.5, background: C.accentSoft }} />
                  {[0.15, 0.45].map((at) => (
                    <div key={at} style={{ position: "absolute", left: inner * at - 12, top: 0, width: 24, height: 24, borderRadius: 24, background: C.handle }} />
                  ))}
                </div>
              </div>,
            )}
            {mini(
              "Seats",
              <div style={row({ height: 48, padding: 4.5, borderRadius: 13.5, background: C.track, fontSize: 17 })}>
                {["Any", "6+", "7+", "8+"].map((label) => (
                  <div
                    key={label}
                    style={row({ flex: 1, height: 39, justifyContent: "center", borderRadius: 10, background: label === "Any" ? C.thumb : "transparent", color: label === "Any" ? C.text : C.mute })}
                  >
                    {label}
                  </div>
                ))}
              </div>,
            )}
            {mini(
              "Year",
              <Bars values={YEAR_COUNTS} on={() => false} width={inner} height={60} gap={4.5} />,
            )}
          </div>
          <div style={col({ gap: 15 })}>
            {mini(
              "Body style",
              <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                {(["SUV", "Sedan", "Truck", "Coupe"] as const).map((body) => (
                  <Tile key={body} body={body} on={body === "SUV" || body === "Sedan"} width={93} height={87} scale={0.62} />
                ))}
              </div>,
            )}
            {mini(
              "Colour",
              <div style={{ display: "flex", flexWrap: "wrap", rowGap: 9 }}>
                {COLORS.map((name) => (
                  <div key={name} style={col({ width: 48.75, alignItems: "center", gap: 4 })}>
                    <div
                      style={{
                        width: 27,
                        height: 27,
                        borderRadius: 27,
                        background: COLOR_PAINTS[name],
                        border: `1.5px solid ${name === "White" ? C.text : C.control}`,
                        ...(name === "White" && { boxShadow: "0 0 0 3px rgba(248,245,241,0.18)" }),
                      }}
                    />
                    <div style={{ fontSize: 13.5, color: C.swatchText }}>{name}</div>
                  </div>
                ))}
              </div>,
            )}
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120, backgroundImage: `linear-gradient(to bottom, rgba(20,20,20,0), ${C.panel})` }} />
      </div>
    );
  },

  "filter-panel": () => {
    const closed = (title: string, summary?: string) => (
      <div style={row({ height: 66, padding: "0 21px", borderTop: `1.5px solid ${C.cardBorder}`, fontSize: 21 })}>
        <div style={{ flex: 1, fontWeight: 600, color: C.text }}>{title}</div>
        {summary && <div style={{ color: C.accentSoft, marginRight: 15 }}>{summary}</div>}
        <Chevron size={21} />
      </div>
    );
    return (
      <div style={col({ width: 432, borderRadius: 30, background: C.card, border: `1.5px solid ${C.cardBorder}`, overflow: "hidden", boxShadow: `0 36px 72px -24px ${C.shadow}` })}>
        <div style={row({ height: 66, padding: "0 21px", fontSize: 21 })}>
          <div style={{ flex: 1, fontWeight: 600, color: C.text }}>Price</div>
          <div style={{ color: C.accentSoft, marginRight: 15 }}>Under $45k</div>
          <Chevron size={21} />
        </div>
        <div style={row({ height: 66, padding: "0 21px", background: C.headOpen, fontSize: 21 })}>
          <div style={{ flex: 1, fontWeight: 600, color: C.text }}>Make and model</div>
          <div style={{ color: C.accentSoft, fontWeight: 500, marginRight: 15 }}>Clear</div>
          <Chevron up size={21} />
        </div>
        <div style={col({ padding: "15px 21px 9px" })}>
          <SearchBox placeholder="Search makes" style={{ height: 54 }} />
          <div style={col({ marginTop: 6 })}>
            <CheckRow label="Toyota" n={MAKE("Toyota")} on />
            <CheckRow label="RAV4" n={MODEL("Toyota", "RAV4")} on indent />
          </div>
        </div>
        {closed("Year", "2020 or newer")}
        {closed("Seats")}
      </div>
    );
  },
};

/** A drawing for an item with no motif of its own yet: its title on a card over a quiet chart. */
function Fallback({ title }: { title: string }) {
  return (
    <Card title={title} clear={false}>
      <PriceChart />
    </Card>
  );
}

export function Motif({ slug, title }: { slug: string; title: string }) {
  const draw = MOTIFS[slug];
  return draw ? <>{draw()}</> : <Fallback title={title} />;
}

