#!/usr/bin/env node
// Records a real page being used, frame by frame, into a video. Node 22, no packages; ffmpeg from Homebrew.
//
//   node record.mjs scenes/price.mjs out.mp4 [--scale 1] [--theme dark|light] [--origin http://localhost:4340] [--hevc]
//   node record.mjs scenes/price.mjs outDir --stills 0,1500,3000      (PNG frames at those milliseconds)
//
// The page keeps its own code and CSS; only its clock is ours. Timers, requestAnimationFrame and every CSS
// transition or animation are stepped 1/60 s per frame (headless Chrome's own "virtual time" leaves CSS on the
// real clock, so it cannot do this). Clicks, drags and keys are real input events, so hover, focus and drag
// behave as they do for a visitor. The pointer drawn on top is added by this script, not by the page.
//
// A scene file exports { path, start?, run(api) }; run drives the pointer with await api.move/press/release/...
// and every awaited step records the frames it takes. A looping scene must end as it began.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
// The picture is always 1600 x 1200 times --scale. A scene with zoom 2.5 is laid out 640 x 480 and magnified by the
// browser itself, so the page keeps its real sizes; scene coordinates are in those page pixels.
const OUT_W = 1600;
const OUT_H = 1200;
const FPS = 60;
const DT = 1000 / FPS;

const argv = process.argv.slice(2);
const [sceneFile, out] = argv;
const opt = (name, fallback) => {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? fallback : argv[at + 1];
};
const has = (name) => argv.includes(`--${name}`);
if (!sceneFile || !out) {
  console.error("usage: node record.mjs <scene.mjs> <out.mp4 | dir --stills 0,1000> [--scale 1] [--theme dark] [--origin http://localhost:4340] [--hevc]");
  process.exit(1);
}
const SCALE = Number(opt("scale", "1"));
const THEME = opt("theme", "dark");
const ORIGIN = opt("origin", "http://localhost:4340");
// --query frame=plain is added to the scene's address.
const QUERY = opt("query", "");
const STILLS = has("stills") ? opt("stills", "0").split(",").map(Number) : null;
const HEVC = has("hevc");
// --live keeps the dev server's code pushes on (for trying a scene while editing it).
const LIVE = has("live");
const CRF = opt("crf", HEVC ? "16" : "15");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scene = (await import(pathToFileURL(path.resolve(sceneFile)).href)).default;
const ZOOM = scene.zoom ?? 1;
const WIDTH = OUT_W / ZOOM;
const HEIGHT = OUT_H / ZOOM;
if (!Number.isInteger(WIDTH) || !Number.isInteger(HEIGHT)) throw new Error(`zoom ${ZOOM} does not give a whole page size`);

// Runs in the page before any of its scripts. Until __freeze() the page lives on the real clock, so it loads and
// hydrates as usual; after it, time only moves when __tick(dt) says so.
const CLOCK = `(() => {
  const real = {
    now: performance.now.bind(performance), date: Date.now.bind(Date),
    st: window.setTimeout.bind(window), ct: window.clearTimeout.bind(window),
    si: window.setInterval.bind(window), ci: window.clearInterval.bind(window),
    raf: window.requestAnimationFrame.bind(window), caf: window.cancelAnimationFrame.bind(window),
  };
  // A dev server pushes code changes over a socket and the page redraws itself. The page needs that socket to load,
  // so it works until the recording starts; from then on its messages are dropped and the filmed page stays as it
  // is, whatever is edited meanwhile.
  let deaf = false;
  if (!${LIVE}) {
    const RealSocket = window.WebSocket;
    window.WebSocket = class extends RealSocket {
      constructor(url, protocols) {
        if (protocols === undefined) super(url); else super(url, protocols);
        if (String(url).includes("/_next/")) super.addEventListener("message", (event) => { if (deaf) event.stopImmediatePropagation(); });
      }
    };
  }
  let frozen = false, now = 0, dateBase = 0, seq = 0;
  const timers = new Map(), rafs = new Map(), seen = new WeakSet();
  performance.now = () => (frozen ? now : real.now());
  Date.now = () => (frozen ? dateBase + now : real.date());
  const later = (fn, delay, args, every) => {
    const id = 1e9 + ++seq;
    timers.set(id, { at: now + Math.max(0, Number(delay) || 0), fn, args, every, n: seq });
    return id;
  };
  window.setTimeout = (fn, delay, ...args) => (frozen ? later(fn, delay, args) : real.st(fn, delay, ...args));
  window.setInterval = (fn, delay, ...args) => (frozen ? later(fn, delay, args, Math.max(1, Number(delay) || 0)) : real.si(fn, delay, ...args));
  window.clearTimeout = (id) => { if (!timers.delete(id)) real.ct(id); };
  window.clearInterval = (id) => { if (!timers.delete(id)) real.ci(id); };
  window.requestAnimationFrame = (fn) => {
    if (!frozen) return real.raf(fn);
    const id = 1e9 + ++seq;
    rafs.set(id, fn);
    return id;
  };
  window.cancelAnimationFrame = (id) => { if (!rafs.delete(id)) real.caf(id); };
  // Chrome hands a pointer move to the page with its next frame, and React draws what the move changed in a task
  // after that. A frame is only taken once the page has seen the move and those tasks have run, or the same scene
  // comes out a frame apart from one take to the next.
  let seenAt = { x: -1, y: -1 };
  const sawMove = (event) => { seenAt = { x: event.clientX, y: event.clientY }; };
  window.addEventListener("pointermove", sawMove, true);
  window.addEventListener("mousemove", sawMove, true);
  const channel = new MessageChannel();
  let queued = [];
  channel.port1.onmessage = () => { const run = queued; queued = []; for (const done of run) done(); };
  const afterTasks = () => new Promise((done) => { queued.push(done); channel.port2.postMessage(0); });
  const call = (fn, args) => { try { typeof fn === "function" ? fn(...args) : (0, eval)(String(fn)); } catch (error) { console.error(error); } };

  // Every running CSS transition, CSS animation and element.animate() is held and moved by hand. One met for the
  // first time starts at 0, so the real milliseconds since it was made never show.
  const stepAnimations = (dt) => {
    let moving = 0;
    for (const a of document.getAnimations()) {
      try {
        if (!seen.has(a)) { seen.add(a); a.pause(); a.currentTime = 0; moving++; continue; }
        if (a.playState === "finished" || a.playState === "idle") continue;
        const end = a.effect ? a.effect.getComputedTiming().endTime : Infinity;
        const t = (Number(a.currentTime) || 0) + dt;
        if (t >= end) a.finish(); else { a.currentTime = t; moving++; }
      } catch {}
    }
    return moving;
  };

  // The recording starts on a page at rest: an entrance animation still running is taken to its end, so frame one
  // is the settled page and the last frame can meet it. Endless ones (a spinner) are held where they are.
  window.__freeze = async () => {
    await document.fonts.ready;
    now = real.now();
    dateBase = real.date() - now;
    frozen = true;
    deaf = true;
    for (const a of document.getAnimations()) {
      try {
        seen.add(a);
        const end = a.effect ? a.effect.getComputedTiming().endTime : Infinity;
        if (Number.isFinite(end)) a.finish(); else a.pause();
      } catch {}
    }
    await afterTasks();
  };
  // One frame: the page's clock moves on, then the recorder takes the picture. Nothing here waits on a page timer or
  // on requestAnimationFrame, which an idle Mac slows to a crawl in a hidden browser. The picture is itself a real
  // browser frame, and finish and transitionend events go out with it; their handlers have run by the next call,
  // which holds whatever they started from its first moment. The page hears of a pointer move in whole pixels, so
  // its last-seen place is handed back for the recorder to check.
  window.__seen = () => seenAt;
  window.__tick = async (dt, cursor) => {
    await afterTasks(); await afterTasks();
    now += dt;
    for (let guard = 0; guard < 2000; guard++) {
      let due = null, dueId = 0;
      for (const [id, t] of timers) if (t.at <= now && (!due || t.at < due.at || (t.at === due.at && t.n < due.n))) { due = t; dueId = id; }
      if (!due) break;
      if (due.every) due.at += due.every; else timers.delete(dueId);
      call(due.fn, due.args);
    }
    const frame = [...rafs.values()];
    rafs.clear();
    for (const fn of frame) call(fn, [now]);
    await afterTasks(); await afterTasks();
    const moving = stepAnimations(dt);
    if (cursor) window.__cursor(cursor);
    drawCaret();
    return moving;
  };

  // The text caret: the system one blinks on the real clock, so it is hidden and this one is drawn on ours, where
  // the caret of the focused field stands. It shows for 530 ms, hides for 530 ms and starts over at each key.
  let caretKey = "", caretSince = 0, caretCanvas = null;
  const drawCaret = () => {
    let node = document.getElementById("__caret");
    if (!node) {
      node = document.createElement("div");
      node.id = "__caret";
      node.style.cssText = "position:fixed;left:0;top:0;z-index:2147483646;pointer-events:none;border-radius:1px;display:none";
      document.documentElement.appendChild(node);
    }
    const el = document.activeElement;
    const text = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA") && !["range", "checkbox", "radio", "button"].includes(el.type);
    if (!text || el.selectionStart === null || el.selectionStart !== el.selectionEnd) { node.style.display = "none"; caretKey = ""; return; }
    const cs = getComputedStyle(el);
    const ctx = (caretCanvas ||= document.createElement("canvas")).getContext("2d");
    ctx.font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    ctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
    const r = el.getBoundingClientRect();
    const size = parseFloat(cs.fontSize);
    const x = r.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth) + ctx.measureText(el.value.slice(0, el.selectionStart)).width - el.scrollLeft;
    const h = size * 1.25;
    const key = el.value + "|" + el.selectionStart + "|" + Math.round(r.left) + "|" + Math.round(r.top);
    if (key !== caretKey) { caretKey = key; caretSince = now; }
    const on = (now - caretSince) % 1060 < 530;
    node.style.display = on && x <= r.right ? "block" : "none";
    node.style.width = Math.max(1, size / 11) + "px";
    node.style.height = h + "px";
    node.style.background = cs.color;
    node.style.transform = "translate(" + x + "px," + (r.top + (r.height - h) / 2) + "px)";
  };

  // The pointer: drawn by the recorder above everything, never by the page.
  window.__cursor = ({ x, y, scale, size }) => {
    let node = document.getElementById("__pointer");
    if (!node) {
      node = document.createElement("div");
      node.id = "__pointer";
      node.style.cssText = "position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform-origin:4.5px 3.2px";
      node.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28" style="display:block;overflow:visible;filter:drop-shadow(0 2px 3px rgb(0 0 0 / 0.45))"><path d="M4.5 3.2v19.4l5.1-4.9 3.3 7.6 3.5-1.5-3.3-7.4h7.1z" fill="#111111" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
      document.documentElement.appendChild(node);
    }
    node.style.transform = "translate(" + (x - 4.5) + "px," + (y - 3.2) + "px) scale(" + size * scale + ")";
  };
})();`;

// Reads the 8-bit RGB or RGBA PNGs Chrome writes into raw pixels.
function readPng(buf) {
  let at = 8;
  let width = 0, height = 0, type = 0;
  const parts = [];
  while (at < buf.length) {
    const len = buf.readUInt32BE(at);
    const kind = buf.toString("latin1", at + 4, at + 8);
    if (kind === "IHDR") {
      width = buf.readUInt32BE(at + 8);
      height = buf.readUInt32BE(at + 12);
      if (buf[at + 16] !== 8 || buf[at + 20] !== 0) throw new Error("unexpected PNG format");
      type = buf[at + 17];
    } else if (kind === "IDAT") parts.push(buf.subarray(at + 8, at + 8 + len));
    else if (kind === "IEND") break;
    at += 12 + len;
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 0;
  if (!bpp) throw new Error(`unexpected PNG colour type ${type}`);
  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * bpp;
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const row = y * stride;
    const prev = row - stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[src + x];
      const a = x >= bpp ? out[row + x - bpp] : 0;
      const b = y ? out[prev + x] : 0;
      let p;
      if (filter === 0) p = v;
      else if (filter === 1) p = v + a;
      else if (filter === 2) p = v + b;
      else if (filter === 3) p = v + ((a + b) >> 1);
      else {
        const c = y && x >= bpp ? out[prev + x - bpp] : 0;
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        p = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      out[row + x] = p & 255;
    }
  }
  return { width, height, bpp, data: out };
}

// How many pixels of two pictures differ by more than `level` in any colour. Faint per-picture noise from the
// graphics chip stays under it; an undrawn patch or a missing pointer does not.
function strongDiff(p, q, level = 40) {
  if (p.width !== q.width || p.height !== q.height) return Infinity;
  let n = 0;
  const { data: a, bpp } = p;
  const b = q.data;
  for (let i = 0; i < a.length; i += bpp) {
    if (Math.abs(a[i] - b[i]) > level || Math.abs(a[i + 1] - b[i + 1]) > level || Math.abs(a[i + 2] - b[i + 2]) > level) n++;
  }
  return n;
}

// Hides what a dev server adds to the page, and the system caret's own blink (it runs on the real clock).
const STYLE = `nextjs-portal,[data-nextjs-toast],#__next-build-watcher{display:none!important}html{scrollbar-width:none}input,textarea{caret-color:transparent!important}`;

async function launch() {
  const profile = mkdtempSync(path.join(tmpdir(), "fu-shot-"));
  const chrome = spawn(
    CHROME,
    ["--headless=new", "--mute-audio", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--force-color-profile=srgb", "--run-all-compositor-stages-before-draw", "--force-gpu-mem-available-mb=8192", "--disable-checker-imaging", "--disable-new-content-rendering-timeout", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion,IntensiveWakeUpThrottling", "--remote-debugging-port=0", `--user-data-dir=${profile}`, `--window-size=${WIDTH},${HEIGHT}`, "about:blank"],
    { stdio: "ignore" },
  );
  let port;
  for (let i = 0; i < 150 && !port; i++) {
    try {
      port = readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split("\n")[0];
    } catch {
      await sleep(100);
    }
  }
  if (!port) throw new Error("Chrome did not open its DevTools port");
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const pending = new Map();
  const waiters = new Map();
  const errors = [];
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (!p) return;
      clearTimeout(p.timer);
      if (m.error) p.reject(new Error(`${p.method}: ${m.error.message}`));
      else p.resolve(m.result);
    } else if (waiters.has(m.method)) {
      const w = waiters.get(m.method);
      waiters.delete(m.method);
      w(m.params);
    } else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value ?? a.description).join(" "));
  });
  const send = (method, params = {}, wait = 30000) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      const timer = setTimeout(() => {
        pending.delete(n);
        reject(new Error(`${method} did not answer in ${wait / 1000}s`));
      }, wait);
      pending.set(n, { resolve, reject, method, timer });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const once = (method) => new Promise((r) => waiters.set(method, r));
  const ev = async (expression, wait) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, wait);
    if (r.exceptionDetails) throw new Error(`evaluate: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
    return r.result.value;
  };
  const close = async () => {
    try {
      await send("Browser.close", {}, 3000);
    } catch {}
    await sleep(200);
    chrome.kill("SIGKILL");
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
    } catch {}
  };
  return { send, once, ev, close, errors };
}

const browser = await launch();
const { send, once, ev } = browser;
let ffmpeg = null;
let encoded = null;
let frames = 0;
let failed = null;
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE * ZOOM, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: THEME }, { name: "prefers-reduced-motion", value: "no-preference" }] });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: CLOCK });
  const loaded = once("Page.loadEventFired");
  await send("Page.navigate", { url: ORIGIN + scene.path + (QUERY ? (scene.path.includes("?") ? "&" : "?") + QUERY : "") }, 60000);
  await loaded;
  await ev(`(async () => { await document.fonts.ready; const s = document.createElement("style"); s.textContent = ${JSON.stringify(STYLE)}; document.head.appendChild(s); })()`);
  // Hydration, lazy chunks and the first paint settle on the real clock.
  await sleep(Number(opt("settle", "2500")));
  await ev(`document.fonts.ready.then(() => document.fonts.size)`);

  // ---- the pointer and the frame loop
  const CURSOR_SIZE = (scene.cursorSize ?? 1.5) / ZOOM;
  const pos = { ...(scene.start ?? { x: WIDTH * 0.7, y: HEIGHT * 0.78 }) };
  let down = false;
  let depth = 0;
  let pointerShown = scene.pointer !== false;
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pos.x, y: pos.y });
  // Makes the browser draw a real frame now: one pixel is asked for, the whole page is brought up to date for it.
  const nudge = () => send("Page.captureScreenshot", { format: "jpeg", quality: 1, clip: { x: 0, y: 0, width: 1, height: 1, scale: 1 } }, 20000);
  await ev(`window.__freeze()`);
  await nudge();

  if (STILLS) mkdirSync(out, { recursive: true });
  else {
    mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    ffmpeg = spawn(
      FFMPEG,
      [
        "-v", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
        "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
        ...(HEVC
          ? ["-c:v", "libx265", "-preset", "medium", "-crf", CRF, "-profile:v", "main", "-pix_fmt", "yuv420p", "-tag:v", "hvc1", "-x265-params", `log-level=error:keyint=${FPS}:min-keyint=${FPS}:scenecut=0:open-gop=0:repeat-headers=1:colorprim=bt709:transfer=bt709:colormatrix=bt709:range=limited`]
          : ["-c:v", "libx264", "-preset", "slow", "-crf", CRF, "-profile:v", "high"]),
        "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
        "-r", String(FPS), "-movflags", "+faststart", "-an", path.resolve(out),
      ],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    encoded = new Promise((resolve, reject) => ffmpeg.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)))));
  }

  // The ordinary PNG encoder. Chrome's fast one ("optimizeForSpeed") never returns on some frames and leaves the
  // browser wedged, which cost whole takes; --fast asks for it anyway.
  const FAST = has("fast");
  const shoot = async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return (await send("Page.captureScreenshot", { format: "png", optimizeForSpeed: FAST && attempt === 0 }, 30000)).data;
      } catch (error) {
        if (attempt === 2) throw error;
      }
    }
  };
  let missed = 0;
  // A picture now and then comes out with patches of the page not yet drawn (black squares, a missing pointer),
  // mostly at 4K where graphics memory runs short. The page is frozen between frames, so two pictures of one frame
  // must be the same: each frame is taken until two in a row match.
  let retaken = 0;
  let unsettled = 0;
  // --once takes each frame a single time: quick drafts at --scale 1, where torn pictures have not been seen.
  const ONCE = has("once");
  const shootClean = async () => {
    let last = await shoot();
    if (ONCE) return last;
    let lastPx = readPng(Buffer.from(last, "base64"));
    for (let i = 0; i < 6; i++) {
      const again = await shoot();
      if (again === last) {
        if (i) retaken++;
        return again;
      }
      const againPx = readPng(Buffer.from(again, "base64"));
      const off = strongDiff(lastPx, againPx);
      if (off <= 24) {
        if (i) retaken++;
        return again;
      }
      if (retaken + unsettled < 8) console.log(`\nframe ${frames}: two pictures differ in ${off} pixels, taking it again`);
      last = again;
      lastPx = againPx;
    }
    unsettled++;
    console.log(`\nframe ${frames}: no two pictures agreed in 7 tries`);
    return last;
  };
  const started = Date.now();
  // Where the last pointer move was sent, and the move this frame must wait for.
  let at = { ...pos };
  let sent = null;
  let inFlight = null;
  const frame = async () => {
    depth += ((down ? 1 : 0) - depth) * 0.42;
    if (Math.abs((down ? 1 : 0) - depth) < 0.01) depth = down ? 1 : 0;
    const cursor = pointerShown ? { x: pos.x, y: pos.y, scale: 1 - 0.12 * depth, size: CURSOR_SIZE } : { x: -400, y: -400, scale: 1, size: CURSOR_SIZE };
    // Every frame starts with the pointer's place sent again, moved or not, and a forced frame to deliver it: what
    // lies under a resting pointer changes as the page redraws, and Chrome would only notice on a timer of its own.
    if (!inFlight) inFlight = send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pos.x, y: pos.y, button: down ? "left" : "none", buttons: down ? 1 : 0 });
    await nudge();
    await inFlight;
    inFlight = null;
    // The page has seen the move by now; if ever it has not, another forced frame hands it over.
    for (let tries = 0; sent && tries < 6; tries++) {
      const seenAt = await ev("window.__seen()");
      if (Math.hypot(seenAt.x - sent.x, seenAt.y - sent.y) <= 1.5) break;
      if (tries === 5 && ++missed <= 3) console.log(`\nframe ${frames}: pointer sent to ${sent.x.toFixed(1)}, ${sent.y.toFixed(1)} but the page last saw ${seenAt.x}, ${seenAt.y}`);
      await nudge();
    }
    sent = null;
    await ev(`window.__tick(${DT}, ${JSON.stringify(cursor)})`);
    const t = Math.round(frames * DT);
    if (STILLS) {
      const hit = STILLS.find((ms) => Math.round(ms / DT) === frames);
      if (hit !== undefined) {
        const file = path.join(out, `${scene.name ?? "shot"}-${String(hit).padStart(5, "0")}.png`);
        writeFileSync(file, Buffer.from(await shootClean(), "base64"));
        console.log(file);
      } else await nudge();
    } else {
      const data = Buffer.from(await shootClean(), "base64");
      if (!ffmpeg.stdin.write(data)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
    }
    frames++;
    if (frames % FPS === 0) process.stdout.write(`\r${(t / 1000).toFixed(1)} s recorded, ${((Date.now() - started) / 1000).toFixed(0)} s spent`);
  };

  const clamp01 = (k) => Math.min(1, Math.max(0, k));
  // The path of a hand: slow out, slow in.
  const travel = (k) => k * k * k * (k * (6 * k - 15) + 10);
  const mouse = (type, extra = {}) => {
    if (type === "mouseMoved" && Math.hypot(pos.x - at.x, pos.y - at.y) > 0.01) sent = { x: pos.x, y: pos.y };
    at = { x: pos.x, y: pos.y };
    const done = send("Input.dispatchMouseEvent", { type, x: pos.x, y: pos.y, button: down || type !== "mouseMoved" ? "left" : "none", buttons: down ? 1 : 0, ...extra });
    // Chrome hands a move to the page with its next frame and answers only then; with the screen asleep no frame
    // comes by itself for about 0.3 s. The move is left in flight here and the frame loop forces that frame.
    if (type !== "mouseMoved") return done;
    inFlight = done;
    return undefined;
  };
  const pointOf = async (to) => {
    if (typeof to === "function") return to();
    if (typeof to !== "string" && !to.sel) return to;
    const { sel, ax = 0.5, ay = 0.5, dx = 0, dy = 0 } = typeof to === "string" ? { sel: to } : to;
    const r = await api.rect(sel);
    return { x: r.left + r.width * ax + dx, y: r.top + r.height * ay + dy };
  };
  const api = {
    width: WIDTH,
    height: HEIGHT,
    ev,
    get pos() {
      return { ...pos };
    },
    /** The box of a CSS selector, or of text=<exact words>. */
    rect: async (sel) => {
      const [scope, words] = sel.includes("text=") ? [sel.slice(0, sel.indexOf("text=")).replace(/\s*>>\s*$/, ""), sel.slice(sel.indexOf("text=") + 5)] : [sel, null];
      const find = words !== null
        ? `[...(${scope ? `document.querySelector(${JSON.stringify(scope)})` : "document"}).querySelectorAll("button,a,[role],label,span,li,h1,h2,h3,h4,p")].filter((el) => el.textContent.trim() === ${JSON.stringify(words)} && el.getClientRects().length).pop()`
        : `document.querySelector(${JSON.stringify(sel)})`;
      const r = await ev(`(() => { const el = ${find}; if (!el) return null; const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; })()`);
      if (!r) throw new Error(`not found: ${sel}`);
      return r;
    },
    wait: async (ms) => {
      for (let n = Math.round(ms / DT); n > 0; n--) await frame();
    },
    /** Glides to a point, a selector or { sel, ax, ay, dx, dy } over ms, along a slight bow. */
    move: async (to, ms, { arc = 0.06, ease = travel } = {}) => {
      const from = { ...pos };
      const target = await pointOf(to);
      const dx = target.x - from.x;
      const dy = target.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const n = Math.max(1, Math.round(ms / DT));
      for (let i = 1; i <= n; i++) {
        const k = ease(clamp01(i / n));
        const bow = Math.sin(Math.PI * k) * arc * len;
        pos.x = from.x + dx * k - (dy / len) * bow;
        pos.y = from.y + dy * k + (dx / len) * bow;
        await mouse("mouseMoved");
        await frame();
      }
    },
    press: async (holdMs = 0) => {
      down = true;
      await mouse("mousePressed", { clickCount: 1 });
      if (holdMs) await api.wait(holdMs);
    },
    release: async () => {
      await mouse("mouseReleased", { clickCount: 1, buttons: 0 });
      down = false;
    },
    click: async (holdMs = 90) => {
      await api.press(holdMs);
      await api.release();
    },
    /** Types text a key at a time; each key waits `ms`, give or take a little, so it reads as a hand. */
    type: async (text, ms = 85) => {
      let i = 0;
      for (const ch of text) {
        await send("Input.dispatchKeyEvent", { type: "keyDown", text: ch, unmodifiedText: ch, key: ch });
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
        await api.wait(ms * (0.75 + 0.5 * ((Math.sin(++i * 12.9898) * 43758.5453) % 1 + 1) % 1));
      }
    },
    key: async (key, code = key, vk = { Enter: 13, Escape: 27, Tab: 9, Backspace: 8, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39 }[key] ?? 0) => {
      await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
    },
    pointer: (shown) => {
      pointerShown = shown;
    },
  };

  await scene.run(api);
  if (missed) console.log(`\n${missed} pointer moves were not seen by the page in time`);
  console.log(`\n${retaken} frames had to be taken again; ${unsettled} never settled`);
  if (ffmpeg) {
    ffmpeg.stdin.end();
    await encoded;
  }
  console.log(`\r${frames} frames (${(frames / FPS).toFixed(2)} s) ${STILLS ? "stepped" : `written to ${out}`}, ${((Date.now() - started) / 1000).toFixed(0)} s spent      `);
} catch (error) {
  failed = error;
  if (ffmpeg) ffmpeg.stdin.destroy();
  // A page that stops answering is spinning in its own code: say where.
  if (/did not answer/.test(error.message)) {
    try {
      const paused = once("Debugger.paused");
      await send("Debugger.enable", {}, 5000);
      await send("Debugger.pause", {}, 5000);
      const { callFrames } = await Promise.race([paused, sleep(5000).then(() => ({ callFrames: [] }))]);
      console.log("\nthe page was busy in:");
      for (const f of callFrames.slice(0, 8)) console.log("  " + (f.functionName || "(anonymous)") + "  " + String(f.url).replace(/^.*\/_next\//, "").slice(0, 90) + ":" + (f.location.lineNumber + 1));
    } catch (e) {
      console.log("could not read where the page was busy: " + e.message);
    }
  }
} finally {
  if (browser.errors.length) console.log("page errors:\n" + [...new Set(browser.errors)].slice(0, 10).join("\n"));
  await browser.close();
}
if (failed) {
  console.error(`\nfailed at frame ${frames}: ${failed.message}`);
  process.exit(1);
}
