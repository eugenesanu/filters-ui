// No results: a hybrid with seven seats under $45k finds 4 cars. The price is dragged down to $20k and nothing is
// left, so No results offers the changes that bring cars back; the price one is taken, then the price is dragged
// back to $45k. Ends as it began, so it loops.
import { drag, slider } from "./_lib.mjs";

export default {
  name: "none",
  path: "/lab/shot?scene=none",
  zoom: 1.6,
  cursorSize: 1.4,
  start: { x: 780, y: 620 },
  async run(s) {
    const rest = s.pos;
    const price = slider(s, "[data-facet=price]", 0, 100000);
    const off = [1.3, 1.8];

    await s.wait(900);
    await s.move(await price.at(45000, ...off), 900, { arc: -0.05 });
    await drag(s, await price.at(20000, ...off), 1400);
    await s.wait(1300);

    await s.move({ sel: "#shot >> text=Under $22.5k", ax: 0.4, dy: 3 }, 900, { arc: 0.05 });
    await s.wait(200);
    await s.click();
    await s.wait(1200);

    await s.move(await price.at(22500, ...off), 900, { arc: -0.05 });
    await drag(s, await price.at(45000, ...off), 1200);
    await s.wait(500);

    await s.move(rest, 900, { arc: 0.05 });
    await s.wait(1000);
  },
};
