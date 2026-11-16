"use client";

import { useState } from "react";
import { ColorSwatches } from "../filters/color-swatches";
import { FilterCard } from "../ui/filter-card";

type Colour = "Black" | "White" | "Grey" | "Navy" | "Green" | "Sand" | "Rust" | "Pink";

type Jumper = { name: string; colour: Colour };

const JUMPERS: Jumper[] = [
  { name: "Crew neck", colour: "Navy" },
  { name: "Roll neck", colour: "Black" },
  { name: "Cable knit", colour: "Sand" },
  { name: "V neck", colour: "Grey" },
  { name: "Fisherman", colour: "Green" },
  { name: "Cardigan", colour: "Black" },
  { name: "Half zip", colour: "Navy" },
  { name: "Boat neck", colour: "White" },
  { name: "Mock neck", colour: "Rust" },
  { name: "Raglan", colour: "Grey" },
  { name: "Ribbed", colour: "Sand" },
  { name: "Oversized", colour: "Black" },
];

// The dot colour for each name. Pink has no jumpers, so its swatch shows dimmed.
const PAINT: Record<Colour, string> = {
  Black: "#1C1C1C",
  White: "#F2F0EC",
  Grey: "#8A8A8A",
  Navy: "#2B3A67",
  Green: "#3F6B4F",
  Sand: "#C8B48F",
  Rust: "#A4532F",
  Pink: "#D9A3B5",
};

const options = (Object.keys(PAINT) as Colour[]).map((colour) => ({
  value: colour,
  label: colour,
  color: PAINT[colour],
  count: JUMPERS.filter((jumper) => jumper.colour === colour).length,
}));

const summaryOf = (picked: Colour[]) =>
  picked.length === 0 ? null : picked.length <= 2 ? picked.join(", ") : `${picked.slice(0, 2).join(", ")} +${picked.length - 2}`;

export default function ColourSwatchesExample() {
  const [colours, setColours] = useState<Colour[]>([]);
  const results = JUMPERS.filter((jumper) => colours.length === 0 || colours.includes(jumper.colour));

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Colour"
        summary={summaryOf(colours)}
        onClear={() => setColours([])}
        defaultOpen
        bodyClassName="pb-3.5"
      >
        <ColorSwatches label="Colour" options={options} value={colours} onChange={setColours} />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 text-[var(--fu-mute,#BDBDBD)] tabular-nums">
        {results.length === 1 ? "1 result" : `${results.length} results`}
      </p>
    </div>
  );
}
