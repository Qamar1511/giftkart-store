const express = require("express");
const { getGiftCardProducts, requestStockNotification } = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getGiftCardProducts);
router.post("/notify", protect, requestStockNotification);

module.exports = router;
