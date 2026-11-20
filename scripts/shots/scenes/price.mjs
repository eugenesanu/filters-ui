// Price range: opens set to $15,000 - $45,000, clears it, drags both slider handles, then drags the number inside
// the Maximum field down to $45,000. Ends as it began, so it loops.
import { drag, field, fieldDrag, slider } from "./_lib.mjs";

const MAX = 100000;

export default {
  name: "price",
  path: "/lab/shot?scene=price",
  zoom: 2.5,
  start: { x: 447, y: 372 },
  async run(s) {
    const rest = s.pos;
    const rail = slider(s, "#shot", 0, MAX);
    const high = field(s, 'input[aria-label="Highest price"]:not([type=range])', 0, MAX);
    const off = [1.2, 1.6];

    await s.wait(700);
    await s.move({ sel: "text=Clear", dx: 1, dy: 1.5 }, 800);
    await s.wait(140);
    await s.click();
    await s.wait(600);

    await s.move(await rail.at(MAX, ...off), 760, { arc: -0.06 });
    await drag(s, await rail.at(70000, ...off), 950);
    await s.wait(300);

    await s.move(await rail.at(0, ...off), 800, { arc: 0.05 });
    await drag(s, await rail.at(15000, ...off), 850);
    await s.wait(350);

    // The new part: the field is a slider too. Its thin handle shows on hover and drags the number.
    await s.move(await high.at(70000, 0.6, 2.4), 700, { arc: -0.05 });
    await s.wait(450);
    await fieldDrag(s, high, 70000, 45000, 1500, [0.6, 2.4]);
    await s.wait(350);

    await s.move(rest, 900, { arc: -0.05 });
    await s.wait(900);
  },
};
