"use client";

import { useState } from "react";
import { Select } from "../ui/select";
import { TextSwap } from "../ui/text-swap";

// Cars for sale per model year. No 2026 cars yet, so 2026 is dimmed in the list and cannot be picked.
const PER_YEAR: Record<number, number> = { 2017: 3, 2018: 4, 2019: 6, 2020: 5, 2021: 9, 2022: 7, 2023: 8, 2024: 6, 2025: 4, 2026: 0 };
const TIMELINE = Object.keys(PER_YEAR).map(Number);
const TALLEST = Math.max(...Object.values(PER_YEAR));
const carsFrom = (from: number | null) => TIMELINE.reduce((n, year) => (from === null || year >= from ? n + PER_YEAR[year] : n), 0);

// Each year counts the cars it would show: that year or newer.
const OPTIONS = [
  { value: "", label: "Any", count: carsFrom(null) },
  ...[...TIMELINE].reverse().map((year) => ({ value: String(year), label: String(year), count: carsFrom(year) })),
];

const carCount = (n: number) => (n === 1 ? "1 car" : `${n} cars`);
const SMOOTH = "ease-[cubic-bezier(0.22,1,0.36,1)]";

export default function SelectExample() {
  const [from, setFrom] = useState("2021");
  // Where the kept years start on the timeline, oldest first.
  const cut = from === "" ? 0 : TIMELINE.indexOf(Number(from));

  return (
    <div className="w-full max-w-[320px]">
      <Select label="From year" prefix="From" value={from} onChange={setFrom} options={OPTIONS} countLabel={carCount} />
      <div className="mt-2 rounded-[24px] border border-[var(--fu-card-border,#2A2A2A)] bg-[var(--fu-card,#1F1F1F)] px-5 pt-4 pb-5">
        <p aria-live="polite" className="flex items-baseline gap-1 text-[14px] leading-5 tabular-nums">
          <TextSwap className="font-medium text-[var(--fu-text,#F8F5F1)]">{String(carsFrom(from === "" ? null : Number(from)))}</TextSwap>
          <span className="text-[var(--fu-dim,#8C8C8C)]">cars</span>
        </p>
        {/* One mark per car, by model year. The kept years sit on a band whose edge slides to the new year; their marks
            light up in a wave that starts at the band's edge. */}
        <div aria-hidden="true" className="relative mt-5">
          <span
            className={`absolute -inset-y-2 -right-[5px] rounded-[12px] bg-[var(--fu-selected,#1F2747)] transition-[left] duration-[480ms] motion-reduce:transition-none ${SMOOTH}`}
            style={{ left: `calc(${cut} * (100% + 10px) / ${TIMELINE.length} - 5px)` }}
          />
          <div className="relative grid grid-cols-10 items-end gap-2.5" style={{ height: TALLEST * 8 - 2 }}>
            {TIMELINE.map((year, i) => (
              <div key={year} className="flex flex-col-reverse gap-[2px]">
                {Array.from({ length: PER_YEAR[year] }, (_, j) => (
                  <span
                    key={j}
                    className={`h-1.5 rounded-[2px] transition-[background-color] duration-300 motion-reduce:transition-none ${SMOOTH} ${
                      i >= cut ? "bg-[var(--fu-accent-soft,#8FAAFF)]" : "bg-[var(--fu-line,#404040)]"
                    }`}
                    style={{ transitionDelay: `${Math.abs(i - cut) * 40 + j * 14}ms` }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="relative mt-2.5 grid grid-cols-10 gap-2.5 text-center text-[12px] leading-4 tabular-nums">
            {TIMELINE.map((year, i) => (
              <span
                key={year}
                className={`transition-[color] duration-300 motion-reduce:transition-none ${
                  i >= cut ? "text-[var(--fu-accent-pale,#D1DDFF)]" : "text-[var(--fu-dim,#8C8C8C)]"
                }`}
              >
                ’{String(year).slice(2)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
