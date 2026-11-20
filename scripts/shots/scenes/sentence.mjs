// Sentence search: opens on "blue suv under 30k" already read. Clears it, types the sentence again and the words
// turn into filters one by one; a click outside closes the list and shows the cars found. Ends as it began.
export default {
  name: "sentence",
  path: "/lab/shot?scene=sentence",
  zoom: 2,
  cursorSize: 1.5,
  start: { x: 708, y: 520 },
  async run(s) {
    const rest = s.pos;
    await s.wait(900);
    await s.move({ sel: '[data-cell=sentence] button[aria-label="Clear search"]', dx: 1, dy: 1.5 }, 850);
    await s.wait(150);
    await s.click();
    await s.wait(800);

    await s.move({ sel: "[data-cell=sentence] input", ax: 0.82, dy: 3 }, 600, { arc: -0.05 });
    await s.wait(120);
    await s.click();
    await s.wait(550);
    await s.type("blue ", 100);
    await s.wait(420);
    await s.type("suv ", 100);
    await s.wait(420);
    // "under 30k" could be a price or kilometres, so the box waits; Enter takes the row on top, the price.
    await s.type("under 30k", 100);
    await s.wait(650);
    await s.key("Enter");
    await s.wait(900);

    await s.move(rest, 950, { arc: 0.05 });
    await s.wait(150);
    await s.click();
    await s.wait(1300);
  },
};
