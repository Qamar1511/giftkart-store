// READ-ONLY security audit. Changes and deletes NOTHING — it only prints a
// report of what looks wrong, so you can see what an attacker touched and
// clean it up yourself from the admin panel / Atlas.
//
// Usage (from the server folder):
//   node scripts/securityAudit.js            → looks back 30 days
//   node scripts/securityAudit.js --days=60  → looks back 60 days

// Some networks refuse the DNS SRV lookup mongodb+srv:// needs
// ("querySrv ECONNREFUSED"); public DNS for just this script sidesteps it.
require("dns").setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Order = require("../models/Order");
const Contact = require("../models/Contact");
const BlogPost = require("../models/BlogPost");
const GiftCardStock = require("../models/GiftCardStock");
const { isValidName, isValidTxHash, isValidExchangeUid } = require("../utils/security");

const daysArg = process.argv.find((a) => a.startsWith("--days="));
const DAYS = Math.max(1, parseInt(daysArg?.split("=")[1], 10) || 30);
const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

const MANUAL_METHODS = ["upi_manual", "usdt", "binance_uid", "bybit_uid"];
const GATEWAY_METHODS = ["razorpay", "card", "debit_card", "paypal"];

const show = (v, n = 70) => {
  const text = String(v ?? "").replace(/\s+/g, " ");
  return text.length > n ? `${text.slice(0, n)}…` : text;
};
const heading = (t) => console.log(`\n=== ${t} ===`);
const date = (d) => (d ? new Date(d).toISOString().slice(0, 16).replace("T", " ") : "—");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected. Looking back ${DAYS} days (since ${date(since)}). Nothing will be changed.`);

  /* 1. Admin accounts — anyone here you don't recognise is a break-in. */
  heading("1. ADMIN ACCOUNTS (every one should be someone you know)");
  const admins = await User.find({ role: "admin" }).select("fullName email createdAt").lean();
  admins.forEach((a) => console.log(`  ${a.email}  (${show(a.fullName, 40)})  created ${date(a.createdAt)}`));
  if (admins.length === 0) console.log("  none found");

  /* 2. Orders that were delivered without a normal, verified payment. */
  heading("2. DELIVERED ORDERS THAT LOOK WRONG");
  const delivered = await Order.find({ orderStatus: "delivered", createdAt: { $gte: since } })
    .populate("user", "email")
    .lean();
  const flagged = [];
  for (const o of delivered) {
    const proof = o.utrNumber || o.usdtTxId || o.internalTransferUid;
    const gatewayId = o.providerOrderId || o.providerPaymentId;
    const reasons = [];
    if (MANUAL_METHODS.includes(o.paymentMethod) && gatewayId) {
      reasons.push("manual-payment order carries a gateway payment id (paid through the wrong endpoint?)");
    }
    if (MANUAL_METHODS.includes(o.paymentMethod) && !proof) reasons.push("manual payment but no UTR / tx hash / UID was ever submitted");
    if (GATEWAY_METHODS.includes(o.paymentMethod) && !o.providerPaymentId) reasons.push("gateway method but no gateway payment id");
    if (reasons.length) flagged.push({ o, reasons });
  }
  console.log(`  ${delivered.length} order(s) delivered in this period, ${flagged.length} look suspicious.`);
  flagged.slice(0, 40).forEach(({ o, reasons }) => {
    const items = (o.items || []).map((i) => `${i.brand} ${i.denomination}×${i.quantity}`).join(", ");
    console.log(`  - ${o._id}  ${date(o.createdAt)}  ${o.user?.email || "?"}  ${o.paymentMethod}  ${o.currency} ${o.totalAmount}  [${items}]`);
    reasons.forEach((r) => console.log(`      ! ${r}`));
  });
  if (flagged.length > 40) console.log(`  …and ${flagged.length - 40} more`);

  /* 3. Stock rows added recently, and any whose code is not code-shaped. */
  heading("3. GIFT CARD STOCK ADDED RECENTLY");
  const addedStock = await GiftCardStock.find({ createdAt: { $gte: since } }).select("brand denomination code isUsed createdAt").lean();
  console.log(`  ${addedStock.length} stock code(s) added in this period.`);
  const oddStock = addedStock.filter((s) => !/^[A-Za-z0-9][A-Za-z0-9\-_]{5,63}$/.test(s.code || ""));
  console.log(`  ${oddStock.length} of them don't look like a normal gift card code (letters/digits/dashes, 6–64 chars):`);
  oddStock.slice(0, 20).forEach((s) => console.log(`  - ${s._id}  ${s.brand} ${s.denomination}  used:${s.isUsed}  "${show(s.code, 60)}"`));
  if (oddStock.length > 20) console.log(`  …and ${oddStock.length - 20} more`);

  /* 4. Sign-up names that aren't names. */
  heading("4. ACCOUNTS WITH NON-NAME 'NAMES' (code / symbols in the name field)");
  const recentUsers = await User.find({ createdAt: { $gte: since }, role: { $ne: "admin" } }).select("fullName email createdAt isBlocked").lean();
  const badUsers = recentUsers.filter((u) => !isValidName(u.fullName || ""));
  console.log(`  ${recentUsers.length} account(s) created in this period, ${badUsers.length} with a suspicious name:`);
  badUsers.slice(0, 40).forEach((u) =>
    console.log(`  - ${u._id}  ${u.email}  "${show(u.fullName)}"  ${u.isBlocked ? "[already blocked]" : ""}`)
  );

  /* 5. Spam / code in payment proof and address fields. */
  heading("5. JUNK IN PAYMENT PROOF AND ADDRESS FIELDS");
  const recentOrders = await Order.find({ createdAt: { $gte: since } })
    .select("usdtTxId internalTransferUid address createdAt")
    .lean();
  const junk = [];
  for (const o of recentOrders) {
    if (o.usdtTxId && !isValidTxHash(o.usdtTxId)) junk.push([o._id, "USDT tx id", o.usdtTxId]);
    if (o.internalTransferUid && !isValidExchangeUid(o.internalTransferUid)) junk.push([o._id, "exchange UID", o.internalTransferUid]);
    if (o.address?.fullName && !isValidName(o.address.fullName)) junk.push([o._id, "address name", o.address.fullName]);
  }
  console.log(`  ${junk.length} order field(s) hold values that are not what the field should contain:`);
  junk.slice(0, 40).forEach(([id, field, value]) => console.log(`  - order ${id}  ${field}: "${show(value)}"`));

  /* 6. Contact form flooding. */
  heading("6. CONTACT FORM");
  const contacts = await Contact.find({ createdAt: { $gte: since } }).select("email fullName message attachmentName createdAt").lean();
  console.log(`  ${contacts.length} message(s) in this period.`);
  const perEmail = {};
  contacts.forEach((c) => (perEmail[c.email] = (perEmail[c.email] || 0) + 1));
  const top = Object.entries(perEmail).sort((a, b) => b[1] - a[1]).slice(0, 8);
  top.forEach(([email, n]) => console.log(`  ${String(n).padStart(4)} × ${email}`));
  const withFiles = contacts.filter((c) => c.attachmentName);
  console.log(`  ${withFiles.length} included an attachment` + (withFiles.length ? " (first few names: " + withFiles.slice(0, 5).map((c) => show(c.attachmentName, 30)).join(", ") + ")" : ""));

  /* 7. Blog posts — nothing here should be a surprise. */
  heading("7. BLOG POSTS (delete any you didn't write)");
  const posts = await BlogPost.find().select("title slug published content createdAt").lean();
  const RISKY = /<script|<iframe|<object|<embed|javascript:|onerror\s*=|onload\s*=|onclick\s*=|<form|document\.cookie|localStorage/i;
  posts.forEach((p) => {
    const risky = RISKY.test(p.content || "");
    console.log(`  ${risky ? "!! RISKY " : "         "}${date(p.createdAt)}  ${p.published ? "published " : "draft     "} /${p.slug}  "${show(p.title, 50)}"`);
  });
  if (posts.length === 0) console.log("  none");

  console.log("\nDone. Nothing was changed. Use the admin panel (or Atlas) to remove anything that shouldn't be there.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
