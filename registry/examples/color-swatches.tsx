"use client";

import { useState } from "react";
import { ColorSwatches } from "../filters/color-swatches";
import { FilterCard } from "../ui/filter-card";

type Color = "Black" | "White" | "Gray" | "Silver" | "Blue" | "Red" | "Green" | "Brown";

type Car = { name: string; color: Color };

const CARS: Car[] = [
  { name: "Toyota RAV4", color: "White" },
  { name: "Honda Civic", color: "Black" },
  { name: "Mazda CX-5", color: "Red" },
  { name: "Tesla Model 3", color: "White" },
  { name: "Ford F-150", color: "Gray" },
  { name: "Subaru Outback", color: "Green" },
  { name: "Hyundai Tucson", color: "Silver" },
  { name: "Kia Telluride", color: "Black" },
  { name: "BMW X3", color: "Blue" },
  { name: "Ford Mustang", color: "Red" },
  { name: "Toyota Camry", color: "Gray" },
  { name: "Honda CR-V", color: "Blue" },
];

// The paint for each swatch. Brown has no cars here, so its swatch shows dimmed.
const PAINT: Record<Color, string> = {
  Black: "#2B2D31",
  White: "#E8E8E6",
  Gray: "#6E7379",
  Silver: "#B4B8BD",
  Blue: "#2F5AA8",
  Red: "#B5322E",
  Green: "#3E6B52",
  Brown: "#6B4F3A",
};

const carCount = (n: number) => (n === 1 ? "1 car" : `${n} cars`);

const options = (Object.keys(PAINT) as Color[]).map((color) => ({
  value: color,
  label: color,
  color: PAINT[color],
  count: CARS.filter((car) => car.color === color).length,
}));

const summaryOf = (picked: Color[]) =>
  picked.length === 0 ? null : picked.length <= 2 ? picked.join(", ") : `${picked.slice(0, 2).join(", ")} +${picked.length - 2}`;

export default function ColourExample() {
  const [colors, setColors] = useState<Color[]>([]);
  const results = CARS.filter((car) => colors.length === 0 || colors.includes(car.color));

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Colour"
        summary={summaryOf(colors)}
        onClear={() => setColors([])}
        defaultOpen
        bodyClassName="pb-3.5"
      >
        <ColorSwatches label="Colour" options={options} value={colors} onChange={setColors} countLabel={carCount} />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
