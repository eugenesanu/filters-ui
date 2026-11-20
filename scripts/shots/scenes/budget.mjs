// Budget: opens on $450 a month over 60 months. Stretches the loan to 72 months, drags the monthly amount up inside
// its field, then drags it back and returns to 60 months; the top price and the count follow. Ends as it began.
const FIELD = `document.querySelector('#shot input[aria-label="Each month"]').closest('[class~="group/field"]')`;

export default {
  name: "budget",
  path: "/lab/shot?scene=budget",
  zoom: 2,
  cursorSize: 1.5,
  start: { x: 662, y: 500 },
  async run(s) {
    const rest = s.pos;
    const value = () => s.ev(`document.querySelector('#shot input[aria-label="Each month"]').value`);
    // The middle of the field's thin drag handle, a little under centre so the pointer does not hide the digits.
    const handle = async () => {
      const r = await s.ev(`(() => { const r = ${FIELD}.querySelector("span.cursor-ew-resize").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      return { x: r.x + 0.4, y: r.y + 2.4 };
    };
    // Drags the handle `by` pixels. The field takes the first 3 px as "is this a drag?" (see fieldDrag in _lib).
    const pull = async (by, ms) => {
      const a = await handle();
      const dir = Math.sign(by);
      await s.move(a, 700, { arc: -0.05 });
      await s.wait(420);
      await s.press(220);
      await s.move({ x: a.x + dir * 3.2, y: a.y }, 50, { arc: 0 });
      await s.move({ x: a.x + dir * 3.6, y: a.y }, 17, { arc: 0 });
      await s.move({ x: a.x + dir * 3.6 + by, y: a.y }, ms, { arc: 0 });
      await s.wait(260);
      await s.release();
    };

    await s.wait(900);
    await s.move({ sel: "#shot >> text=72", dx: 1, dy: 2 }, 850);
    await s.wait(150);
    await s.click();
    await s.wait(900);

    const before = await value();
    await pull(22, 1100);
    await s.wait(900);
    console.log(`\nmonthly ${before} -> ${await value()}`);
    await pull(-22, 1000);
    await s.wait(500);
    if ((await value()) !== before) throw new Error(`monthly came back as ${await value()}, not ${before}`);

    await s.move({ sel: "#shot >> text=60", dx: 1, dy: 2 }, 750, { arc: 0.05 });
    await s.wait(150);
    await s.click();
    await s.wait(700);

    await s.move(rest, 850, { arc: -0.05 });
    await s.wait(1000);
  },
};
