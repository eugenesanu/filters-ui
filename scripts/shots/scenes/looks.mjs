// Body style and Colour: SUV in blue or white. Sedan and Minivan are added, then Red and Gray; they come off again
// in turn. Ends as it began, so it loops.
import { named, tap } from "./_lib.mjs";

export default {
  name: "looks",
  path: "/lab/shot?scene=looks",
  zoom: 2,
  cursorSize: 1.4,
  start: { x: 640, y: 480 },
  async run(s) {
    const rest = s.pos;
    const pick = (name) => named(s, `${name},`, { ay: 0.45 });

    await s.wait(900);
    await tap(s, pick("Sedan"), 800, 600);
    await tap(s, pick("Minivan"), 500, 800);
    await tap(s, pick("Red"), 750, 600, -0.05);
    await tap(s, pick("Gray"), 450, 1300);

    await tap(s, pick("Gray"), 300, 500);
    await tap(s, pick("Red"), 450, 700);
    await tap(s, pick("Minivan"), 750, 500);
    await tap(s, pick("Sedan"), 500, 800);

    await s.move(rest, 900, { arc: 0.05 });
    await s.wait(1000);
  },
};
