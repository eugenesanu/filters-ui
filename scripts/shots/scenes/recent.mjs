// Recent searches: the box is empty. A click opens the saved and recent searches; a saved one is taken and its
// filters fill the box; the box is cleared and the list comes back; a recent one is taken; cleared again and
// closed. Ends as it began, so it loops.
export default {
  name: "recent",
  path: "/lab/shot?scene=recent",
  zoom: 2,
  cursorSize: 1.4,
  start: { x: 640, y: 505 },
  async run(s) {
    const rest = s.pos;
    const box = { sel: "[data-cell=sentence] input", ax: 0.5, dy: 2 };
    const clear = { sel: '[data-cell=sentence] [aria-label="Clear search"]', dx: 1, dy: 2 };

    await s.wait(900);
    await s.move(box, 800);
    await s.wait(120);
    await s.click();
    await s.wait(1000);

    await s.move({ sel: '[id$="-saved-family"]', ax: 0.3, dy: 2 }, 700);
    await s.wait(200);
    await s.click();
    await s.wait(1500);

    await s.move(clear, 750, { arc: -0.05 });
    await s.wait(150);
    await s.click();
    await s.wait(500);
    // Clearing leaves the list closed; a click in the box brings it back.
    await s.move(box, 550, { arc: 0.05 });
    await s.wait(120);
    await s.click();
    await s.wait(900);

    await s.move({ sel: '[id$="-recent-recent-0"]', ax: 0.45, dy: 2 }, 750);
    await s.wait(200);
    await s.click();
    await s.wait(1500);

    await s.move(clear, 750, { arc: -0.05 });
    await s.wait(150);
    await s.click();
    await s.wait(500);
    await s.ev("document.activeElement && document.activeElement.blur()");
    await s.wait(300);

    await s.move(rest, 900, { arc: 0.05 });
    await s.wait(1000);
  },
};
