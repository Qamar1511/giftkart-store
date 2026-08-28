const mongoose = require("mongoose");

/**
 * Store-wide pricing settings — a SINGLETON document (there is only ever one,
 * pinned by `key: "pricing"`).
 *
 * The catalog stores each card's face value as `denomination`. What we actually
 * charge is DERIVED from it by a per-currency multiplier:
 *
 *   INR  price = denomination × rates.INR    (1.1   → ₹1000 face = ₹1100)
 *   USDT price = denomination × rates.USDT   (0.011 → ₹1000 face = $11)
 *
 * Admin edits these two numbers from Admin → Pricing, so prices can be changed
 * for the whole store without a code deploy. Defaults live in
 * server/config/catalog.js (CURRENCIES[...].rate) and are used whenever this
 * document is missing or a rate is unset.
 */
const pricingSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "pricing",
      unique: true,
      immutable: true,
    },
    rates: {
      INR: { type: Number, min: 0.0001 },
      USDT: { type: Number, min: 0.0000001 },
    },
    // Who last changed the prices — useful for an audit trail.
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PricingSetting", pricingSettingSchema);
