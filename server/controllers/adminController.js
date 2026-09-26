const Order = require("../models/Order");
const GiftCardStock = require("../models/GiftCardStock");
const StockNotification = require("../models/StockNotification");
const deliverGiftCard = require("../utils/deliverGiftCard");
const { sendEmail } = require("../utils/sendEmail");
const { streamOrdersCsv, streamOrdersPdf } = require("../utils/exportOrders");
const { BRANDS, CURRENCIES, CURRENCY_CODES, ALL_DENOMINATIONS, getRates, priceFor } = require("../config/catalog");
const { savePricing, readPricingDoc, DEFAULT_RATES } = require("../utils/pricing");
const { refundRazorpayPayment, refundPaypalCapture } = require("./paymentController");
const { releaseStockForOrder } = require("../utils/stockReservation");

// Emails everyone who clicked "Notify me" for this brand+denomination, then
// marks them notified so we never email the same person twice for the same
// restock. Safe to call even when email isn't configured (sendEmail just
// no-ops and returns false in that case).
async function notifyWaitingCustomers(brandSlug, denomination) {
  const waiting = await StockNotification.find({ brand: brandSlug, denomination, notified: false });
  console.log(`[notify] ${waiting.length} subscriber(s) waiting for ${brandSlug} ₹${denomination}`);
  if (waiting.length === 0) return;

  const brandDef = BRANDS.find((b) => b.slug === brandSlug);
  const brandName = brandDef?.name || brandSlug;

  for (const sub of waiting) {
    let sent;
    try {
      sent = await sendEmail({
        to: sub.email,
        subject: `Back in stock: ${brandName} ₹${denomination} gift card`,
        html: `
          <p>Good news — <strong>${brandName} ₹${denomination}</strong> is back in stock on GIFTKART.</p>
          <p><a href="${process.env.CLIENT_URL}">Grab it before it runs out again →</a></p>
        `,
      });
    } catch (err) {
      console.error(`Couldn't notify ${sub.email}:`, err.message);
      continue; // don't let one bad address block the rest of the batch
    }

    // sendEmail resolves to `false` (no throw) when Brevo isn't configured —
    // don't mark this subscriber notified in that case, or they'd silently
    // never get an email even after the config is fixed.
    if (!sent) {
      console.error(`Skipped notifying ${sub.email}: email isn't configured (BREVO_API_KEY/EMAIL_FROM missing).`);
      continue;
    }

    console.log(`[notify] Email sent to ${sub.email} for ${brandSlug} ₹${denomination}`);
    sub.notified = true;
    await sub.save();
  }
}

// @route  GET /api/admin/orders
// @access Admin
// Optional ?status=upi_pending filters to manual-payment orders (UPI or
// USDT) awaiting verification — the queue an admin actually needs to work
// through daily.
exports.getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status === "upi_pending") {
      filter.paymentMethod = { $in: ["upi_manual", "usdt", "binance_uid", "bybit_uid", "razorpay"] };
      filter.verificationStatus = "submitted";
    } else if (status === "cancel_pending") {
      filter.cancelRequested = true;
    } else if (status) {
      filter.orderStatus = status;
    }

    const orders = await Order.find(filter)
      .populate("user", "fullName email phone")
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json({ orders });
  } catch (error) {
    console.error("Admin get orders error:", error);
    res.status(500).json({ message: "Couldn't load orders right now." });
  }
};

// @route  GET /api/admin/orders/revenue-by-month
// @access Admin
// Powers the "Revenue collected — by month" table + chart on the dashboard.
// Deliberately a separate aggregation query instead of reusing getAllOrders'
// result: that list is capped at 200 orders for the orders table, which
// would silently under-count revenue for older months once a store has more
// than 200 orders. This aggregates every paid order in the database.
exports.getMonthlyRevenue = async (req, res) => {
  try {
    const rows = await Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            currency: { $ifNull: ["$currency", "INR"] },
          },
          total: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
    ]);

    // Reshape into one row per month with all currencies side by side, e.g.
    // { monthKey: "2026-09", year: 2026, month: 9, totals: { INR: 12100, USDT: 55 }, orderCount: 48 }
    // orderCount is the number of completed (paid) orders that month, summed
    // across currencies — each order belongs to exactly one currency bucket,
    // so this total is exact, not an approximation.
    const byMonth = new Map();
    for (const row of rows) {
      const { year, month, currency } = row._id;
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      if (!byMonth.has(monthKey)) {
        byMonth.set(monthKey, { monthKey, year, month, totals: {}, orderCount: 0 });
      }
      const entry = byMonth.get(monthKey);
      entry.totals[currency] = row.total;
      entry.orderCount += row.count;
    }

    const months = Array.from(byMonth.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    res.status(200).json({ months });
  } catch (error) {
    console.error("Admin monthly revenue error:", error);
    res.status(500).json({ message: "Couldn't load monthly revenue right now." });
  }

};


// Same effect as scripts/verifyManualPayment.js — check the UTR (for UPI),
// the transaction hash on a block explorer (for USDT), or the payment in
// your Razorpay dashboard, against the real payment yourself first, then
// click this to mark the order paid and trigger gift-card delivery.
exports.verifyUpiPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!["upi_manual", "usdt", "binance_uid", "bybit_uid", "razorpay"].includes(order.paymentMethod)) {
      return res.status(400).json({ message: "This order isn't a manual-review order." });
    }
    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "This order is already marked paid." });
    }

    order.paymentStatus = "paid";
    order.verificationStatus = "verified";
    // Razorpay orders already have their real providerPaymentId set from the
    // signature-verify step — don't clobber it with a manual placeholder.
    order.providerPaymentId =
      order.providerPaymentId || order.utrNumber || order.usdtTxId || `MANUAL-${Date.now()}`;
    await order.save({ validateModifiedOnly: true });

    const delivered = await deliverGiftCard(order);

    res.status(200).json({
      message:
        delivered.orderStatus === "delivered"
          ? "Payment verified and gift card delivered."
          : "Payment verified, but stock ran out for one of the items — top up GiftCardStock and try delivering again.",
      order: delivered,
    });
  } catch (error) {
    console.error("Verify UPI payment error:", error);
    res.status(500).json({ message: "Something went wrong verifying this payment." });
  }
};

// @route  POST /api/admin/orders/:id/reject-upi
// @access Admin
// For when the UTR/transaction ID/Razorpay payment the customer submitted
// doesn't check out — marks the order failed instead of silently ignoring it.
exports.rejectUpiPayment = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!["upi_manual", "usdt", "binance_uid", "bybit_uid", "razorpay"].includes(order.paymentMethod)) {
      return res.status(400).json({ message: "This order isn't a manual-review order." });
    }

    order.verificationStatus = "rejected";
    order.paymentStatus = "failed";
    order.cancelReason = reason || "Payment could not be verified";
    await order.save({ validateModifiedOnly: true });

    res.status(200).json({ message: "Order marked as rejected.", order });
  } catch (error) {
    console.error("Reject UPI payment error:", error);
    res.status(500).json({ message: "Something went wrong rejecting this payment." });
  }
};

// @route  POST /api/admin/orders/:id/approve-cancel
// @access Admin
// Approves a customer's cancellation request: cancels the order and
// refunds it exactly the way the old self-service cancelOrder used to —
// automatically for Razorpay/PayPal, flagged for manual review for
// USDT/internal-transfer/manual-UPI orders where there's no gateway to
// call. Releases any reserved stock either way.
exports.approveCancelRequest = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order.cancelRequested) {
      return res.status(400).json({ message: "This order has no pending cancellation request." });
    }

    order.cancelRequested = false;
    order.orderStatus = "cancelled";

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
        // usdt, binance_uid, bybit_uid (can't auto-reverse crypto/internal
        // transfers) and upi_manual (no gateway at all)
        order.refundStatus = "manual_review";
      }
    }

    await order.save();
    await releaseStockForOrder(order._id);

    res.status(200).json({ message: "Cancellation approved and order refunded.", order });
  } catch (error) {
    console.error("Approve cancel request error:", error);
    res.status(500).json({ message: "Couldn't approve this cancellation. Please try again." });
  }
};

// @route  POST /api/admin/orders/:id/reject-cancel
// @access Admin
// Rejects a customer's cancellation request — the order proceeds as normal.
// If payment is already verified, delivers it immediately in the same
// action (that's the common case: customers mostly request cancellation
// after paying). If payment isn't verified yet, just clears the request so
// admin can verify it normally afterward — it would be wrong to force a
// delivery before payment is actually confirmed.
exports.rejectCancelRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order.cancelRequested) {
      return res.status(400).json({ message: "This order has no pending cancellation request." });
    }

    order.cancelRequested = false;
    order.cancelReason = reason || undefined;
    await order.save({ validateModifiedOnly: true });

    if (order.paymentStatus === "paid" && order.orderStatus !== "delivered") {
      const delivered = await deliverGiftCard(order);
      return res.status(200).json({
        message:
          delivered.orderStatus === "delivered"
            ? "Cancellation rejected and gift card delivered."
            : "Cancellation rejected, but stock ran out for one of the items — top up GiftCardStock and try delivering again.",
        order: delivered,
      });
    }

    res.status(200).json({
      message: "Cancellation rejected. Payment isn't verified yet — verify it normally to deliver.",
      order,
    });
  } catch (error) {
    console.error("Reject cancel request error:", error);
    res.status(500).json({ message: "Couldn't reject this cancellation. Please try again." });
  }
};


// Returns every brand+denomination combo from the catalog with its current
// available (unused) code count — so combos with zero stock still show up
// as a visible "0", not just missing rows.
exports.getStockSummary = async (req, res) => {
  try {
    const counts = await GiftCardStock.aggregate([
      { $match: { isUsed: false } },
      { $group: { _id: { brand: "$brand", denomination: "$denomination" }, count: { $sum: 1 } } },
    ]);

    const countMap = {};
    counts.forEach((c) => {
      countMap[`${c._id.brand}:${c._id.denomination}`] = c.count;
    });

    const summary = [];
    BRANDS.forEach((brand) => {
      brand.denominations.forEach((denomination) => {
        summary.push({
          brand: brand.slug,
          brandName: brand.name,
          denomination,
          available: countMap[`${brand.slug}:${denomination}`] || 0,
        });
      });
    });

    res.status(200).json({ summary });
  } catch (error) {
    console.error("Get stock summary error:", error);
    res.status(500).json({ message: "Couldn't load stock summary." });
  }
};

// @route  GET /api/admin/stock/:brand/:denomination
// @access Admin
// Lists the actual unused codes for one brand+denomination combo, so an
// admin can double-check or delete a mistakenly-added one.
exports.getStockCodes = async (req, res) => {
  try {
    const { brand, denomination } = req.params;
    const codes = await GiftCardStock.find({
      brand,
      denomination: Number(denomination),
      isUsed: false,
    }).sort({ createdAt: 1 });

    res.status(200).json({ codes });
  } catch (error) {
    console.error("Get stock codes error:", error);
    res.status(500).json({ message: "Couldn't load codes." });
  }
};

// @route  POST /api/admin/stock
// @access Admin
// body: { brand, denomination, codes } — codes is a newline-separated blob
// pasted from wherever the admin sourced them. Blank lines and duplicate
// codes (already in stock) are silently skipped and reported back.
exports.addStockCodes = async (req, res) => {
  try {
    const { brand, denomination, codes } = req.body;

    const brandDef = BRANDS.find((b) => b.slug === brand);
    if (!brandDef) {
      return res.status(400).json({ message: "Unknown brand." });
    }
    const denomNum = Number(denomination);
    if (!brandDef.denominations.includes(denomNum)) {
      return res.status(400).json({ message: "That denomination isn't valid for this brand." });
    }

    const lines = String(codes || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return res.status(400).json({ message: "Paste at least one code." });
    }

    const docs = [...new Set(lines)].map((code) => ({
      brand,
      denomination: denomNum,
      code,
    }));

    const result = await GiftCardStock.insertMany(docs, { ordered: false }).catch((err) => {
      // insertMany with ordered:false still throws on duplicate-key errors,
      // but partial inserts already succeeded — pull the count from the
      // error's result rather than failing the whole request.
      if (err.writeErrors) return err.insertedDocs || [];
      throw err;
    });

    const insertedCount = Array.isArray(result) ? result.length : docs.length;
    const skipped = lines.length - insertedCount;

    if (insertedCount > 0) {
      // Fire-and-forget-ish: don't let email hiccups block the admin's
      // response, but do await so we can log failures server-side.
      console.log(`[notify] Stock added for ${brand} ₹${denomNum} — checking for waiting subscribers…`);
      notifyWaitingCustomers(brand, denomNum).catch((err) =>
        console.error("Stock notification email batch failed:", err)
      );
    }

    res.status(200).json({
      message:
        skipped > 0
          ? `Added ${insertedCount} code${insertedCount !== 1 ? "s" : ""}, skipped ${skipped} duplicate${skipped !== 1 ? "s" : ""}.`
          : `Added ${insertedCount} code${insertedCount !== 1 ? "s" : ""}.`,
    });
  } catch (error) {
    console.error("Add stock codes error:", error);
    res.status(500).json({ message: "Couldn't add those codes." });
  }
};

// @route  DELETE /api/admin/stock/:codeId
// @access Admin
// Removes one unused code (e.g. it was a typo). Codes already attached to
// an order (isUsed: true) can't be deleted this way.
exports.deleteStockCode = async (req, res) => {
  try {
    const code = await GiftCardStock.findById(req.params.codeId);
    if (!code) return res.status(404).json({ message: "Code not found." });
    if (code.isUsed) {
      return res.status(400).json({ message: "This code has already been delivered to an order." });
    }
    await code.deleteOne();
    res.status(200).json({ message: "Code removed." });
  } catch (error) {
    console.error("Delete stock code error:", error);
    res.status(500).json({ message: "Couldn't remove this code." });
  }
};

// @route  DELETE /api/admin/stock/:brand/:denomination
// @access Admin
// Removes every still-in-stock (isUsed: false) code for this brand +
// denomination in one go. Codes already delivered to a customer's order
// (isUsed: true) are never touched — those stay as a permanent record of
// what was actually sent out.
exports.deleteAllStockCodes = async (req, res) => {
  try {
    const { brand, denomination } = req.params;
    const denomNum = Number(denomination);

    const result = await GiftCardStock.deleteMany({
      brand,
      denomination: denomNum,
      isUsed: false,
    });

    res.status(200).json({
      message: `Removed ${result.deletedCount} unsold code${result.deletedCount !== 1 ? "s" : ""}.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete all stock codes error:", error);
    res.status(500).json({ message: "Couldn't remove these codes." });
  }
};

/* ============================== PRICING =================================
   Store-wide prices are DERIVED, not stored per product: every card's price
   is its face value (denomination) × a per-currency multiplier.

       INR  price = denomination × rates.INR    (1.1   → ₹1000 face = ₹1100)
       USDT price = denomination × rates.USDT   (0.011 → ₹1000 face = $11)

   So changing one number here reprices the entire catalog at once — no
   redeploy, no per-brand editing. The saved rates live in the PricingSetting
   singleton and are mirrored into config/catalog.js's in-memory cache (see
   utils/pricing.js) which priceFor() reads synchronously everywhere.
   ======================================================================= */

// Everything the Admin → Pricing screen needs, including a live price preview
// so admin can see the effect before/after saving.
async function buildPricingPayload() {
  const rates = getRates();
  const denominations = [...ALL_DENOMINATIONS].sort((a, b) => a - b);

  let doc = null;
  try {
    doc = await readPricingDoc();
  } catch (error) {
    // A missing/unreadable settings doc just means "never customised".
    console.error("Read pricing doc error:", error.message);
  }

  return {
    rates,
    defaults: DEFAULT_RATES,
    currencies: CURRENCY_CODES.map((code) => ({
      code,
      symbol: CURRENCIES[code].symbol,
      label: CURRENCIES[code].label,
      decimals: CURRENCIES[code].decimals,
      rate: rates[code],
      defaultRate: DEFAULT_RATES[code],
    })),
    // [{ denomination: 1000, prices: { INR: 1100, USDT: 11 } }, ...]
    preview: denominations.map((denomination) => ({
      denomination,
      prices: CURRENCY_CODES.reduce((acc, code) => {
        acc[code] = priceFor(denomination, code);
        return acc;
      }, {}),
    })),
    updatedAt: doc?.updatedAt || null,
    updatedBy: doc?.updatedBy
      ? { name: doc.updatedBy.name, email: doc.updatedBy.email }
      : null,
  };
}

// @route  GET /api/admin/pricing
// @access Admin
exports.getPricing = async (req, res) => {
  try {
    res.status(200).json(await buildPricingPayload());
  } catch (error) {
    console.error("Get pricing error:", error);
    res.status(500).json({ message: "Couldn't load pricing settings." });
  }
};

// @route  PUT /api/admin/pricing
// @access Admin
// Body: { rates: { INR: 1.1, USDT: 0.011 } }  — or  { reset: true }
exports.updatePricing = async (req, res) => {
  try {
    if (req.body?.reset === true) {
      const applied = await savePricing(DEFAULT_RATES, req.user?._id);
      return res.status(200).json({
        message: "Prices reset to the default rates.",
        ...(await buildPricingPayload()),
        rates: applied,
      });
    }

    const incoming = req.body?.rates;
    if (!incoming || typeof incoming !== "object") {
      return res.status(400).json({ message: "Send a `rates` object, e.g. { INR: 1.1, USDT: 0.011 }." });
    }

    // Validate BEFORE touching anything — a bad rate must not partially apply.
    const cleaned = {};
    for (const code of CURRENCY_CODES) {
      if (incoming[code] === undefined || incoming[code] === null || incoming[code] === "") {
        return res.status(400).json({ message: `Rate for ${code} is required.` });
      }
      const value = Number(incoming[code]);
      if (!Number.isFinite(value) || value <= 0) {
        return res.status(400).json({ message: `Rate for ${code} must be a number greater than 0.` });
      }
      // Sanity ceiling — a stray keystroke like 110 instead of 1.1 would
      // multiply every price 100×, so refuse anything wildly out of range.
      if (value > 1000) {
        return res.status(400).json({ message: `Rate for ${code} looks wrong (${value}). Maximum allowed is 1000.` });
      }
      cleaned[code] = value;
    }

    await savePricing(cleaned, req.user?._id);

    res.status(200).json({
      message: "Prices updated. The whole catalog now uses the new rates.",
      ...(await buildPricingPayload()),
    });
  } catch (error) {
    console.error("Update pricing error:", error);
    res.status(500).json({ message: "Couldn't save pricing settings." });
  }
};

// @route  GET /api/admin/orders/export
// @access Admin
// Downloads delivered orders as CSV (opens in Excel/Sheets) or PDF, filtered
// by a quick preset range (this month / last 6 months / this year) or a
// custom from/to date pair.
//   ?format=csv|pdf
//   ?range=month|6months|year|custom
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD   (required when range=custom)
exports.exportDeliveredOrders = async (req, res) => {
  try {
    const { format = "csv", range = "month" } = req.query;
    if (!["csv", "pdf"].includes(format)) {
      return res.status(400).json({ message: "format must be csv or pdf." });
    }

    const now = new Date();
    let from;
    let to = now;

    if (range === "custom") {
      const fromRaw = req.query.from;
      const toRaw = req.query.to;
      if (!fromRaw || !toRaw) {
        return res.status(400).json({ message: "Custom range needs both from and to dates." });
      }
      from = new Date(fromRaw);
      to = new Date(toRaw);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return res.status(400).json({ message: "Invalid from/to date." });
      }
      // Include the whole "to" day, not just midnight of it.
      to.setHours(23, 59, 59, 999);
    } else if (range === "6months") {
      from = new Date(now);
      from.setMonth(from.getMonth() - 6);
    } else if (range === "year") {
      from = new Date(now.getFullYear(), 0, 1);
    } else {
      // "month" (default) — the current calendar month so far.
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    if (from > to) {
      return res.status(400).json({ message: "The 'from' date must be before the 'to' date." });
    }

    const orders = await Order.find({
      orderStatus: "delivered",
      deliveredAt: { $gte: from, $lte: to },
    })
      .populate("user", "fullName email phone")
      .sort({ deliveredAt: 1 });

    const rangeLabel = range === "custom"
      ? `${from.toISOString().slice(0, 10)}_to_${to.toISOString().slice(0, 10)}`
      : `${range}-${now.toISOString().slice(0, 10)}`;

    if (format === "csv") {
      return streamOrdersCsv(orders, res, rangeLabel);
    }
    return streamOrdersPdf(orders, res, rangeLabel, { from, to });
  } catch (error) {
    console.error("Export delivered orders error:", error);
    res.status(500).json({ message: "Couldn't generate that export." });
  }
};
