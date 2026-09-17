const express = require("express");
const {
  signup,
  login,
  getProfile,
  forgotPassword,
  resetPassword,
  verifyOtp,
  resendOtp,
  updateCurrency,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { loginLimiter, signupLimiter, otpLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);
router.get("/me", protect, getProfile);
router.patch("/currency", protect, updateCurrency);
router.post("/forgot-password", signupLimiter, forgotPassword);
router.post("/reset-password/:token", signupLimiter, resetPassword);
router.post("/verify-otp", otpLimiter, verifyOtp);
router.post("/resend-otp", otpLimiter, resendOtp);

module.exports = router;
