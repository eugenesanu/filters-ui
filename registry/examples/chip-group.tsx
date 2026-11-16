"use client";

import { useState } from "react";
import { ChipGroup } from "../filters/chip-group";
import { FilterCard } from "../ui/filter-card";

type Format = "Hardcover" | "Paperback" | "Ebook" | "Audiobook" | "Large print";

type Book = { title: string; format: Format };

const BOOKS: Book[] = [
  { title: "The Quiet Harbour", format: "Hardcover" },
  { title: "Salt and Stone", format: "Paperback" },
  { title: "A Year of Bread", format: "Ebook" },
  { title: "North Light", format: "Paperback" },
  { title: "The Long Field", format: "Audiobook" },
  { title: "Small Rooms", format: "Hardcover" },
  { title: "Winter Kitchen", format: "Ebook" },
  { title: "Paper Boats", format: "Paperback" },
  { title: "The Map Room", format: "Ebook" },
  { title: "Glass Orchard", format: "Audiobook" },
  { title: "Old Roads", format: "Paperback" },
  { title: "Five Rivers", format: "Ebook" },
];

const FORMATS: Format[] = ["Paperback", "Hardcover", "Ebook", "Audiobook", "Large print"];

// A format with no books keeps its chip, dimmed, so the list does not shift.
const options = FORMATS.map((format) => ({
  value: format,
  label: format,
  count: BOOKS.filter((book) => book.format === format).length,
}));

const summaryOf = (picked: Format[]) =>
  picked.length === 0 ? null : picked.length <= 2 ? picked.join(", ") : `${picked.slice(0, 2).join(", ")} +${picked.length - 2}`;

export default function ChipsExample() {
  const [formats, setFormats] = useState<Format[]>([]);
  const results = BOOKS.filter((book) => formats.length === 0 || formats.includes(book.format));

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard
        title="Format"
        summary={summaryOf(formats)}
        onClear={() => setFormats([])}
        defaultOpen
        bodyClassName="pb-2"
      >
        <ChipGroup label="Format" options={options} value={formats} onChange={setFormats} />
      </FilterCard>
      <p aria-live="polite" className="mt-3 px-4 text-[14px] leading-5 text-[var(--fu-mute,#BDBDBD)] tabular-nums">
        {results.length === 1 ? "1 result" : `${results.length} results`}
      </p>
    </div>
  );
}
