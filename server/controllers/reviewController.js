const Review = require("../models/Review");
const Order = require("../models/Order");
const User = require("../models/User");

// @route  POST /api/reviews
// @access Private
// Verified-buyer only: the order must belong to this user, be actually
// delivered (codes in hand, not just paid), and contain the brand being
// reviewed. Starts life as "pending" — it only shows up on the brand page
// once an admin approves it.
exports.createReview = async (req, res) => {
  try {
    const { orderId, brand, rating, comment } = req.body;

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5." });
    }
    if (!orderId || !brand) {
      return res.status(400).json({ message: "Missing order or brand." });
    }

    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found." });

    if (order.orderStatus !== "delivered") {
      return res
        .status(400)
        .json({ message: "You can only review a brand after your gift card has been delivered." });
    }

    const orderItem = order.items.find((item) => item.brand === brand);
    if (!orderItem) {
      return res.status(400).json({ message: "This brand isn't part of that order." });
    }

    const existing = await Review.findOne({ user: req.user.id, order: orderId, brand });
    if (existing) {
      return res.status(400).json({ message: "You've already reviewed this brand for this order." });
    }

    // JWT payload only carries { id, role } — fetch the display name fresh
    // rather than trust anything from the request body.
    const buyer = await User.findById(req.user.id).select("fullName");

    const review = await Review.create({
      user: req.user.id,
      order: orderId,
      brand,
      brandName: orderItem.brandName,
      reviewerName: buyer?.fullName || "GIFTKART customer",
      rating: ratingNum,
      comment: (comment || "").trim(),
    });

    res.status(201).json({ message: "Thanks! Your review will appear once it's approved.", review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "You've already reviewed this brand for this order." });
    }
    console.error("Create review error:", error);
    res.status(500).json({ message: "Couldn't submit your review. Please try again." });
  }
};

// @route  GET /api/reviews/mine
// @access Private
// Every review the signed-in user has left, any status — so Order History
// can show "Pending approval" / "Published" instead of just a blank button.
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ reviews });
  } catch (error) {
    console.error("Get my reviews error:", error);
    res.status(500).json({ message: "Couldn't load your reviews." });
  }
};

// @route  GET /api/reviews/brand/:slug
// @access Public
// Only ever returns approved reviews — this is what the brand page renders.
exports.getBrandReviews = async (req, res) => {
  try {
    const { slug } = req.params;
    const reviews = await Review.find({ brand: slug, status: "approved" })
      .sort({ createdAt: -1 })
      .select("reviewerName rating comment createdAt");

    const count = reviews.length;
    const average = count === 0 ? 0 : reviews.reduce((sum, r) => sum + r.rating, 0) / count;

    res.status(200).json({ reviews, average: Math.round(average * 10) / 10, count });
  } catch (error) {
    console.error("Get brand reviews error:", error);
    res.status(500).json({ message: "Couldn't load reviews." });
  }
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

// @route  GET /api/admin/reviews?status=pending
// @access Private/Admin
exports.getAllReviews = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status && status !== "all" ? { status } : {};
    const reviews = await Review.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ reviews });
  } catch (error) {
    console.error("Admin get reviews error:", error);
    res.status(500).json({ message: "Couldn't load reviews." });
  }
};

// @route  POST /api/admin/reviews/:id/approve
// @access Private/Admin
exports.approveReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: "Review not found." });
    res.status(200).json({ message: "Review approved", review });
  } catch (error) {
    console.error("Approve review error:", error);
    res.status(500).json({ message: "Couldn't approve this review." });
  }
};

// @route  POST /api/admin/reviews/:id/reject
// @access Private/Admin
exports.rejectReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: "Review not found." });
    res.status(200).json({ message: "Review rejected", review });
  } catch (error) {
    console.error("Reject review error:", error);
    res.status(500).json({ message: "Couldn't reject this review." });
  }
};
