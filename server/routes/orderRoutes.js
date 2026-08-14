const express = require("express");
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  downloadInvoice,
  submitUtr,
} = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", createOrder);
router.get("/", getMyOrders);
router.get("/:id", getOrderById);
router.post("/:id/cancel", cancelOrder);
router.get("/:id/invoice", downloadInvoice);
router.post("/:id/submit-utr", submitUtr);

module.exports = router;
