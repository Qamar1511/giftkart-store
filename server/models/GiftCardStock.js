const mongoose = require("mongoose");
const { BRAND_SLUGS, ALL_DENOMINATIONS } = require("../config/catalog");

const giftCardStockSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
      enum: BRAND_SLUGS,
    },
    denomination: {
      type: Number,
      required: true,
      enum: ALL_DENOMINATIONS,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    // Set the moment an order is placed (before payment) so a second
    // customer can't also "buy" the same unit while this one is still
    // going through checkout/payment/manual UPI review. Cleared again if
    // the order is cancelled, delivered, or abandoned (see
    // utils/stockReservation.js).
    reservedFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    reservedAt: {
      type: Date,
      default: null,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  { timestamps: true }
);

// Fast lookup of the next available/reservable code for a brand + denomination
giftCardStockSchema.index({ brand: 1, denomination: 1, isUsed: 1, reservedFor: 1 });

module.exports = mongoose.model("GiftCardStock", giftCardStockSchema);
