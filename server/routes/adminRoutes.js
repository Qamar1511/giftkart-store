const express = require("express");
const multer = require("multer");
const {
  getAllOrders,
  verifyUpiPayment,
  rejectUpiPayment,
  getStockSummary,
  getStockCodes,
  addStockCodes,
  deleteStockCode,
  getPricing,
  updatePricing,
} = require("../controllers/adminController");
const {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  uploadCoverImage,
} = require("../controllers/adminBlogController");
const { getAllReviews, approveReview, rejectReview } = require("../controllers/reviewController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, adminOnly);

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/orders", getAllOrders);
router.post("/orders/:id/verify-upi", verifyUpiPayment);
router.post("/orders/:id/reject-upi", rejectUpiPayment);

router.get("/stock", getStockSummary);
router.get("/stock/:brand/:denomination", getStockCodes);
router.post("/stock", addStockCodes);
router.delete("/stock/:codeId", deleteStockCode);

// Store-wide price multipliers (Admin → Pricing). One number per currency
// reprices the entire catalog.
router.get("/pricing", getPricing);
router.put("/pricing", updatePricing);

router.get("/blog", getAllPosts);
router.get("/blog/:id", getPostById);
router.post("/blog", createPost);
router.put("/blog/:id", updatePost);
router.delete("/blog/:id", deletePost);
router.post("/blog/upload-image", uploadImage.single("image"), uploadCoverImage);

router.get("/reviews", getAllReviews);
router.post("/reviews/:id/approve", approveReview);
router.post("/reviews/:id/reject", rejectReview);

module.exports = router;
