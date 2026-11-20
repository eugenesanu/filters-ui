// The full set in one tile: Clear all, then the price and two body styles are set again and the count follows.
// Ends as it began, so it loops.
import { drag, slider } from "./_lib.mjs";

export default {
  name: "set",
  path: "/lab/shot?scene=set",
  zoom: 1.5625,
  cursorSize: 1.3,
  start: { x: 690, y: 590 },
  async run(s) {
    const rest = s.pos;
    const price = slider(s, "[data-facet=price]", 0, 100000);
    const off = [2, 2.6];

    await s.wait(900);
    await s.move({ sel: "text=Clear all", dx: 2, dy: 3 }, 850);
    await s.wait(150);
    await s.click();
    await s.wait(750);

    await s.move(await price.at(100000, ...off), 950, { arc: 0.05 });
    await drag(s, await price.at(60000, ...off), 950);
    await s.wait(250);
    await s.move(await price.at(0, ...off), 700, { arc: 0.05 });
    await drag(s, await price.at(15000, ...off), 800);
    await s.wait(400);

    await s.move({ sel: "[data-facet=body] >> text=SUV", dx: 22, dy: -18 }, 800, { arc: -0.05 });
    await s.wait(150);
    await s.click();
    await s.wait(450);
    await s.move({ sel: "[data-facet=body] >> text=Sedan", dx: 22, dy: -18 }, 520);
    await s.wait(150);
    await s.click();
    await s.wait(600);

    await s.move(rest, 900, { arc: -0.05 });
    await s.wait(1000);
  },
};
