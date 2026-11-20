// The live bento board: every box holds the same search. Clear all, type two words, pick a body style, drag the
// price; the other boxes follow by themselves. Ends on the search it opened with, so it loops.
import { drag, slider } from "./_lib.mjs";

export default {
  name: "bento",
  path: "/lab/shot?scene=bento",
  zoom: 1,
  cursorSize: 1.15,
  start: { x: 1108, y: 700 },
  async run(s) {
    const rest = s.pos;
    const price = slider(s, "[data-cell=price]", 0, 100000);

    await s.wait(900);
    await s.move({ sel: "text=Clear all", dx: 3, dy: 4 }, 850);
    await s.wait(150);
    await s.click();
    await s.wait(750);

    await s.move({ sel: "[data-cell=sentence] input", ax: 0.66, dy: 4 }, 800, { arc: -0.05 });
    await s.wait(120);
    await s.click();
    await s.wait(450);
    await s.type("white ", 95);
    await s.wait(380);
    await s.type("hybrid ", 95);
    await s.wait(650);

    await s.move({ sel: "[data-cell=body] >> text=SUV", dx: 18, dy: -20 }, 850);
    await s.wait(150);
    await s.click();
    await s.wait(650);

    await s.move(await price.at(100000, 3, 4), 1000, { arc: 0.05 });
    await drag(s, await price.at(45000, 3, 4), 1100);
    await s.wait(400);

    await s.move(rest, 950, { arc: -0.05 });
    await s.wait(1000);
  },
};
