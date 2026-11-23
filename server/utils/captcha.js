const crypto = require("crypto");

// A self-hosted text captcha: a short random mix of letters and digits drawn
// as a distorted, noisy image. No third-party service, no new dependency.
//
// How it fits together:
//   GET /api/captcha        → createChallenge(): returns { id, image }
//                             (the ANSWER never leaves the server)
//   a protected POST        → requireCaptcha middleware → verifyCaptcha(id, answer)
//
// Why the characters are drawn as strokes instead of <text>: if the SVG
// contained <text>A7K2…</text>, any script could read the answer straight out
// of the file without looking at the picture at all. Each character here is a
// path, then randomly scaled / rotated / skewed and crossed with noise lines.
//
// Honest limits: this keeps out the cheap scripts that were spraying forms
// (they can't just POST — they have to read an image first), but no home-made
// captcha stops a determined attacker running OCR or a paid solving service.
// If that ever becomes the problem, swap in Cloudflare Turnstile (free).

const TTL_MS = 10 * 60 * 1000; // long enough to fill in a whole signup form
const MAX_PENDING = 5000; // hard cap so the in-memory store can't be flooded
const LENGTH = 6;
const WIDTH = 210;
const HEIGHT = 70;

/* ------------------------------- Glyph set -------------------------------
   Each glyph is an SVG path in a 10 × 14 box (y points down). Look-alikes are
   left out on purpose (no 0/O, 1/I/L-vs-I, 5/S, 2/Z, 8/B pairs) so a person
   never has to guess: digits 2–9 and the letters below.                    */
const GLYPHS = {
  A: "M0 14 L5 0 L10 14 M2 9 L8 9",
  C: "M10 3 Q8 0 5 0 Q0 0 0 7 Q0 14 5 14 Q8 14 10 11",
  D: "M1 0 L1 14 L5 14 Q10 14 10 7 Q10 0 5 0 L1 0",
  E: "M9 0 L1 0 L1 14 L9 14 M1 7 L7 7",
  F: "M9 0 L1 0 L1 14 M1 7 L7 7",
  H: "M1 0 L1 14 M9 0 L9 14 M1 7 L9 7",
  J: "M9 0 L9 10 Q9 14 5 14 Q1 14 1 10",
  K: "M1 0 L1 14 M9 0 L1 8 M4 6 L9 14",
  M: "M0 14 L0 0 L5 8 L10 0 L10 14",
  N: "M1 14 L1 0 L9 14 L9 0",
  P: "M1 14 L1 0 L6 0 Q10 0 10 3.5 Q10 7 6 7 L1 7",
  R: "M1 14 L1 0 L6 0 Q10 0 10 3.5 Q10 7 6 7 L1 7 M5 7 L10 14",
  T: "M0 0 L10 0 M5 0 L5 14",
  U: "M1 0 L1 9 Q1 14 5 14 Q9 14 9 9 L9 0",
  X: "M0 0 L10 14 M10 0 L0 14",
  Y: "M0 0 L5 7 L10 0 M5 7 L5 14",
  2: "M1 3 Q1 0 5 0 Q9 0 9 4 Q9 7 5 9 L1 14 L10 14",
  3: "M1 1.5 Q3 0 5 0 Q9 0 9 3.5 Q9 7 4.5 7 Q10 7 10 10.5 Q10 14 5 14 Q2 14 0 12.5",
  4: "M8 14 L8 0 L0 10 L10 10",
  5: "M9 0 L2 0 L1 6.5 Q3 5.5 5.5 5.5 Q10 5.5 10 9.5 Q10 14 5 14 Q2 14 0.5 12.5",
  6: "M9 1 Q7 0 5 0 Q1 0 1 7 L1 9 Q1 14 5.5 14 Q10 14 10 9.5 Q10 5.5 5.5 5.5 Q2 5.5 1 8",
  7: "M0 0 L10 0 L4 14",
  8: "M5 7 Q1 7 1 3.5 Q1 0 5 0 Q9 0 9 3.5 Q9 7 5 7 Q0 7 0 10.5 Q0 14 5 14 Q10 14 10 10.5 Q10 7 5 7",
  9: "M1 13 Q3 14 5 14 Q9 14 9 7 L9 5 Q9 0 4.5 0 Q0 0 0 4.5 Q0 8.5 4.5 8.5 Q8 8.5 9 6",
};
const ALPHABET = Object.keys(GLYPHS);

/* ------------------------------ Randomness ------------------------------- */
// Cryptographically random, so the characters and the distortion can't be
// predicted from earlier captchas.
const rand = (min, max) => min + (crypto.randomInt(0, 100001) / 100000) * (max - min);
const pick = (list) => list[crypto.randomInt(0, list.length)];
const f = (n) => Math.round(n * 10) / 10;

const INK = ["#1e3a8a", "#7c2d12", "#14532d", "#581c87", "#9f1239", "#0f172a", "#0e7490"];
const NOISE = ["#94a3b8", "#a8a29e", "#c4b5fd", "#fdba74", "#5eead4", "#fda4af"];
const BACKGROUNDS = ["#eef2ff", "#f0fdf4", "#fff7ed", "#fdf2f8", "#f0f9ff"];

// A wavy line across the whole image. Lines drawn BEHIND the characters are
// pale and a bit thick; lines drawn IN FRONT are thin but dark, in the same
// colours as the characters — so a script can't strip the noise out just by
// ignoring pale pixels, while a person still reads the letters easily.
const noiseCurve = ({ colors, minW, maxW, minOpacity, maxOpacity }) => {
  const y = () => f(rand(4, HEIGHT - 4));
  const x = (a, b) => f(rand(a, b));
  return (
    `<path d="M${x(0, 25)} ${y()} C ${x(50, 90)} ${y()}, ${x(110, 160)} ${y()}, ${x(185, WIDTH)} ${y()}" ` +
    `fill="none" stroke="${pick(colors)}" stroke-width="${f(rand(minW, maxW))}" ` +
    `stroke-opacity="${f(rand(minOpacity, maxOpacity))}"/>`
  );
};
const backNoise = () => noiseCurve({ colors: NOISE, minW: 1.2, maxW: 2.2, minOpacity: 0.6, maxOpacity: 0.95 });
const frontNoise = () => noiseCurve({ colors: INK, minW: 0.9, maxW: 1.4, minOpacity: 0.55, maxOpacity: 0.8 });

// Renders the image for a given answer string.
const drawSvg = (answer) => {
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`);
  parts.push(`<rect width="${WIDTH}" height="${HEIGHT}" fill="${pick(BACKGROUNDS)}"/>`);

  // Noise behind the characters
  for (let i = 0; i < 3; i++) parts.push(backNoise());
  for (let i = 0; i < 40; i++) {
    parts.push(
      `<circle cx="${f(rand(0, WIDTH))}" cy="${f(rand(0, HEIGHT))}" r="${f(rand(0.7, 1.9))}" fill="${pick(NOISE)}" fill-opacity="${f(rand(0.3, 0.7))}"/>`
    );
  }

  // The characters: each its own size, tilt, slant, colour and position.
  const step = (WIDTH - 36) / answer.length;
  [...answer].forEach((ch, i) => {
    const scale = rand(1.5, 2.0);
    const rotate = rand(-20, 20);
    const skew = rand(-14, 14);
    const cx = 18 + step * i + step / 2 + rand(-3, 3);
    const cy = HEIGHT / 2 + rand(-5, 5);
    const width = rand(2.3, 3.1) / scale; // keeps the line weight steady after scaling
    parts.push(
      `<path d="${GLYPHS[ch]}" fill="none" stroke="${pick(INK)}" stroke-width="${f(width)}" ` +
        `stroke-linecap="round" stroke-linejoin="round" ` +
        `transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rotate)}) skewX(${f(skew)}) scale(${f(scale)}) translate(-5 -7)"/>`
    );
  });

  // Noise in front, crossing the characters
  for (let i = 0; i < 2; i++) parts.push(frontNoise());
  parts.push("</svg>");
  return parts.join("");
};

/* ------------------------------ Challenge store --------------------------
   In memory on purpose: it holds at most MAX_PENDING short-lived entries, and
   losing them on a restart just means someone is shown a fresh captcha.     */
const store = new Map(); // id → { answer, expiresAt }

const sweepExpired = () => {
  const now = Date.now();
  // Entries are inserted in time order, so the oldest are always first.
  for (const [id, entry] of store) {
    if (entry.expiresAt > now) break;
    store.delete(id);
  }
};

const createChallenge = () => {
  sweepExpired();
  while (store.size >= MAX_PENDING) store.delete(store.keys().next().value);

  const answer = Array.from({ length: LENGTH }, () => pick(ALPHABET)).join("");
  const id = crypto.randomBytes(16).toString("hex");
  store.set(id, { answer, expiresAt: Date.now() + TTL_MS });

  const image = `data:image/svg+xml;base64,${Buffer.from(drawSvg(answer)).toString("base64")}`;
  return { id, image };
};

const MESSAGES = {
  missing: "Please enter the characters shown in the captcha image.",
  expired: "That captcha expired. A new one has been loaded — please enter it.",
  wrong: "Incorrect captcha. A new one has been loaded — please try again.",
};

// ONE attempt per captcha: the entry is removed the moment it's checked,
// whether the answer was right or wrong. Otherwise a bot could guess the
// same captcha over and over.
const verifyCaptcha = (id, answer) => {
  if (typeof id !== "string" || typeof answer !== "string" || !answer.trim()) {
    if (typeof id === "string") store.delete(id);
    return { ok: false, message: MESSAGES.missing };
  }
  const entry = store.get(id);
  store.delete(id);
  if (!entry || entry.expiresAt < Date.now()) return { ok: false, message: MESSAGES.expired };

  const given = Buffer.from(answer.trim().toUpperCase());
  const expected = Buffer.from(entry.answer);
  const ok = given.length === expected.length && crypto.timingSafeEqual(given, expected);
  return ok ? { ok: true } : { ok: false, message: MESSAGES.wrong };
};

module.exports = { createChallenge, verifyCaptcha, drawSvg, GLYPHS, ALPHABET, LENGTH, TTL_MS, MAX_PENDING, __store: store };
