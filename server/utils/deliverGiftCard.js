const GiftCardStock = require("../models/GiftCardStock");

/**
 * Called right after a payment is confirmed (from any provider).
 * For every line item in the order, atomically claims `quantity` unused
 * codes of that denomination and attaches them to the item. If ANY item
 * runs short on stock, the whole order stays "placed" (not "delivered")
 * so an admin can top up stock and finish delivery manually — the codes
 * already claimed for other items are still safely reserved to this order.
 */
async function deliverGiftCard(order) {
  let fullyDelivered = true;

  for (const item of order.items) {
    const codesNeeded = item.quantity - item.giftCardCodes.length;
    if (codesNeeded <= 0) continue; // already delivered on a previous attempt

    for (let i = 0; i < codesNeeded; i++) {
      let stockItem = await GiftCardStock.findOneAndUpdate(
        { brand: item.brand, denomination: item.denomination, isUsed: false, reservedFor: order._id },
        { isUsed: true, reservedFor: null, reservedAt: null, order: order._id },
        { new: true }
      );

      // No reservation found for this order (e.g. an order placed before
      // reservations existed, or an admin-created order) — fall back to
      // claiming any generally available unit, same as before.
      if (!stockItem) {
        stockItem = await GiftCardStock.findOneAndUpdate(
          { brand: item.brand, denomination: item.denomination, isUsed: false, reservedFor: null },
          { isUsed: true, order: order._id },
          { new: true }
        );
      }

      if (!stockItem) {
        fullyDelivered = false;
        console.warn(
          `No available stock for ${item.brand} ₹${item.denomination}. Order ${order._id} is paid but not fully delivered.`
        );
        break;
      }

      item.giftCardCodes.push(stockItem.code);
    }
  }

  if (fullyDelivered) {
    order.orderStatus = "delivered";
    order.deliveredAt = new Date();
  }

  await order.save();
  return order;
}

module.exports = deliverGiftCard;
