const express = require("express");
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createPaypalOrder,
  capturePaypalOrder,
  getUsdtNetworks,
  getUsdtWalletDetails,
  getUpiQrDetails,
  mockConfirmPayment,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/razorpay/create", createRazorpayOrder);
router.post("/razorpay/verify", verifyRazorpayPayment);

router.post("/paypal/create", createPaypalOrder);
router.post("/paypal/capture", capturePaypalOrder);

router.get("/usdt/networks", getUsdtNetworks);
router.get("/usdt/wallet/:orderId", getUsdtWalletDetails);

router.get("/upi/qr/:orderId", getUpiQrDetails);

// Test mode only — see mockConfirmPayment for the production safety check
router.post("/mock/confirm", mockConfirmPayment);

module.exports = router;
