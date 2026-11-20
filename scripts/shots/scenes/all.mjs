// All filters: body style and price are set. Fuel is opened and Hybrid picked; "seat" is typed into Find a filter,
// Seats opened and 7+ picked; the search is emptied by its cross, the two new values leave by their crosses in the list, and Body
// style is opened again. Ends as it began, so it loops.
import { button, named, tap, worded } from "./_lib.mjs";

export default {
  name: "all",
  path: "/lab/shot?scene=all",
  zoom: 1.6,
  cursorSize: 1.4,
  start: { x: 800, y: 600 },
  async run(s) {
    const rest = s.pos;
    const row = (name) => worded(s, name, { ax: 0.3 });

    await s.wait(900);
    await tap(s, row("Fuel"), 850, 800);
    await tap(s, named(s, "Hybrid,"), 700, 1100, -0.05);

    await tap(s, named(s, "Find a filter"), 800, 400);
    await s.type("seat", 110);
    await s.wait(700);
    await tap(s, row("Seats"), 500, 800);
    await tap(s, worded(s, "7+"), 700, 1200, -0.05);

    // The cross inside the search box empties it and the whole list comes back.
    await tap(s, button(s, `b.tagName === "BUTTON" && b.parentElement.querySelector("input") !== null`), 700, 700, -0.05);
    await tap(s, named(s, "Remove 7+"), 750, 700);
    await tap(s, named(s, "Remove Hybrid"), 550, 700);
    await tap(s, row("Body style"), 500, 900);

    await s.move(rest, 900, { arc: 0.05 });
    await s.wait(1000);
  },
};
