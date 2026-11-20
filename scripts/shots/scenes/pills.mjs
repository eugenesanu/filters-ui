// Filter pills: nothing set. Price opens from its pill and both handles are dragged, Show closes it; Body style
// opens and SUV is picked; Clear all at the end of the bar puts everything back. Ends as it began, so it loops.
import { drag, slider } from "./_lib.mjs";

export default {
  name: "pills",
  path: "/lab/shot?scene=pills",
  zoom: 1.6,
  cursorSize: 1.4,
  start: { x: 800, y: 650 },
  async run(s) {
    const rest = s.pos;
    const price = slider(s, "#shot", 0, 100000);
    const off = [1.2, 1.6];
    const pill = (name) => ({ sel: `#shot >> text=${name}`, dx: 2, dy: 3 });
    const show = async () => {
      const r = await s.ev(`(() => { const b = [...document.querySelectorAll("button")].find((el) => /^Show \\d/.test(el.textContent.trim()) && el.getClientRects().length); const r = b.getBoundingClientRect(); return { x: r.left + r.width * 0.55, y: r.top + r.height * 0.6 }; })()`);
      return r;
    };

    await s.wait(900);
    await s.move(pill("Price"), 850);
    await s.wait(150);
    await s.click();
    await s.wait(900);

    await s.move(await price.at(100000, ...off), 750, { arc: -0.05 });
    await drag(s, await price.at(45000, ...off), 1000);
    await s.wait(250);
    await s.move(await price.at(0, ...off), 700, { arc: 0.05 });
    await drag(s, await price.at(15000, ...off), 750);
    await s.wait(400);
    await s.move(show, 700, { arc: 0.05 });
    await s.wait(150);
    await s.click();
    await s.wait(800);

    await s.move(pill("Body style"), 800, { arc: -0.05 });
    await s.wait(150);
    await s.click();
    await s.wait(900);
    await s.move({ sel: "#shot >> text=SUV", dx: 14, dy: -14 }, 650);
    await s.wait(150);
    await s.click();
    await s.wait(700);
    await s.move(show, 650, { arc: 0.05 });
    await s.wait(150);
    await s.click();
    await s.wait(1000);

    await s.move({ sel: "#shot >> text=Clear all", dx: 2, dy: 3 }, 850, { arc: -0.05 });
    await s.wait(200);
    await s.click();
    await s.wait(900);

    await s.move(rest, 900, { arc: 0.05 });
    await s.wait(1000);
  },
};
