"use client";

import { CarsBoard } from "../blocks/cars-board";

// The board keeps its own filters and counts; onShow gets the cars that match.
// Its head is light text, so on a light page give it a dark surface like this one.
export default function FullSetExample() {
  return (
    <div className="rounded-[24px] bg-[var(--fu-page,#0A0A0A)] p-4 sm:p-8">
      <CarsBoard className="mx-auto max-w-[929px]" onShow={(cars) => console.log(`Show ${cars.length} cars`)} />
    </div>
  );
}
