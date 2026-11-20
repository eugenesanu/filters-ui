// The results bento: Toyotas under 100,000 km. RAV4 is taken from the popular models and Used from New or used, and
// the list of cars follows; Clear all empties the search; Toyota is picked again from the Make list and the
// kilometres limit dragged back down. Ends as it began, so it loops.
import { button, drag, named, slider, tap, worded } from "./_lib.mjs";

export default {
  name: "results",
  path: "/lab/shot?scene=results",
  zoom: 1.25,
  cursorSize: 1.2,
  start: { x: 560, y: 300 },
  async run(s) {
    const rest = s.pos;
    const km = slider(s, "[data-facet=km]", 0, 150000);
    const off = [2.4, 3.2];
    const option = (label) => () =>
      s.ev(`(() => { const el = [...document.querySelectorAll("[role=option]")].filter((o) => o.getClientRects().length && o.textContent.trim().startsWith(${JSON.stringify(label)})).pop(); const r = el.getBoundingClientRect(); return { x: r.left + r.width * 0.3, y: r.top + r.height * 0.58 }; })()`);

    await s.wait(900);
    await tap(s, named(s, "RAV4,"), 850, 1000);
    await tap(s, button(s, `b.getAttribute("role") === "radio" && t.startsWith("Used")`), 800, 1300, -0.05);

    await tap(s, worded(s, "Clear all"), 900, 1000);

    await tap(s, button(s, `b.getAttribute("role") === "combobox" && t.startsWith("Make")`), 900, 800, -0.05);
    await tap(s, option("Toyota"), 600, 1000);

    await s.move(await km.at(150000, ...off), 850, { arc: 0.05 });
    await drag(s, await km.at(100000, ...off), 1000);
    await s.wait(500);

    await s.move(rest, 1000, { arc: 0.05 });
    await s.wait(1100);
  },
};
