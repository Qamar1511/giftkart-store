const express = require("express");
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createPaypalOrder,
  capturePaypalOrder,
  getUsdtNetworks,
  getUsdtWalletDetails,
  getInternalTransferDetails,
  getUpiQrDetails,
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

router.get("/internal-transfer/:platform/:orderId", getInternalTransferDetails);

router.get("/upi/qr/:orderId", getUpiQrDetails);


module.exports = router;
