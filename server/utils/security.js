// Shared input-hardening helpers. Everything here is dependency-free on
// purpose, so it can be unit-tested and reused anywhere in the server.

/* ----------------------------- HTML escaping ---------------------------- */

// Anything a visitor typed (name, email, message, filename…) must go through
// this before being placed inside an HTML email. Without it, a name like
// `<a href="http://evil">Click</a>` renders as a live link inside an email
// that appears to come from our own domain.
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[ch];
  });

/* ------------------------------ Validators ------------------------------ */

// Letters (any language), combining marks, spaces and . ' - only. No digits,
// brackets, slashes, `$`, `=`, `;` or quotes — i.e. nothing that is useful
// for injecting code through a "name" field. 2–60 characters.
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{1,59}$/u;
const isValidName = (value) => typeof value === "string" && NAME_RE.test(value.trim());

const EMAIL_RE = /^[^\s@<>"'`;,()[\]\\]{1,64}@[^\s@<>"'`;,()[\]\\]{1,255}\.[A-Za-z]{2,24}$/;
const isValidEmail = (value) =>
  typeof value === "string" && value.trim().length <= 254 && EMAIL_RE.test(value.trim());

const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;
const isValidPhone = (value) => typeof value === "string" && PHONE_RE.test(value.trim());

// Country names: letters, spaces, . ' - — up to 56 chars.
const COUNTRY_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{1,55}$/u;
const isValidCountry = (value) => typeof value === "string" && COUNTRY_RE.test(value.trim());

// Blockchain transaction hashes/IDs (hex, base58, base64 — TRC20, ERC20/BEP20,
// SOL, TON). Anything with spaces, quotes, brackets or `<>{}$` is not one.
const TX_HASH_RE = /^[A-Za-z0-9+/=_-]{20,128}$/;
const isValidTxHash = (value) => typeof value === "string" && TX_HASH_RE.test(value);

// Binance / Bybit account UIDs.
const EXCHANGE_UID_RE = /^[A-Za-z0-9_-]{3,30}$/;
const isValidExchangeUid = (value) => typeof value === "string" && EXCHANGE_UID_RE.test(value);

/* --------------------- NoSQL operator injection guard -------------------- */

// A JSON body like { "email": { "$gt": "" } } turns a harmless lookup into a
// query operator. Nothing in this app legitimately sends keys starting with
// `$` or containing `.`, so any request that does is rejected outright.
const hasUnsafeKey = (value, depth = 0) => {
  if (depth > 10) return true; // absurdly deep payloads are never legitimate here
  if (Array.isArray(value)) return value.some((item) => hasUnsafeKey(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.keys(value).some(
      (key) =>
        key.startsWith("$") ||
        key.includes(".") ||
        key === "__proto__" ||
        key === "constructor" ||
        key === "prototype" ||
        hasUnsafeKey(value[key], depth + 1)
    );
  }
  return false;
};

const rejectUnsafeInput = (req, res, next) => {
  if (hasUnsafeKey(req.body) || hasUnsafeKey(req.query) || hasUnsafeKey(req.params)) {
    return res.status(400).json({ message: "Invalid request." });
  }
  next();
};

/* -------------------------- Upload type detection ------------------------ */

// Decides what an uploaded file REALLY is from its first bytes, instead of
// trusting the filename or the Content-Type the sender claimed (both are
// fully attacker-controlled). Returns { ext, mime } for the only types we
// accept — PDF, PNG, JPEG, WebP — or null for anything else (text files,
// HTML, SVG, scripts, executables, …).
const detectUploadType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") {
    return { ext: ".pdf", mime: "application/pdf" };
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: ".png", mime: "image/png" };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: ".jpg", mime: "image/jpeg" };
  }
  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return { ext: ".webp", mime: "image/webp" };
  }
  return null;
};

module.exports = {
  escapeHtml,
  isValidName,
  isValidEmail,
  isValidPhone,
  isValidCountry,
  isValidTxHash,
  isValidExchangeUid,
  rejectUnsafeInput,
  detectUploadType,
};
