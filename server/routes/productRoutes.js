const express = require("express");
const { getGiftCardProducts } = require("../controllers/productController");

const router = express.Router();

router.get("/", getGiftCardProducts);

module.exports = router;
