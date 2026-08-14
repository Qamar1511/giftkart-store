const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendEmail, isEmailConfigured } = require("../utils/sendEmail");

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000)); // 6 digits

const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

const sendOtpEmail = (user, otp) =>
  sendEmail({
    to: user.email,
    subject: "Verify your GIFTKART account",
    html: `
      <p>Hi ${user.fullName},</p>
      <p>Your GIFTKART verification code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
      <p>This code expires in 10 minutes. If you didn't create a GIFTKART account, you can ignore this email.</p>
    `,
  });

// @route  POST /api/auth/signup
// @access Public
exports.signup = async (req, res) => {
  try {
    const { fullName, email, phone, password, confirmPassword } = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists" });
    }

    const user = await User.create({ fullName, email, phone, password });

    // If email isn't configured on this server, there's no way to deliver
    // an OTP — fall back to the old instant-signup behaviour so the store
    // still works end-to-end.
    if (!isEmailConfigured()) {
      user.isVerified = true;
      await user.save();

      const token = generateToken(user._id, user.role);
      return res.status(201).json({
        requiresVerification: false,
        message: "Account created successfully",
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    }

    const otp = generateOtp();
    user.otp = hashOtp(otp);
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    try {
      await sendOtpEmail(user, otp);
    } catch (mailError) {
      console.error("Failed to send signup OTP email:", mailError);
      return res.status(500).json({
        message: "Couldn't send the verification email. Please try again.",
      });
    }

    res.status(201).json({
      requiresVerification: true,
      email: user.email,
      message: "We've emailed you a 6-digit code — enter it to verify your account.",
    });
  } catch (error) {
    // Handle mongoose validation errors with a clean message
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0].message;
      return res.status(400).json({ message: firstError });
    }
    console.error("Signup error:", error);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

// @route  POST /api/auth/verify-otp
// @access Public
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+otp +otpExpires");
    if (!user) {
      return res.status(404).json({ message: "No account found for that email" });
    }

    if (user.isVerified) {
      const token = generateToken(user._id, user.role);
      return res.status(200).json({
        message: "Account already verified",
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    }

    if (!user.otp || !user.otpExpires || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "This code has expired. Please request a new one." });
    }

    if (hashOtp(otp) !== user.otp) {
      return res.status(400).json({ message: "Incorrect code. Please try again." });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user._id, user.role);
    res.status(200).json({
      message: "Account verified successfully",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
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

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "No account found for that email" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "This account is already verified" });
    }
    if (!isEmailConfigured()) {
      return res.status(500).json({ message: "Email isn't configured on this server yet." });
    }

    const otp = generateOtp();
    user.otp = hashOtp(otp);
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendOtpEmail(user, otp);

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
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified && isEmailConfigured()) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        requiresVerification: true,
        email: user.email,
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      message: "Logged in successfully",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
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

    // Always respond the same way whether or not the account exists, so
    // this endpoint can't be used to enumerate registered emails.
    const genericMessage =
      "If an account exists for that email, a password reset link has been sent.";

    if (!user) {
      return res.status(200).json({ message: genericMessage });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    res.status(200).json({
      message: genericMessage,
      // TEMPORARY: remove resetToken from the response once real email
      // delivery is wired up. It's only here so the reset flow is usable
      // end-to-end without an email service configured.
      resetToken: rawToken,
    });
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
