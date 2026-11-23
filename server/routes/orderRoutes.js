const express = require("express");
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  downloadInvoice,
  submitUtr,
  submitUsdtTx,
  submitInternalTransferUid,
} = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");
const { orderLimiter, proofLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.use(protect);

router.post("/", orderLimiter, createOrder);
router.get("/", getMyOrders);
router.get("/:id", getOrderById);
router.post("/:id/cancel", proofLimiter, cancelOrder);
router.get("/:id/invoice", downloadInvoice);
router.post("/:id/submit-utr", proofLimiter, submitUtr);
router.post("/:id/submit-usdt-tx", proofLimiter, submitUsdtTx);
router.post("/:id/submit-internal-transfer-uid", proofLimiter, submitInternalTransferUid);

module.exports = router;
