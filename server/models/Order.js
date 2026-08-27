const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: "India" },
  },
  { _id: false }
);

// One cart line item. giftCardCodes is filled in (one code per unit of
// quantity) by utils/deliverGiftCard.js once the whole order is paid.
// brandName is snapshotted at order time so order history / invoices still
// read correctly even if a brand is ever renamed or removed from the catalog.
const orderItemSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true },
    brandName: { type: String, required: true },
    denomination: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true }, // in the order's `currency`, snapshotted at order time
    giftCardCodes: { type: [String], default: [] },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },

    // Total charged, in `currency` below. Always computed server-side from
    // `items` + the payment method's conversion rate — never trust a client-
    // supplied amount.
    totalAmount: { type: Number, required: true },
    currency: { type: String, enum: ["INR", "USDT", "USD"], default: "INR" },

    paymentMethod: {
      type: String,
      enum: ["razorpay", "card", "debit_card", "upi_manual", "usdt", "paypal"],
      required: true,
    },

    // Provider-side identifiers, set as the flow progresses
    providerOrderId: String, // razorpay order_id / paypal order id / nowpayments payment_id
    providerPaymentId: String, // razorpay payment_id / paypal capture id / nowpayments txn hash
    providerSignature: String,

    // Manual UPI flow: customer scans a static QR (built from your own UPI ID)
    // and pays via any UPI app, then types in the UTR/reference number here.
    // Since there's no gateway involved, someone has to check the UTR against
    // the actual bank/UPI statement and mark it verified (see
    // scripts/verifyManualPayment.js) before the gift card is delivered.
    utrNumber: String,

    // Manual USDT flow: same idea as manual UPI, but customer sends USDT to
    // your own wallet address (e.g. copied from Binance/Bybit) and pastes in
    // the transaction hash/ID here. Someone has to check it on a block
    // explorer and mark it verified before the gift card is delivered.
    usdtTxId: String,

    verificationStatus: {
      type: String,
      enum: ["not_submitted", "submitted", "verified", "rejected"],
      default: "not_submitted",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    orderStatus: {
      type: String,
      enum: ["placed", "delivered", "cancelled"],
      default: "placed",
    },
    deliveredAt: Date,

    address: { type: addressSchema, required: true },

    invoiceNumber: { type: String, unique: true, sparse: true },

    cancelReason: String,
    refundStatus: {
      type: String,
      enum: ["none", "requested", "processed", "manual_review"],
      default: "none",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
