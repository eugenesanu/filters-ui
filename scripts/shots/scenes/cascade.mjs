// Cascading dropdown: Toyota, any model. RAV4 is picked from the Model list; the make changes to Honda, which
// clears the model and brings Honda's popular models; Civic is taken from those; the make goes back to Toyota.
// Ends as it began, so it loops.
import { named, tap } from "./_lib.mjs";

export default {
  name: "cascade",
  path: "/lab/shot?scene=cascade",
  zoom: 2,
  cursorSize: 1.4,
  start: { x: 610, y: 190 },
  async run(s) {
    const rest = s.pos;
    const combo = (n) => () =>
      s.ev(`(() => { const r = document.querySelectorAll("#shot [role=combobox]")[${n}].getBoundingClientRect(); return { x: r.left + r.width * 0.55, y: r.top + r.height * 0.58 }; })()`);
    const option = (label) => () =>
      s.ev(`(() => { const el = [...document.querySelectorAll("[role=option]")].filter((o) => o.getClientRects().length && o.textContent.trim().startsWith(${JSON.stringify(label)})).pop(); const r = el.getBoundingClientRect(); return { x: r.left + r.width * 0.3, y: r.top + r.height * 0.58 }; })()`);
    const pick = async (n, label, glide = 650) => {
      await s.move(combo(n), 750);
      await s.wait(150);
      await s.click();
      await s.wait(800);
      await s.move(option(label), glide, { arc: -0.05 });
      await s.wait(200);
      await s.click();
    };

    await s.wait(800);
    await pick(1, "RAV4");
    await s.wait(900);

    await pick(0, "Honda");
    await s.wait(1200);

    // Chips of the make before are still in the page while they leave; "named" takes the one that can be clicked.
    await tap(s, named(s, "Civic,"), 700, 1200);

    await pick(0, "Toyota");
    await s.wait(900);

    await s.move(rest, 900, { arc: 0.05 });
    await s.wait(1000);
  },
};
