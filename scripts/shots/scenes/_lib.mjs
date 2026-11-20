// Helpers shared by the scene files. Coordinates are page pixels (see record.mjs).
const HANDLE = 20;

/** A range slider inside `scope`: where a handle sits for a value. */
export const slider = (s, scope, min, max) => ({
  handle: (which) => `${scope} [data-handle=${which}]`,
  at: async (value, dx = 0, dy = 0) => {
    const b = await s.ev(`(() => { const r = document.querySelector(${JSON.stringify(`${scope} [data-handle=high]`)}).parentElement.parentElement.getBoundingClientRect(); return { left: r.left, width: r.width, top: r.top, height: r.height }; })()`);
    return { x: b.left + HANDLE / 2 + ((value - min) / (max - min)) * (b.width - HANDLE) + dx, y: b.top + b.height / 2 + dy };
  },
});

/** A number field that can be dragged: where its thin handle sits for a value. */
export const field = (s, input, min, max, pad = 12) => ({
  at: async (value, dx = 0, dy = 0) => {
    const b = await s.ev(`(() => { const r = document.querySelector(${JSON.stringify(input)}).closest('[class~="group/field"]').getBoundingClientRect(); return { left: r.left, width: r.width, top: r.top, height: r.height }; })()`);
    return { x: b.left + pad + ((value - min) / (max - min)) * (b.width - pad * 2) + dx, y: b.top + b.height / 2 + dy };
  },
});

/** Presses where the pointer is, drags to a point, lets go. */
export const drag = async (s, to, ms, { before = 150, hold = 170, after = 170 } = {}) => {
  await s.wait(before);
  await s.press(hold);
  await s.move(to, ms, { arc: 0 });
  await s.wait(after);
  await s.release();
};

/**
 * Drags a number field's thin handle from one value to another. The field reads the first 3 px as "is this a drag?"
 * and starts the drag where the next move lands, so the pointer travels that much further than the values are apart.
 */
export const fieldDrag = async (s, f, from, to, ms, [dx, dy] = [0, 0]) => {
  const a = await f.at(from, dx, dy);
  const b = await f.at(to, dx, dy);
  const dir = Math.sign(b.x - a.x) || 1;
  await s.press(220);
  await s.move({ x: a.x + dir * 3.2, y: a.y }, 50, { arc: 0 });
  await s.move({ x: a.x + dir * 3.6, y: a.y }, 17, { arc: 0 });
  await s.move({ x: b.x + dir * 3.6, y: a.y }, ms, { arc: 0 });
  await s.wait(260);
  await s.release();
};

/**
 * A button inside #shot that can be clicked right now (its middle is not covered or clipped away), picked by a test
 * written as page code over `b`, the button, and `t`, its trimmed text. Returns a point the pointer can glide to.
 */
export const button = (s, test, { ax = 0.5, ay = 0.58, dx = 0, dy = 0 } = {}) => () =>
  s.ev(`(() => {
    const el = [...document.querySelectorAll("#shot button, #shot input")].find((b) => {
      const t = b.textContent.trim();
      if (!(${test})) return false;
      const r = b.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      const top = document.elementFromPoint(r.left + r.width * ${ax} + ${dx}, r.top + r.height * ${ay} + ${dy});
      return top !== null && (b === top || b.contains(top) || top.contains(b));
    });
    if (!el) throw new Error("no button for: " + ${JSON.stringify(test)});
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width * ${ax} + ${dx}, y: r.top + r.height * ${ay} + ${dy} };
  })()`);
/** By the start of its accessible name. */
export const named = (s, name, at) => button(s, `(b.getAttribute("aria-label") || "").startsWith(${JSON.stringify(name)})`, at);
/** By the start of its text. */
export const worded = (s, words, at) => button(s, `t.startsWith(${JSON.stringify(words)})`, at);

/** Glides to a point, clicks, and waits. */
export const tap = async (s, to, ms, after, arc = 0.06) => {
  await s.move(to, ms, { arc });
  await s.wait(150);
  await s.click();
  await s.wait(after);
};
