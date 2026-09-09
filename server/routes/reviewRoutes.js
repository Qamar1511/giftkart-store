const express = require("express");
const { createReview, getMyReviews, getBrandReviews } = require("../controllers/reviewController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Public — anyone viewing a brand page.
router.get("/brand/:slug", getBrandReviews);

// Signed-in shoppers only.
router.post("/", protect, createReview);
router.get("/mine", protect, getMyReviews);

module.exports = router;
