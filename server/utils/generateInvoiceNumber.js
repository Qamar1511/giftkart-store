const Order = require("../models/Order");

/**
 * Generates an invoice number like INV-2026-000123.
 * Not perfectly race-proof under very high concurrency (fine for this scale);
 * for high-volume production use, replace with a dedicated counters collection.
 */
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = await Order.countDocuments({ invoiceNumber: { $ne: null } });
  const sequence = String(count + 1).padStart(6, "0");
  return `INV-${year}-${sequence}`;
}

module.exports = generateInvoiceNumber;
