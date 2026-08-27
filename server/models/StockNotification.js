const mongoose = require("mongoose");

const stockNotificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true },
    brand: { type: String, required: true },
    denomination: { type: Number, required: true },
    // Reset to false whenever someone (re)subscribes, flipped to true once
    // we've emailed them after new stock lands — so we never spam the same
    // person twice for the same restock.
    notified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One active subscription per user per brand+denomination.
stockNotificationSchema.index({ user: 1, brand: 1, denomination: 1 }, { unique: true });

module.exports = mongoose.model("StockNotification", stockNotificationSchema);
