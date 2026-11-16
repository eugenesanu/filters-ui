"use client";

import { useState } from "react";
import { addDays, DateRange, formatDateRange, useToday, type DateRangeValue } from "../filters/date-range";
import { FilterCard } from "../ui/filter-card";

// Days since each car was listed, so the demo always has recent listings. Real data would carry the date itself.
const CARS = [
  { name: "Toyota RAV4", daysAgo: 0 },
  { name: "Honda Civic", daysAgo: 0 },
  { name: "Mazda CX-5", daysAgo: 1 },
  { name: "Kia Telluride", daysAgo: 2 },
  { name: "Ford F-150", daysAgo: 4 },
  { name: "Tesla Model 3", daysAgo: 6 },
  { name: "Subaru Outback", daysAgo: 9 },
  { name: "Hyundai Tucson", daysAgo: 12 },
  { name: "BMW X3", daysAgo: 15 },
  { name: "Toyota Corolla", daysAgo: 19 },
  { name: "Jeep Wrangler", daysAgo: 24 },
  { name: "Honda CR-V", daysAgo: 29 },
  { name: "Ford Mustang", daysAgo: 33 },
  { name: "Volvo XC60", daysAgo: 38 },
  { name: "Nissan Rogue", daysAgo: 44 },
  { name: "Audi Q5", daysAgo: 49 },
  { name: "Mini Cooper", daysAgo: 53 },
  { name: "Chevrolet Bolt", daysAgo: 58 },
];

const carCount = (n: number) => (n === 1 ? "1 car" : `${n} cars`);

export default function ListedExample() {
  const [listed, setListed] = useState<DateRangeValue>({ last: 30 });
  // Today is null until the page runs in the browser, so the server render never guesses the date.
  const today = useToday();
  const dayOf = (daysAgo: number) => (today ? addDays(today, -daysAgo) : "");

  const results = CARS.filter(({ daysAgo }) => {
    if (!listed) return true;
    if ("last" in listed) return daysAgo < listed.last;
    return dayOf(daysAgo) >= listed.start && dayOf(daysAgo) <= listed.end;
  });

  return (
    <div className="w-full max-w-[320px]">
      <FilterCard title="Listed" summary={formatDateRange(listed, undefined, today)} onClear={() => setListed(null)} defaultOpen>
        <DateRange
          label="Listed"
          value={listed}
          onChange={setListed}
          countOf={(day) => CARS.filter(({ daysAgo }) => dayOf(daysAgo) === day).length}
          total={CARS.length}
          countLabel={carCount}
        />
      </FilterCard>
      <p className="mt-3 px-4 text-[14px] leading-5 tabular-nums">
        <span className="font-medium">{results.length}</span> <span className="text-[var(--fu-dim,#8C8C8C)]">of {CARS.length} cars</span>
      </p>
    </div>
  );
}
