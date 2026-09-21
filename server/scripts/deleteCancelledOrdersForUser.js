// Deletes a specific customer's CANCELLED orders only.
//
// Usage:
//   node scripts/deleteCancelledOrdersForUser.js "Qamar Shabir"
//     → DRY RUN: lists matching orders across every account with this name, deletes nothing
//   node scripts/deleteCancelledOrdersForUser.js "Qamar Shabir" --confirm
//     → actually deletes them
//
// Matches the name case-insensitively (exact match, not "contains") against
// User.fullName. If more than one account has this exact name — e.g. the
// same person signed up with a few different emails — it processes ALL of
// them, listed separately so you can see which email each batch belongs to.
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Order = require("../models/Order");

async function run() {
  const name = process.argv[2];
  const confirmed = process.argv.includes("--confirm");

  if (!name) {
    console.error('Usage: node scripts/deleteCancelledOrdersForUser.js "Full Name" [--confirm]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB...");

  // Case-insensitive EXACT match (not "contains"), so "Qamar Shabir" doesn't
  // also catch an unrelated "Qamar Shabir Khan".
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const users = await User.find({ fullName: { $regex: `^${escaped}$`, $options: "i" } });

  if (users.length === 0) {
    console.log(`No user found with the name "${name}". Check the spelling and try again.`);
    await mongoose.disconnect();
    return;
  }

  console.log(`Matched ${users.length} account(s) for "${name}":`);
  users.forEach((u) => console.log(`  - ${u.fullName} <${u.email}> (id: ${u._id})`));

  let totalFound = 0;
  let totalDeleted = 0;

  for (const user of users) {
    const orders = await Order.find({ user: user._id, orderStatus: "cancelled" }).sort({ createdAt: -1 });

    console.log(`\n--- ${user.fullName} <${user.email}> ---`);
    if (orders.length === 0) {
      console.log("  No cancelled orders. Nothing to do.");
      continue;
    }

    totalFound += orders.length;
    console.log(`  Found ${orders.length} cancelled order(s):`);
    orders.forEach((o) => {
      console.log(
        `    - #${o.invoiceNumber || o._id.toString().slice(-6)} | ${o.currency} ${o.totalAmount} | ${o.paymentMethod} | placed ${o.createdAt.toLocaleDateString("en-IN")}`
      );
    });

    if (confirmed) {
      const result = await Order.deleteMany({ user: user._id, orderStatus: "cancelled" });
      totalDeleted += result.deletedCount;
      console.log(`  Deleted ${result.deletedCount} order(s).`);
    }
  }

  if (!confirmed) {
    console.log(`\nThis was a DRY RUN — ${totalFound} order(s) total found, nothing was deleted.`);
    console.log(`Re-run with --confirm to actually delete them:`);
    console.log(`  node scripts/deleteCancelledOrdersForUser.js "${name}" --confirm`);
  } else {
    console.log(`\nDone — deleted ${totalDeleted} cancelled order(s) across ${users.length} account(s).`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
