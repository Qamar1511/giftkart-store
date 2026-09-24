// Run with: node scripts/verifyManualPayment.js <orderId>
//
// Use this after you've checked the customer's submitted UTR number against
// your actual UPI app / bank statement and confirmed the money has landed.
// This is a stand-in for a proper admin panel (a later section) — it does
// exactly what an admin "Approve payment" button would do.
require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("../models/Order");
const deliverGiftCard = require("../utils/deliverGiftCard");

async function verify() {
  const orderId = process.argv[2];
  if (!orderId) {
    console.error("Usage: node scripts/verifyManualPayment.js <orderId>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB...");

  const order = await Order.findById(orderId);
  if (!order) {
    console.error(`No order found with id ${orderId}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!["upi_manual", "usdt", "binance_uid", "bybit_uid"].includes(order.paymentMethod)) {
    console.error("This order isn't a manual UPI, USDT, or internal-transfer order.");
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Order ${order._id}`);
  console.log(`  Total: ${order.currency} ${order.totalAmount}`);
  if (order.paymentMethod === "upi_manual") {
    console.log(`  UTR submitted by customer: ${order.utrNumber || "(none yet)"}`);
  } else if (order.paymentMethod === "binance_uid" || order.paymentMethod === "bybit_uid") {
    const exchange = order.paymentMethod === "binance_uid" ? "Binance" : "Bybit";
    console.log(`  ${exchange} internal transfer — customer's own UID: ${order.internalTransferUid || "(none yet)"}`);
    console.log(`  Check your ${exchange} internal-transfer history for this UID + amount to verify.`);
  } else {
    console.log(`  USDT network: ${order.usdtNetwork || "(not recorded — assume TRC20)"}`);
    console.log(`  USDT tx ID submitted by customer: ${order.usdtTxId || "(none yet)"}`);
  }
  console.log(`  Current verification status: ${order.verificationStatus}`);

  order.paymentStatus = "paid";
  order.verificationStatus = "verified";
  order.providerPaymentId =
    order.utrNumber || order.usdtTxId || order.internalTransferUid || `MANUAL-${Date.now()}`;
  await order.save({ validateModifiedOnly: true });

  const delivered = await deliverGiftCard(order);
  console.log(`Marked as paid. Order status is now: ${delivered.orderStatus}`);
  if (delivered.orderStatus !== "delivered") {
    console.log("  (Stock ran out for one of the items — top up GiftCardStock and re-run this script.)");
  }

  await mongoose.disconnect();
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
