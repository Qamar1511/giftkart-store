const mongoose = require("mongoose");

// A signup attempt that hasn't been OTP-verified yet. Nothing lands in the
// real User collection until the email code is confirmed — so a failed OTP
// email, a typo'd address, or someone abandoning the form never leaves a
// dangling unverified account that blocks a future signup attempt with
// "an account with this email/phone already exists".
//
// Documents here expire on their own (TTL index below) 15 minutes after
// creation, so an abandoned attempt just disappears — no manual cleanup
// job needed, unlike the abandoned-order sweep in stockReservation.js.
const pendingSignupSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  // Pre-hashed with bcrypt in the controller — never the plaintext password.
  passwordHash: { type: String, required: true },
  currency: { type: String, enum: ["INR", "USDT"], default: "INR" },
  // Hashed (sha256) 6-digit code emailed to the user — never store it raw.
  otpHash: { type: String, required: true },
  otpExpires: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now, expires: 900 }, // 15 min TTL
});

module.exports = mongoose.model("PendingSignup", pendingSignupSchema);
