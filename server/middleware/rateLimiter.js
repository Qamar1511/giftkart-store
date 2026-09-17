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

module.exports = { loginLimiter, signupLimiter, otpLimiter };
