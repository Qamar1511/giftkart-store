const Order = require("../models/Order");
const generateInvoiceNumber = require("../utils/generateInvoiceNumber");
const streamInvoicePDF = require("../utils/pdfInvoice");
const { getBrand, INR_TO_USD_RATE } = require("../config/catalog");
const { refundRazorpayPayment, refundPaypalCapture } = require("./paymentController");

const ALLOWED_PAYMENT_METHODS = ["razorpay", "card", "debit_card", "upi_manual", "usdt", "paypal"];
const FOREIGN_CURRENCY_METHODS = ["paypal", "usdt"]; // charged in USD, not INR

// @route  POST /api/orders
// @access Private
// Creates the order (one or more cart line items) in "placed / pending
// payment" state. Pricing is always computed server-side from `items` —
// we never trust a client-supplied amount. The actual payment (Razorpay /
// PayPal / USDT / manual UPI) is created and confirmed in separate calls
// that reference this order's _id.
exports.createOrder = async (req, res) => {
  try {
    const { items, paymentMethod, address } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Your cart is empty" });
    }
    if (!address || !address.line1 || !address.city || !address.pincode) {
      return res.status(400).json({ message: "A complete address is required" });
    }
    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    const orderItems = [];
    let totalInr = 0;

    for (const rawItem of items) {
      const brandSlug = rawItem.brand;
      const denomination = Number(rawItem.denomination);
      const quantity = Number(rawItem.quantity);

      const brand = getBrand(brandSlug);
      if (!brand) {
        return res.status(400).json({ message: `Invalid brand: ${rawItem.brand}` });
      }
      if (!brand.denominations.includes(denomination)) {
        return res
          .status(400)
          .json({ message: `Invalid ${brand.name} denomination: ${rawItem.denomination}` });
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        return res.status(400).json({ message: "Quantity must be between 1 and 20" });
      }

      orderItems.push({
        brand: brand.slug,
        brandName: brand.name,
        denomination,
        quantity,
        unitPrice: denomination,
        giftCardCodes: [],
      });
      totalInr += denomination * quantity;
    }

    const isForeignCurrency = FOREIGN_CURRENCY_METHODS.includes(paymentMethod);
    const totalAmount = isForeignCurrency ? +(totalInr * INR_TO_USD_RATE).toFixed(2) : totalInr;
    const currency = isForeignCurrency ? "USD" : "INR";

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      totalAmount,
      currency,
      paymentMethod,
      address,
    });

    res.status(201).json({ order });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Couldn't create the order. Please try again." });
  }
};

// @route  GET /api/orders
// @access Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: "Couldn't load your orders." });
  }
};

// @route  GET /api/orders/:id
// @access Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.status(200).json({ order });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ message: "Couldn't load this order." });
  }
};

// @route  POST /api/orders/:id/cancel
// @access Private
// Cancels the order and attempts an automatic refund where the provider
// supports it. USDT/crypto payments can't be auto-reversed, so those are
// flagged for manual review instead. Manual UPI orders that were already
// verified are also flagged for manual review (no gateway to call).
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus === "cancelled") {
      return res.status(400).json({ message: "This order is already cancelled" });
    }
    const anyCodesDelivered = order.items.some((item) => item.giftCardCodes.length > 0);
    if (anyCodesDelivered) {
      return res.status(400).json({
        message:
          "This gift card has already been delivered. Contact support for a refund review.",
      });
    }

    order.orderStatus = "cancelled";
    order.cancelReason = req.body.reason || "Cancelled by customer";

    if (order.paymentStatus === "paid") {
      if (["razorpay", "card", "debit_card"].includes(order.paymentMethod)) {
        await refundRazorpayPayment(order);
        order.refundStatus = "processed";
        order.paymentStatus = "refunded";
      } else if (order.paymentMethod === "paypal") {
        await refundPaypalCapture(order);
        order.refundStatus = "processed";
        order.paymentStatus = "refunded";
      } else {
        // usdt (can't auto-reverse crypto) and upi_manual (no gateway at all)
        order.refundStatus = "manual_review";
      }
    }

    await order.save();
    res.status(200).json({ message: "Order cancelled", order });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ message: "Couldn't cancel this order. Please try again." });
  }
};

// @route  POST /api/orders/:id/submit-utr
// @access Private
// Used by the manual-UPI flow: customer pays via any UPI app using the
// QR/ID we show them, then submits the UTR/reference number here. This
// does NOT mark the order as paid automatically — someone has to check
// the UTR against the real bank/UPI statement first. See
// scripts/verifyManualPayment.js for that step.
exports.submitUtr = async (req, res) => {
  try {
    const { utrNumber } = req.body;
    if (!utrNumber || utrNumber.trim().length < 4) {
      return res.status(400).json({ message: "Enter a valid UTR / reference number" });
    }

    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentMethod !== "upi_manual") {
      return res.status(400).json({ message: "This order isn't a manual UPI order" });
    }

    order.utrNumber = utrNumber.trim();
    order.verificationStatus = "submitted";
    await order.save();

    res.status(200).json({ message: "UTR submitted — we'll verify and deliver shortly", order });
  } catch (error) {
    console.error("Submit UTR error:", error);
    res.status(500).json({ message: "Couldn't submit the UTR. Please try again." });
  }
};

// @route  GET /api/orders/:id/invoice
// @access Private
exports.downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id }).populate(
      "user",
      "fullName email"
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentStatus !== "paid") {
      return res.status(400).json({ message: "Invoice is available after payment is confirmed" });
    }

    if (!order.invoiceNumber) {
      order.invoiceNumber = await generateInvoiceNumber();
      await order.save();
    }

    streamInvoicePDF(order, res);
  } catch (error) {
    console.error("Invoice error:", error);
    res.status(500).json({ message: "Couldn't generate the invoice." });
  }
};
