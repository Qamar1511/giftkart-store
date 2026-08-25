const crypto = require("crypto");
const axios = require("axios");
const Razorpay = require("razorpay");
const Order = require("../models/Order");
const deliverGiftCard = require("../utils/deliverGiftCard");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ----------------------------- RAZORPAY -----------------------------
   Covers Razorpay's own checkout, plus the "card", "debit_card" and "upi"
   options — those all go through the same Razorpay order under the hood;
   we just tell the Razorpay Checkout widget which method tab to open first.
------------------------------------------------------------------------ */

// @route  POST /api/payments/razorpay/create
// @access Private
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100), // paise
      currency: "INR",
      receipt: order._id.toString(),
    });

    order.providerOrderId = razorpayOrder.id;
    await order.save();

    res.status(200).json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay create order error:", error);
    res.status(500).json({ message: "Couldn't start the payment. Please try again." });
  }
};

// @route  POST /api/payments/razorpay/verify
// @access Private
// Called by the frontend from the Razorpay Checkout success handler.
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      order.paymentStatus = "failed";
      await order.save();
      return res.status(400).json({ message: "Payment verification failed" });
    }

    order.paymentStatus = "paid";
    order.providerPaymentId = razorpay_payment_id;
    order.providerSignature = razorpay_signature;
    await order.save();

    const deliveredOrder = await deliverGiftCard(order);

    res.status(200).json({ message: "Payment verified", order: deliveredOrder });
  } catch (error) {
    console.error("Razorpay verify error:", error);
    res.status(500).json({ message: "Couldn't verify the payment." });
  }
};

// Used internally by orderController.cancelOrder — not a route itself.
exports.refundRazorpayPayment = async (order) => {
  if (!order.providerPaymentId) return;
  await razorpay.payments.refund(order.providerPaymentId, {
    amount: Math.round(order.totalAmount * 100),
  });
};

/* ------------------------------ PAYPAL ------------------------------
   Uses the redirect/approve flow (PayPal Orders API v2) so we don't need
   to embed the PayPal JS SDK. Requires a PayPal Developer app (sandbox or
   live) — set PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET in .env.
------------------------------------------------------------------------ */

const PAYPAL_BASE_URL =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getPaypalAccessToken() {
  const { data } = await axios.post(
    `${PAYPAL_BASE_URL}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      auth: {
        username: process.env.PAYPAL_CLIENT_ID,
        password: process.env.PAYPAL_CLIENT_SECRET,
      },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );
  return data.access_token;
}

// @route  POST /api/payments/paypal/create
// @access Private
exports.createPaypalOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const accessToken = await getPaypalAccessToken();

    const { data } = await axios.post(
      `${PAYPAL_BASE_URL}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: order._id.toString(),
            amount: { currency_code: "USD", value: order.totalAmount.toFixed(2) },
          },
        ],
        application_context: {
          return_url: `${process.env.CLIENT_URL}/paypal/return?orderId=${order._id}`,
          cancel_url: `${process.env.CLIENT_URL}/cart`,
        },
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    order.providerOrderId = data.id;
    await order.save();

    const approveLink = data.links.find((link) => link.rel === "approve")?.href;
    res.status(200).json({ approveUrl: approveLink });
  } catch (error) {
    console.error("PayPal create order error:", error?.response?.data || error);
    res.status(500).json({ message: "Couldn't start PayPal checkout." });
  }
};

// @route  POST /api/payments/paypal/capture
// @access Private
// Called once PayPal redirects the user back to our /paypal/return page.
exports.capturePaypalOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const accessToken = await getPaypalAccessToken();
    const { data } = await axios.post(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${order.providerOrderId}/capture`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (data.status !== "COMPLETED") {
      order.paymentStatus = "failed";
      await order.save();
      return res.status(400).json({ message: "PayPal payment was not completed" });
    }

    order.paymentStatus = "paid";
    order.providerPaymentId = data.purchase_units[0]?.payments?.captures[0]?.id;
    await order.save();

    const deliveredOrder = await deliverGiftCard(order);
    res.status(200).json({ message: "Payment captured", order: deliveredOrder });
  } catch (error) {
    console.error("PayPal capture error:", error?.response?.data || error);
    res.status(500).json({ message: "Couldn't confirm the PayPal payment." });
  }
};

exports.refundPaypalCapture = async (order) => {
  if (!order.providerPaymentId) return;
  const accessToken = await getPaypalAccessToken();
  await axios.post(
    `${PAYPAL_BASE_URL}/v2/payments/captures/${order.providerPaymentId}/refund`,
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
};

/* --------------------------- MANUAL USDT -------------------------------
   No payment gateway involved — same idea as manual UPI below, but for
   crypto. We show your own wallet address (copy it from Binance, Bybit, or
   any exchange/wallet that supports the network you set) as a QR code, and
   let the customer paste in the transaction hash after sending USDT.
   Set USDT_WALLET_ADDRESS and USDT_NETWORK in .env. Verification is
   manual — see scripts/verifyManualPayment.js.
------------------------------------------------------------------------ */

// @route  GET /api/payments/usdt/wallet/:orderId
// @access Private
exports.getUsdtWalletDetails = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, user: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const walletAddress = process.env.USDT_WALLET_ADDRESS;
    const network = process.env.USDT_NETWORK || "TRC20";
    if (!walletAddress) {
      return res.status(500).json({ message: "USDT wallet address isn't configured on the server yet." });
    }

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
      walletAddress
    )}`;

    res.status(200).json({
      walletAddress,
      network,
      amount: order.totalAmount,
      qrImageUrl,
    });
  } catch (error) {
    console.error("USDT wallet details error:", error);
    res.status(500).json({ message: "Couldn't load USDT payment details." });
  }
};

/* ---------------------------- MANUAL UPI ------------------------------
   No payment gateway involved — we just show your own UPI ID as a QR code
   (a standard "upi://pay" deep link) and let the customer paste in the
   UTR/reference number after paying. Set UPI_ID and UPI_PAYEE_NAME in
   .env. Verification is manual — see scripts/verifyManualPayment.js.
------------------------------------------------------------------------ */

// @route  GET /api/payments/upi/qr/:orderId
// @access Private
exports.getUpiQrDetails = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, user: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const upiId = process.env.UPI_ID;
    const payeeName = process.env.UPI_PAYEE_NAME || "GIFTKART";
    if (!upiId) {
      return res.status(500).json({ message: "UPI ID isn't configured on the server yet." });
    }

    const upiLink =
      `upi://pay?pa=${encodeURIComponent(upiId)}` +
      `&pn=${encodeURIComponent(payeeName)}` +
      `&am=${order.totalAmount}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent(`Order ${order._id}`)}`;

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
      upiLink
    )}`;

    res.status(200).json({ upiId, payeeName, amount: order.totalAmount, upiLink, qrImageUrl });
  } catch (error) {
    console.error("UPI QR error:", error);
    res.status(500).json({ message: "Couldn't load UPI payment details." });
  }
};

/* ------------------------------ TEST MODE ------------------------------
   Lets you exercise the full order -> paid -> auto-delivery -> invoice
   flow WITHOUT a real Razorpay/PayPal/NOWPayments account. Disabled
   automatically in production (NODE_ENV=production) so it can never be
   used to get a free gift card on a live store.
------------------------------------------------------------------------ */

// @route  POST /api/payments/mock/confirm
// @access Private (and only when NODE_ENV !== "production")
exports.mockConfirmPayment = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Test mode is disabled in production" });
    }

    const { orderId } = req.body;
    const order = await Order.findOne({ _id: orderId, user: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.paymentStatus = "paid";
    order.providerPaymentId = `MOCK-${Date.now()}`;
    await order.save();

    const deliveredOrder = await deliverGiftCard(order);
    res.status(200).json({ message: "Test payment confirmed", order: deliveredOrder });
  } catch (error) {
    console.error("Mock payment error:", error);
    res.status(500).json({ message: "Couldn't simulate the payment." });
  }
};
