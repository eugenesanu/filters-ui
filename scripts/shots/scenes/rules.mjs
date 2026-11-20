// Rules: opens on a budget, two fuels and a group. Switches the group from Or to And, adds a third fuel from the
// menu, then takes both back, and the counts down the side follow each step. Ends as it began, so it loops.
export default {
  name: "rules",
  path: "/lab/shot?scene=rules",
  zoom: 2,
  cursorSize: 1.5,
  start: { x: 690, y: 520 },
  async run(s) {
    const rest = s.pos;
    // The middle of the element a piece of page script finds, read when the pointer sets off.
    const at = (js, dx = 0, dy = 0) => async () => {
      const p = await s.ev(`(() => { const el = ${js}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (!p) throw new Error(`not found: ${js}`);
      return { x: p.x + dx, y: p.y + dy };
    };
    const groupJoin = `[...document.querySelectorAll('#shot button[aria-label*="switch to"]')].pop()`;
    const fuelAdd = `[...document.querySelectorAll("#shot button")].find((b) => b.textContent.trim() === "Fuel any of: Add")`;
    const option = (name) => `[...document.querySelectorAll('[role^="menuitem"], [role="option"]')].find((el) => el.textContent.trim().startsWith(${JSON.stringify(name)}))`;
    const joinWord = () => s.ev(`(${groupJoin}).textContent.trim()`);

    await s.wait(900);
    // A third fuel from the menu. With the group still on Or there are plug-in hybrids to find; on And there are
    // none and the menu greys the choice out.
    await s.move(at(fuelAdd, 2, 2), 850);
    await s.wait(150);
    await s.click();
    await s.wait(650);
    await s.move(at(option("Plug-in hybrid"), -24, 2), 550);
    await s.wait(180);
    await s.click();
    await s.wait(900);

    // The group's Or becomes And; the click also closes the open menu.
    await s.move(at(groupJoin, 1, 2), 800, { arc: -0.05 });
    await s.wait(150);
    await s.click();
    // With the menu open the first click only closes it; the second one switches the group.
    if ((await joinWord()) === "Or") {
      await s.wait(380);
      await s.click();
    }
    await s.wait(1200);
    await s.click();
    await s.wait(900);
    if ((await joinWord()) !== "Or") throw new Error("the group did not come back to Or");

    await s.move(at(`document.querySelector('#shot button[aria-label="Remove Plug-in hybrid"]')`, 30, 1), 800, { arc: 0.05 });
    await s.wait(150);
    await s.click();
    await s.wait(700);

    await s.move(rest, 900, { arc: -0.05 });
    await s.wait(1000);
  },
};
