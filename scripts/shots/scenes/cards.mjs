// The bento where the filter cards are the boxes: one of each kind of filter, all on one search. Clear all, type
// two words, pick a body style, drag the price; the other boxes follow by themselves. Ends on the search it opened
// with, so it loops. Tokens keep the order they were added in, so the filters are set in the opening order.
import { drag, slider } from "./_lib.mjs";

export default {
  name: "cards",
  path: "/lab/shot?scene=cards",
  zoom: 1.25,
  cursorSize: 1.2,
  start: { x: 566, y: 262 },
  async run(s) {
    const rest = s.pos;
    const price = slider(s, "[data-facet=price]", 0, 100000);
    const off = [2.4, 3.2];

    await s.wait(900);
    await s.move({ sel: "text=Clear all", dx: 2, dy: 3 }, 900);
    await s.wait(150);
    await s.click();
    await s.wait(800);

    await s.move({ sel: "[data-cell=sentence] input", ax: 0.66, dy: 3 }, 700, { arc: -0.05 });
    await s.wait(120);
    await s.click();
    await s.wait(450);
    await s.type("white ", 95);
    await s.wait(420);
    await s.type("hybrid ", 95);
    await s.wait(750);
    // The open list lies over the Body style card; Escape closes it, as a person would before reaching past it.
    await s.key("Escape");
    await s.wait(450);

    await s.move({ sel: "[data-facet=body] >> text=SUV", dx: 14, dy: -16 }, 800);
    await s.wait(150);
    await s.click();
    await s.wait(700);

    await s.move(await price.at(100000, ...off), 950, { arc: 0.05 });
    await drag(s, await price.at(45000, ...off), 1100);
    await s.wait(450);

    await s.move(rest, 1000, { arc: 0.05 });
    await s.wait(1100);
  },
};
