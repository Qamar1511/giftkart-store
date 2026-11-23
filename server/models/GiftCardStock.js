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
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  { timestamps: true }
);

// Fast lookup of the next available code for a brand + denomination
giftCardStockSchema.index({ brand: 1, denomination: 1, isUsed: 1 });

module.exports = mongoose.model("GiftCardStock", giftCardStockSchema);
