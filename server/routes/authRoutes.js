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

// New-account registration kill switch.
// Closed by default. To reopen signups set REGISTRATION_OPEN=true in the
// server env (Render -> Environment) and redeploy. Existing users can still
// log in and reset passwords; only creating accounts is blocked.
const registrationOpen = (req, res, next) => {
  if (String(process.env.REGISTRATION_OPEN || "").toLowerCase() === "true") return next();
  return res.status(403).json({
    message: "New registrations are temporarily closed. Existing customers can still log in.",
  });
};

router.post("/signup", registrationOpen, signupLimiter, signup);
router.post("/login", loginLimiter, login);
router.get("/me", protect, getProfile);
router.patch("/currency", protect, updateCurrency);
router.post("/forgot-password", signupLimiter, forgotPassword);
router.post("/reset-password/:token", signupLimiter, resetPassword);
router.post("/verify-otp", registrationOpen, otpLimiter, verifyOtp);
router.post("/resend-otp", registrationOpen, otpLimiter, resendOtp);

module.exports = router;