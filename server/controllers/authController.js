const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PendingSignup = require("../models/PendingSignup");
const { sendEmail, isEmailConfigured } = require("../utils/sendEmail");
const { CURRENCY_CODES, DEFAULT_CURRENCY } = require("../config/catalog");

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// The user fields we hand back to the client after auth. Kept in one place
// so signup / verify / login / profile all return the same shape (and so
// `currency` is never accidentally dropped from one of them). Mirrors what
// the frontend persists in its session — see authService.saveSession.
const publicUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  currency: user.currency || DEFAULT_CURRENCY,
});

// Normalise a client-supplied currency to a valid code, defaulting safely.
const normaliseCurrency = (value) =>
  CURRENCY_CODES.includes(value) ? value : DEFAULT_CURRENCY;

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000)); // 6 digits

const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

const sendOtpEmail = (fullName, email, otp) =>
  sendEmail({
    to: email,
    subject: "Verify your GIFTKART account",
    html: `
      <p>Hi ${fullName},</p>
      <p>Your GIFTKART verification code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
      <p>This code expires in 10 minutes. If you did not create a GIFTKART account, you can ignore this email.</p>
    `,
  });

// @route  POST /api/auth/signup
// @access Public
//
// Nothing is written to the User collection here. We only create a
// PendingSignup — the account is born the moment the email OTP is
// verified, not before. That way a code that never arrives, a typo'd
// address, or someone abandoning the form never leaves a dangling
// unverified User that blocks a future signup attempt with "already
// exists".
exports.signup = async (req, res) => {
  try {
    const { fullName, email, phone, password, confirmPassword, currency } = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!isEmailConfigured()) {
      return res.status(500).json({
        message: "Email verification isn't configured on this server yet. Please try again shortly.",
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    // `phone` arrives with its country code already prepended by the
    // frontend (e.g. "+919149783414") — validate against that, not the
    // bare 10-digit format.
    if (phone.startsWith("+91")) {
      if (!/^[6-9]\d{9}$/.test(phone.slice(3))) {
        return res.status(400).json({ message: "Enter a valid 10-digit Indian mobile number" });
      }
    } else {
      const digitsOnly = phone.replace(/\D/g, "");
      if (digitsOnly.length < 6 || digitsOnly.length > 14) {
        return res.status(400).json({ message: "Enter a valid phone number" });
      }
    }

    const chosenCurrency = normaliseCurrency(currency);
    const normalisedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ $or: [{ email: normalisedEmail }, { phone }] });
    if (existingUser) {
      const field = existingUser.email === normalisedEmail ? "email" : "phone number";
      return res.status(409).json({ message: `An account with this ${field} already exists` });
    }

    // Clear out any stale pending attempt for this email/phone first — a
    // retry (typo fix, expired code, etc.) should start clean rather than
    // collide with the unique index on email.
    await PendingSignup.deleteMany({ $or: [{ phone }, { email: normalisedEmail }] });

    const otp = generateOtp();
    const passwordHash = await bcrypt.hash(password, 10);

    await PendingSignup.create({
      fullName,
      email: normalisedEmail,
      phone,
      passwordHash,
      currency: chosenCurrency,
      otpHash: hashOtp(otp),
      otpExpires: Date.now() + 10 * 60 * 1000,
    });

    try {
      await sendOtpEmail(fullName, normalisedEmail, otp);
    } catch (mailError) {
      console.error("Failed to send signup OTP email:", mailError);
      await PendingSignup.deleteOne({ email: normalisedEmail });
      return res.status(500).json({
        message: "Couldn't send the verification email. Please try again.",
      });
    }

    res.status(201).json({
      requiresVerification: true,
      email: normalisedEmail,
      message: "We've emailed you a 6-digit code — enter it to verify your account.",
    });
  } catch (error) {
    // Handle mongoose validation errors with a clean message
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0].message;
      return res.status(400).json({ message: firstError });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: "A signup is already in progress for this email. Please wait a moment and try again." });
    }
    console.error("Signup error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// @route  POST /api/auth/verify-otp
// @access Public
//
// The account actually gets created here, once the code checks out — this
// is the ONLY place a User document is created via signup.
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const normalisedEmail = email.toLowerCase();
    const pending = await PendingSignup.findOne({ email: normalisedEmail });
    if (!pending) {
      return res.status(404).json({
        message: "No pending signup found for that email — it may have expired. Please sign up again.",
      });
    }

    if (!pending.otpExpires || pending.otpExpires < Date.now()) {
      return res.status(400).json({ message: "This code has expired. Please request a new one." });
    }

    if (hashOtp(otp) !== pending.otpHash) {
      return res.status(400).json({ message: "Incorrect code. Please try again." });
    }

    // Someone else may have taken this email/phone while this signup was
    // pending — re-check right before actually creating the account.
    const clash = await User.findOne({ $or: [{ email: pending.email }, { phone: pending.phone }] });
    if (clash) {
      await PendingSignup.deleteOne({ _id: pending._id });
      const field = clash.email === pending.email ? "email" : "phone number";
      return res.status(409).json({ message: `An account with this ${field} already exists` });
    }

    const user = await User.create({
      fullName: pending.fullName,
      email: pending.email,
      phone: pending.phone,
      password: pending.passwordHash, // already hashed — the pre-save hook detects and skips re-hashing
      currency: pending.currency,
      isVerified: true,
    });

    await PendingSignup.deleteOne({ _id: pending._id });

    const token = generateToken(user._id, user.role);
    res.status(200).json({
      message: "Account verified successfully",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email or phone number already exists" });
    }
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// @route  POST /api/auth/resend-otp
// @access Public
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalisedEmail = email.toLowerCase();
    const pending = await PendingSignup.findOne({ email: normalisedEmail });
    if (!pending) {
      return res.status(404).json({
        message: "No pending signup found for that email — it may have expired. Please sign up again.",
      });
    }
    if (!isEmailConfigured()) {
      return res.status(500).json({ message: "Email verification isn't configured on this server yet." });
    }

    const otp = generateOtp();
    pending.otpHash = hashOtp(otp);
    pending.otpExpires = Date.now() + 10 * 60 * 1000;
    await pending.save();

    await sendOtpEmail(pending.fullName, normalisedEmail, otp);

    res.status(200).json({ message: "We've sent a new code to your email." });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// @route  POST /api/auth/login
// @access Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(404).json({
        message: "This email isn't registered with us. Please sign up first.",
        notRegistered: true,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password. Please try again." });
    }

    // No unverified User documents can exist anymore — accounts are only
    // ever created post-verification (see verifyOtp above) — so there's
    // nothing further to check here.
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: "Logged in successfully",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// @route  GET /api/auth/me
// @access Private (requires authMiddleware)
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// @route  PATCH /api/auth/currency
// @access Private
// Lets a logged-in customer switch their buying currency (INR <-> USDT)
// from the navbar. Returns the refreshed public user so the client can
// update its stored session.
exports.updateCurrency = async (req, res) => {
  try {
    const { currency } = req.body;
    if (!CURRENCY_CODES.includes(currency)) {
      return res.status(400).json({ message: "Unsupported currency" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.currency = currency;
    await user.save();

    res.status(200).json({ message: "Currency updated", user: publicUser(user) });
  } catch (error) {
    console.error("Update currency error:", error);
    res.status(500).json({ message: "Couldn't update your currency. Please try again." });
  }
};

// @route  POST /api/auth/forgot-password
// @access Public
// Generates a one-time reset token valid for 1 hour. In production this
// token would be emailed to the user via a mail service (e.g. nodemailer +
// SMTP/SES); no mail service is wired up in this project yet, so it's
// returned directly in the response for now — swap that out once email
// sending is configured, and stop returning resetToken in the response.
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "This email isn't registered with us." });
    }

    const genericMessage = "A password reset link has been sent to your email.";

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

    if (!isEmailConfigured()) {
      // No email service configured on this server yet — hand back the raw
      // link so the flow still works end-to-end for local dev/testing.
      return res.status(200).json({ message: genericMessage, resetToken: rawToken });
    }

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your GIFTKART password",
        html: `
          <p>Hi ${user.fullName},</p>
          <p>Click the link below to set a new password. This link expires in 1 hour.</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });
    } catch (mailError) {
      console.error("Failed to send password reset email:", mailError);
      // Don't leak the failure to the client in a way that reveals the
      // account exists — but do surface a generic retry message.
      return res.status(500).json({
        message: "Couldn't send the reset email right now. Please try again shortly.",
      });
    }

    res.status(200).json({ message: genericMessage });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// @route  POST /api/auth/reset-password/:token
// @access Public
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({ message: "This reset link is invalid or has expired" });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};
