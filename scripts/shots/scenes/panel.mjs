// Filter panel: nothing set, Price open. The top price is dragged down to $45k on the chart; the lowest is set by
// dragging the number inside the Minimum field; Price closes and keeps its value in the row; Body style opens, SUV
// and Sedan are picked, and it closes with its value too; Clear all empties the panel and Price opens again. Ends
// as it began, so it loops.
import { button, drag, field, fieldDrag, named, slider, tap, worded } from "./_lib.mjs";

const MAX = 100000;

export default {
  name: "panel",
  path: "/lab/shot?scene=panel",
  zoom: 1.6,
  cursorSize: 1.4,
  start: { x: 790, y: 560 },
  async run(s) {
    const rest = s.pos;
    const head = (name) => button(s, `b.hasAttribute("aria-expanded") && t.startsWith(${JSON.stringify(name)})`, { ax: 0.3 });
    const price = slider(s, "#shot", 0, MAX);
    const low = field(s, '#shot input[aria-label="Lowest price"]:not([type=range])', 0, MAX);
    const off = [1.3, 1.8];

    await s.wait(800);
    await s.move(await price.at(MAX, ...off), 850, { arc: -0.05 });
    await drag(s, await price.at(45000, ...off), 1000);
    await s.wait(350);

    // The field is a slider too: its thin handle shows on hover and drags the number.
    await s.move(await low.at(0, 0.6, 2.4), 650, { arc: 0.05 });
    await s.wait(400);
    await fieldDrag(s, low, 0, 15000, 1100, [0.6, 2.4]);
    await s.wait(500);

    await tap(s, head("Price"), 600, 750);
    await tap(s, head("Body style"), 550, 850);
    await tap(s, named(s, "SUV,", { ay: 0.45 }), 550, 600, -0.05);
    await tap(s, named(s, "Sedan,", { ay: 0.45 }), 400, 1000);
    await tap(s, head("Body style"), 600, 1000, -0.05);

    await tap(s, worded(s, "Clear all"), 750, 850);
    await tap(s, head("Price"), 600, 900);

    await s.move(rest, 850, { arc: 0.05 });
    await s.wait(1000);
  },
};
