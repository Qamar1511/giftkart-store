const Order = require("../models/Order");
const GiftCardStock = require("../models/GiftCardStock");
const deliverGiftCard = require("../utils/deliverGiftCard");
const { BRANDS } = require("../config/catalog");

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
      filter.paymentMethod = { $in: ["upi_manual", "usdt"] };
      filter.verificationStatus = "submitted";
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

// @route  POST /api/admin/orders/:id/verify-upi
// @access Admin
// Same effect as scripts/verifyManualPayment.js — check the UTR (for UPI) or
// the transaction hash on a block explorer (for USDT) against the real
// payment yourself first, then click this to mark the order paid and
// trigger gift-card delivery.
exports.verifyUpiPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!["upi_manual", "usdt"].includes(order.paymentMethod)) {
      return res.status(400).json({ message: "This order isn't a manual UPI/USDT order." });
    }
    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "This order is already marked paid." });
    }

    order.paymentStatus = "paid";
    order.verificationStatus = "verified";
    order.providerPaymentId = order.utrNumber || order.usdtTxId || `MANUAL-${Date.now()}`;
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
// For when the UTR/transaction ID the customer submitted doesn't match
// anything in your bank/UPI statement or block explorer — marks the order
// failed instead of silently ignoring it.
exports.rejectUpiPayment = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!["upi_manual", "usdt"].includes(order.paymentMethod)) {
      return res.status(400).json({ message: "This order isn't a manual UPI/USDT order." });
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

// @route  GET /api/admin/stock
// @access Admin
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
