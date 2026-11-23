const express = require("express");
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createPaypalOrder,
  capturePaypalOrder,
  createUsdtInvoice,
  usdtWebhook,
  getUsdtPaymentStatus,
  getUpiQrDetails,
  mockConfirmPayment,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Public webhook — must stay unauthenticated, NOWPayments calls this directly
router.post("/usdt/webhook", express.json(), usdtWebhook);

router.use(protect);

router.post("/razorpay/create", createRazorpayOrder);
router.post("/razorpay/verify", verifyRazorpayPayment);

router.post("/paypal/create", createPaypalOrder);
router.post("/paypal/capture", capturePaypalOrder);

router.post("/usdt/create", createUsdtInvoice);
router.get("/usdt/status/:orderId", getUsdtPaymentStatus);

router.get("/upi/qr/:orderId", getUpiQrDetails);

// Test mode only — see mockConfirmPayment for the production safety check
router.post("/mock/confirm", mockConfirmPayment);

module.exports = router;
