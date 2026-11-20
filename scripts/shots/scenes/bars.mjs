// Bar list: Toyota is ticked. Honda and Ford are ticked too; Truck is picked under Body style and every bar
// resizes to its trucks; back to Any; Ford and Honda are unticked. Ends as it began, so it loops.
export default {
  name: "bars",
  path: "/lab/shot?scene=bars",
  zoom: 2,
  cursorSize: 1.4,
  start: { x: 640, y: 300 },
  async run(s) {
    const rest = s.pos;
    const row = (make) => () =>
      s.ev(`(() => { const el = [...document.querySelectorAll("#shot label")].find((l) => l.textContent.trim().startsWith(${JSON.stringify(make)})); const r = el.getBoundingClientRect(); return { x: r.left + 22, y: r.top + r.height * 0.56 }; })()`);
    const body = (name) => () =>
      s.ev(`(() => { const el = [...document.querySelectorAll("#shot [role=radio]")].find((l) => l.textContent.trim().startsWith(${JSON.stringify(name)})); const r = el.getBoundingClientRect(); return { x: r.left + r.width * 0.42, y: r.top + r.height * 0.6 }; })()`);
    const tap = async (to, ms, after) => {
      await s.move(to, ms);
      await s.wait(150);
      await s.click();
      await s.wait(after);
    };

    await s.wait(900);
    await tap(row("Honda"), 800, 650);
    await tap(row("Ford"), 450, 1000);
    await tap(body("Truck"), 900, 1600);
    await tap(body("Any"), 800, 1000);
    await tap(row("Ford"), 850, 600);
    await tap(row("Honda"), 450, 800);

    await s.move(rest, 850, { arc: 0.05 });
    await s.wait(1000);
  },
};
