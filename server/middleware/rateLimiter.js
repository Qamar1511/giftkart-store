const rateLimit = require("express-rate-limit");

// Shared error shape so the frontend's existing `err.response.data.message`
// handling (already used everywhere for auth errors) shows something sane
// instead of express-rate-limit's default plain-text response.
const handler = (req, res) => {
  res.status(429).json({ message: "Too many attempts. Please wait a bit and try again." });
};

// Login: guards against password brute-forcing. Keyed on IP — 10 tries per
// 15 minutes is generous for a real user who mistypes a password a couple
// of times, but shuts down a script trying thousands of passwords.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Signup / forgot-password: mainly here to stop the email-sending endpoints
// being used to spam a stranger's inbox with OTP/reset emails.
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// OTP verify / resend: the 6-digit code is only 1,000,000 possibilities, so
// this is the one that matters most — without it, a script could try all of
// them well inside the 10-minute expiry window. This caps *guesses per IP*;
// verifyOtp in authController.js separately locks the OTP itself after 5
// wrong tries against the same email, so both the network layer and the
// account layer are covered.
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Contact form: it's public (no login) and sends an email + can save a file
// per request, so it's the easiest thing to flood. 5 per hour per IP is
// plenty for a real person — the one-open-query-per-email rule in
// contactController.js stops the same person re-sending, and this stops
// someone rotating through made-up email addresses from one machine.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Logged-in actions are limited per ACCOUNT (falling back to IP), not just
// per IP — many customers share one mobile-carrier IP in India, and one
// abusive account shouldn't be able to dodge a limit by changing networks.
// These routes all sit behind `protect`, so req.user is always set here.
const perUser = (req) => req.user?.id || req.ip;

// Creating orders: each one reserves real stock for a while, so spamming it
// is a way to lock stock up without paying.
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: perUser,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Submitting payment proof (UTR / tx hash / exchange UID). A real customer
// submits this once per order; this just caps abuse.
const proofLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: perUser,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// Safety net over the whole API, per IP. Deliberately generous so normal
// browsing — including several people behind one shared IP — never trips it,
// but a script hammering endpoints does.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

module.exports = {
  loginLimiter,
  signupLimiter,
  otpLimiter,
  contactLimiter,
  orderLimiter,
  proofLimiter,
  apiLimiter,
};
