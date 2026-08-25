const GiftCardStock = require("../models/GiftCardStock");
const Order = require("../models/Order");

// How long an order can sit unpaid before we assume the customer abandoned
// checkout — it gets auto-cancelled and its stock released back to
// everyone else. Manual UPI orders that already have a UTR submitted are
// exempt — admin review can genuinely take a while and that customer
// already paid in good faith.
const ABANDONED_ORDER_MINUTES = 15;

// True remaining sellable count for a brand + denomination: unused AND not
// currently held by someone else's in-progress order.
async function getAvailableCount(brand, denomination) {
  return GiftCardStock.countDocuments({ brand, denomination, isUsed: false, reservedFor: null });
}

// Atomically reserves `quantity` units per item for this order. If any item
// comes up short, everything already reserved for this order (across all
// its items) is released again before returning failure — so a multi-item
// cart never ends up half-reserved.
async function reserveStockForOrder(orderId, items) {
  const now = new Date();

  for (const item of items) {
    const claimed = [];
    for (let i = 0; i < item.quantity; i++) {
      const stockItem = await GiftCardStock.findOneAndUpdate(
        { brand: item.brand, denomination: item.denomination, isUsed: false, reservedFor: null },
        { reservedFor: orderId, reservedAt: now },
        { new: true }
      );
      if (!stockItem) break;
      claimed.push(stockItem);
    }

    if (claimed.length < item.quantity) {
      // Not enough left — undo this whole order's reservations and report
      // exactly how many of THIS item are actually available right now.
      await releaseStockForOrder(orderId);
      const availableNow = await getAvailableCount(item.brand, item.denomination);
      return {
        success: false,
        brand: item.brand,
        denomination: item.denomination,
        availableStock: availableNow,
      };
    }
  }

  return { success: true };
}

// Frees every unit still reserved (not yet delivered) for an order — used
// on cancel, and by the abandoned-order sweep below.
async function releaseStockForOrder(orderId) {
  await GiftCardStock.updateMany(
    { reservedFor: orderId, isUsed: false },
    { reservedFor: null, reservedAt: null }
  );
}

// Safety net for checkouts that were simply never finished (closed tab,
// gateway page abandoned, etc.) — run periodically from server.js so an
// order can't sit "placed" forever, silently holding stock hostage from a
// customer who's never coming back. Genuine in-flight manual-UPI orders
// (UTR already submitted, just waiting on admin review) are left alone
// regardless of age.
async function releaseAbandonedReservations() {
  const cutoff = new Date(Date.now() - ABANDONED_ORDER_MINUTES * 60 * 1000);

  const staleOrders = await Order.find({
    orderStatus: "placed",
    paymentStatus: { $ne: "paid" },
    createdAt: { $lt: cutoff },
    $nor: [{ paymentMethod: "upi_manual", verificationStatus: "submitted" }],
  });

  for (const order of staleOrders) {
    await releaseStockForOrder(order._id);
    order.orderStatus = "cancelled";
    order.cancelReason = `Auto-cancelled — no payment received within ${ABANDONED_ORDER_MINUTES} minutes`;
    await order.save({ validateModifiedOnly: true });
  }

  if (staleOrders.length > 0) {
    console.log(`Auto-cancelled ${staleOrders.length} unpaid order(s) and released their stock.`);
  }
}

module.exports = {
  getAvailableCount,
  reserveStockForOrder,
  releaseStockForOrder,
  cancelAbandonedOrders: releaseAbandonedReservations,
};
