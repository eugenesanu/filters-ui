// Date range: opens on "Last 30 days". Picks "Last 7 days", then two days on the calendar for a range of its own,
// then "Last 30 days" again. Ends as it began, so it loops. The days are the 3rd and the 12th the calendar offers.
export default {
  name: "listed",
  path: "/lab/shot?scene=listed-wide",
  zoom: 2,
  cursorSize: 1.5,
  start: { x: 668, y: 532 },
  async run(s) {
    const rest = s.pos;
    const days = await s.ev(`[...document.querySelectorAll("[data-facet=listed] [data-day]")].filter((b) => !b.disabled && b.getAttribute("aria-disabled") !== "true").map((b) => b.dataset.day)`);
    const day = (n) => `[data-facet=listed] [data-day="${days[n]}"]`;

    await s.wait(900);
    await s.move({ sel: "text=Last 7 days", ax: 0.7, dy: 3 }, 850);
    await s.wait(150);
    await s.click();
    await s.wait(900);

    await s.move({ sel: day(2), dx: 2, dy: 3 }, 800, { arc: -0.05 });
    await s.wait(150);
    await s.click();
    await s.wait(350);
    await s.move({ sel: day(11), dx: 2, dy: 3 }, 900, { arc: 0.04 });
    await s.wait(200);
    await s.click();
    await s.wait(1000);

    await s.move({ sel: "text=Last 30 days", ax: 0.7, dy: 3 }, 900, { arc: 0.05 });
    await s.wait(150);
    await s.click();
    await s.wait(700);

    await s.move(rest, 900, { arc: -0.05 });
    await s.wait(1000);
  },
};
