const express = require("express");
const {
  getAllOrders,
  verifyUpiPayment,
  rejectUpiPayment,
  getStockSummary,
  getStockCodes,
  addStockCodes,
  deleteStockCode,
} = require("../controllers/adminController");
const {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} = require("../controllers/adminBlogController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, adminOnly);

router.get("/orders", getAllOrders);
router.post("/orders/:id/verify-upi", verifyUpiPayment);
router.post("/orders/:id/reject-upi", rejectUpiPayment);

router.get("/stock", getStockSummary);
router.get("/stock/:brand/:denomination", getStockCodes);
router.post("/stock", addStockCodes);
router.delete("/stock/:codeId", deleteStockCode);

router.get("/blog", getAllPosts);
router.get("/blog/:id", getPostById);
router.post("/blog", createPost);
router.put("/blog/:id", updatePost);
router.delete("/blog/:id", deletePost);

module.exports = router;
