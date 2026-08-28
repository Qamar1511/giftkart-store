const express = require("express");
const {
  getGiftCardProducts,
  requestStockNotification,
  getCurrencyConfig,
} = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getGiftCardProducts);
// Live price multipliers set by admin — fetched once on app start.
router.get("/currencies", getCurrencyConfig);
router.post("/notify", protect, requestStockNotification);

module.exports = router;
