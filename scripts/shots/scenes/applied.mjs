// Applied filters: three chips over the results. AWD, White and a mileage limit are added from the Add row and
// their chips arrive; White and the mileage leave by their own crosses, AWD by its Add pill. Ends as it began.
import { button, named, tap } from "./_lib.mjs";

export default {
  name: "applied",
  path: "/lab/shot?scene=applied",
  zoom: 2,
  cursorSize: 1.4,
  start: { x: 650, y: 520 },
  async run(s) {
    const rest = s.pos;
    const add = (label) => button(s, `b.dataset.add === ${JSON.stringify(label)}`);
    const cross = (name) => named(s, `Remove ${name}`, { ax: 1, dx: -13 });

    await s.wait(900);
    await tap(s, add("AWD"), 850, 900);
    await tap(s, add("White"), 450, 900);
    await tap(s, add("Under 60,000 km"), 600, 1400, -0.05);

    await tap(s, cross("Colour"), 800, 800);
    await tap(s, cross("Kilometres"), 600, 800);
    await tap(s, add("AWD"), 650, 900, -0.05);

    await s.move(rest, 900, { arc: 0.05 });
    await s.wait(1000);
  },
};
