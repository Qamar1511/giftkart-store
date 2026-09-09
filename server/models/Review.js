const mongoose = require("mongoose");

// One review = one verified purchase of one brand. Tied to a specific
// (user, order, brand) so someone can only review a brand they actually
// bought and received, and only once per order — not once per account,
// since a customer might genuinely buy the same brand again later.
const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },

    brand: { type: String, required: true }, // catalog slug, e.g. "psn"
    brandName: { type: String, required: true }, // snapshotted so it survives a brand rename

    // Snapshotted from the user at review time so a display-name change later
    // doesn't rewrite history, and so we never need to populate + expose the
    // full user record just to show "Qamar S." on a brand page.
    reviewerName: { type: String, required: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// A customer can leave at most one review per brand per order.
reviewSchema.index({ user: 1, order: 1, brand: 1 }, { unique: true });
// The brand page query (approved reviews for a brand, newest first).
reviewSchema.index({ brand: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
