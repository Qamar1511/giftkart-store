const Order = require("../models/Order");
const User = require("../models/User");
const generateInvoiceNumber = require("../utils/generateInvoiceNumber");
const streamInvoicePDF = require("../utils/pdfInvoice");
const {
  getBrand,
  priceFor,
  CURRENCY_CODES,
  CURRENCY_PAYMENT_METHODS,
  DEFAULT_CURRENCY,
  MAX_CARDS_PER_ORDER,
  MONTHLY_SPEND_LIMIT_INR,
  MONTHLY_WINDOW_DAYS,
  orderInrValue,
} = require("../config/catalog");
const { refundRazorpayPayment, refundPaypalCapture } = require("./paymentController");
const { getAvailableCount, reserveStockForOrder, releaseStockForOrder } = require("../utils/stockReservation");

const MAX_QUANTITY_PER_ITEM = 10;

// @route  POST /api/orders
// @access Private
// Creates the order (one or more cart line items) in "placed / pending
// payment" state. Pricing is always computed server-side from `items` +
// the buyer's saved currency — we never trust a client-supplied amount or
// currency. The buying currency comes from the User document (chosen at
// signup, switchable from the navbar) and decides BOTH the price of each
// denomination (INR = face × 1.1, USDT = face × 0.011) and which payment
// methods are allowed (INR → UPI/cards, USDT → crypto). Stock is checked
// here too, against real-time available codes, so a customer can never pay
// for more units than we can deliver. The actual payment is created and
// confirmed in separate calls that reference this order's _id.
exports.createOrder = async (req, res) => {
  try {
    const { items, paymentMethod, address } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Your cart is empty" });
    }
    if (!address || !address.line1 || !address.city || !address.pincode) {
      return res.status(400).json({ message: "A complete address is required" });
    }

    // Buying currency is a server-side truth: read it from the user's saved
    // preference, never from the request body.
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const currency = CURRENCY_CODES.includes(user.currency)
      ? user.currency
      : DEFAULT_CURRENCY;

    // The payment method must be valid for that currency (INR is paid in
    // rupees, USDT is paid on-chain) — reject any mismatch.
    const allowedMethods = CURRENCY_PAYMENT_METHODS[currency] || [];
    if (!allowedMethods.includes(paymentMethod)) {
      return res
        .status(400)
        .json({ message: `That payment method isn't available for ${currency} orders.` });
    }

    const orderItems = [];
    let totalAmount = 0;

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
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
        return res
          .status(400)
          .json({ message: `Quantity must be between 1 and ${MAX_QUANTITY_PER_ITEM} per item` });
      }

      // Friendly pre-check — the real guarantee against over-selling comes
      // from reserveStockForOrder() below, which atomically claims the
      // exact units right after the order is created. This check just
      // avoids creating an order doc at all for an obviously-out-of-stock
      // request.
      const availableStock = await getAvailableCount(brand.slug, denomination);
      if (availableStock < quantity) {
        return res.status(400).json({
          message:
            availableStock > 0
              ? `Only ${availableStock} × ₹${denomination} ${brand.name} code${
                  availableStock === 1 ? "" : "s"
                } left in stock. Please lower the quantity in your cart.`
              : `${brand.name} ₹${denomination} is out of stock right now.`,
          brand: brand.slug,
          denomination,
          availableStock,
        });
      }

      orderItems.push({
        brand: brand.slug,
        brandName: brand.name,
        denomination,
        quantity,
        unitPrice: priceFor(denomination, currency),
        giftCardCodes: [],
      });
      totalAmount += priceFor(denomination, currency) * quantity;
    }

    // INR is charged in whole rupees; USDT keeps 2 decimals. Round the summed
    // total to kill any floating-point drift from the per-unit USDT prices.
    totalAmount =
      currency === "INR" ? Math.round(totalAmount) : +totalAmount.toFixed(2);

    // ----------------------------- Purchase limits -----------------------
    // These caps are enforced here, on the server, because the client cart
    // can be bypassed. See config/catalog.js for the values.
    //
    // (1) At most MAX_CARDS_PER_ORDER gift cards in a single order — counted
    //     as the sum of every line's quantity.
    const totalCards = orderItems.reduce((n, it) => n + it.quantity, 0);
    if (totalCards > MAX_CARDS_PER_ORDER) {
      return res.status(400).json({
        message: `You can buy a maximum of ${MAX_CARDS_PER_ORDER} gift cards in a single order. Please lower the quantity in your cart.`,
        limit: MAX_CARDS_PER_ORDER,
        totalCards,
      });
    }

    // (2) At most MONTHLY_SPEND_LIMIT_INR of purchases per user in any rolling
    //     MONTHLY_WINDOW_DAYS window. We measure in an INR-equivalent value so
    //     the same cap applies to USDT buyers. Orders still counting toward
    //     the tally are the user's non-cancelled orders in the window that are
    //     either paid or awaiting payment (pending) — pending orders count so
    //     a buyer can't slip past the cap by stacking unpaid orders; cancelled,
    //     failed and refunded orders are excluded.
    const since = new Date(Date.now() - MONTHLY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.find({
      user: req.user.id,
      createdAt: { $gte: since },
      paymentStatus: { $in: ["pending", "paid"] },
      orderStatus: { $ne: "cancelled" },
    }).select("items");
    const spentInr = Math.round(
      recentOrders.reduce((sum, o) => sum + orderInrValue(o.items), 0)
    );
    const thisOrderInr = Math.round(orderInrValue(orderItems));
    if (spentInr + thisOrderInr > MONTHLY_SPEND_LIMIT_INR) {
      const remaining = Math.max(0, MONTHLY_SPEND_LIMIT_INR - spentInr);
      const limitStr = MONTHLY_SPEND_LIMIT_INR.toLocaleString("en-IN");
      return res.status(400).json({
        message:
          remaining > 0
            ? `This order would take you over your monthly purchase limit of ₹${limitStr}. You can still spend ₹${remaining.toLocaleString(
                "en-IN"
              )} this month — please lower the quantity in your cart.`
            : `You've reached your monthly purchase limit of ₹${limitStr}. Please try again next month.`,
        monthlyLimitInr: MONTHLY_SPEND_LIMIT_INR,
        spentInr,
        remainingInr: remaining,
      });
    }

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      totalAmount,
      currency,
      paymentMethod,
      address,
    });

    // Actually claim the stock now — atomically, per unit — so a second
    // customer's order can never succeed against the same codes while this
    // one is still going through checkout. If we can't get everything this
    // order needs (a race lost to someone else, or stock changed between
    // the pre-check above and now), undo the order and say so clearly.
    const reservation = await reserveStockForOrder(order._id, orderItems);
    if (!reservation.success) {
      await Order.deleteOne({ _id: order._id });
      const rBrand = getBrand(reservation.brand);
      return res.status(409).json({
        message:
          reservation.availableStock > 0
            ? `Only ${reservation.availableStock} × ₹${reservation.denomination} ${rBrand.name} code${
                reservation.availableStock === 1 ? "" : "s"
              } left — someone just grabbed the rest. Please lower the quantity in your cart.`
            : `${rBrand.name} ₹${reservation.denomination} just sold out. Please remove it from your cart.`,
        brand: reservation.brand,
        denomination: reservation.denomination,
        availableStock: reservation.availableStock,
      });
    }

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
    await releaseStockForOrder(order._id);
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
    const trimmedUtr = (utrNumber || "").trim();
    if (!/^\d{12}$/.test(trimmedUtr)) {
      return res.status(400).json({ message: "Enter a valid 12-digit UTR / reference number" });
    }

    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentMethod !== "upi_manual") {
      return res.status(400).json({ message: "This order isn't a manual UPI order" });
    }

    order.utrNumber = trimmedUtr;
    order.verificationStatus = "submitted";
    await order.save();

    res.status(200).json({ message: "UTR submitted — we'll verify and deliver shortly", order });
  } catch (error) {
    console.error("Submit UTR error:", error);
    res.status(500).json({ message: "Couldn't submit the UTR. Please try again." });
  }
};

// @route  POST /api/orders/:id/submit-usdt-tx
// @access Private
// Used by the manual-USDT flow: customer sends USDT to the wallet address
// we show them, then submits the transaction hash here. This does NOT mark
// the order as paid automatically — someone has to check the tx on a block
// explorer first. See scripts/verifyManualPayment.js for that step.
exports.submitUsdtTx = async (req, res) => {
  try {
    const { txId } = req.body;
    const trimmedTxId = (txId || "").trim();
    if (trimmedTxId.length < 10) {
      return res.status(400).json({ message: "Enter a valid transaction hash / ID" });
    }

    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentMethod !== "usdt") {
      return res.status(400).json({ message: "This order isn't a manual USDT order" });
    }

    order.usdtTxId = trimmedTxId;
    order.verificationStatus = "submitted";
    await order.save();

    res.status(200).json({ message: "Transaction ID submitted — we'll verify and deliver shortly", order });
  } catch (error) {
    console.error("Submit USDT tx error:", error);
    res.status(500).json({ message: "Couldn't submit the transaction ID. Please try again." });
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
