const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { CURRENCIES } = require("../config/catalog");

// Your business details for the invoice — set these in .env (see
// .env.example). Any left unset are simply skipped, so the invoice still
// generates fine before you've filled them in.
const SELLER_NAME = process.env.BUSINESS_NAME || "GIFTKART";
const SELLER_ADDRESS = process.env.BUSINESS_ADDRESS || "";
const SELLER_GSTIN = process.env.GST_NUMBER || "";
const SELLER_MSME = process.env.MSME_NUMBER || "";

// Drop these here and they're stamped onto every invoice automatically —
// signature.png (personal signature) and/or stamp.png (company seal/logo
// stamp). PNGs with a transparent background work best. Nothing breaks if
// either file is missing — that section is just skipped.
const SIGNATURE_PATH = path.join(__dirname, "..", "assets", "signature.png");
const STAMP_PATH = path.join(__dirname, "..", "assets", "stamp.png");

// Format a charged amount in the order's buying currency (INR → "₹1,100",
// USDT → "$55" / "$5.50"). Whole USDT amounts drop the decimals; fractional
// ones show exactly 2. Falls back to "<CODE> 0.00" for any legacy currency
// not in the catalog (e.g. old "USD" PayPal orders).
function formatAmount(amount, currencyCode) {
  const n = Number(amount) || 0;
  const cfg = CURRENCIES[currencyCode];
  if (!cfg) return `${currencyCode} ${n.toFixed(2)}`;
  if (cfg.decimals === 0) return `${cfg.symbol}${Math.round(n).toLocaleString("en-IN")}`;
  const body = Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", { minimumFractionDigits: cfg.decimals, maximumFractionDigits: cfg.decimals });
  return `${cfg.symbol}${body}`;
}

/**
 * Streams a PDF invoice directly into the given HTTP response.
 * `order` must already be populated with `user` (fullName, email).
 */
function streamInvoicePDF(order, res) {
  const doc = new PDFDocument({ margin: 50 });
  const currency = order.currency || "INR";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${order.invoiceNumber || order._id}.pdf`
  );

  doc.pipe(res);

  // Header
  doc
    .fontSize(22)
    .fillColor("#10182c")
    .text("GIFTKART", { continued: true })
    .fillColor("#3b7bf6")
    .text("  •  Tax Invoice", { align: "left" });

  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#555").text("Digital Gift Cards & Wallet Top-ups");
  doc.moveDown(0.75);

  // Seller details — only the lines that are actually configured show up,
  // so this section quietly stays out of the way until you fill in
  // BUSINESS_ADDRESS / GST_NUMBER / MSME_NUMBER in .env.
  doc.fontSize(9).fillColor("#555");
  doc.text(`Sold by: ${SELLER_NAME}`);
  if (SELLER_ADDRESS) doc.text(SELLER_ADDRESS);
  if (SELLER_GSTIN) doc.text(`GSTIN: ${SELLER_GSTIN}`);
  if (SELLER_MSME) doc.text(`MSME/Udyam Reg. No.: ${SELLER_MSME}`);
  doc.moveDown(1);

  // Invoice meta
  doc.fontSize(11).fillColor("#000");
  doc.text(`Invoice Number: ${order.invoiceNumber || "N/A"}`);
  doc.text(`Order ID: ${order._id}`);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleString("en-IN")}`);
  doc.moveDown(1);

  // Billed to
  doc.fontSize(12).text("Billed To:", { underline: true });
  doc.fontSize(11);
  doc.text(order.address.fullName);
  doc.text(order.address.phone);
  doc.text(
    [order.address.line1, order.address.line2].filter(Boolean).join(", ")
  );
  doc.text(
    `${order.address.city}, ${order.address.state} - ${order.address.pincode}`
  );
  doc.text(order.address.country);
  doc.moveDown(1.5);

  // Line item table — one row per cart item
  let y = doc.y;
  doc.fontSize(11).fillColor("#000");
  doc.text("Item", 50, y);
  doc.text("Qty", 320, y);
  doc.text("Unit Price", 390, y);
  doc.text("Subtotal", 470, y);
  doc.moveTo(50, y + 18).lineTo(550, y + 18).stroke();
  y += 28;

  order.items.forEach((item) => {
    const subtotal = item.unitPrice * item.quantity;
    doc.text(`${item.brandName || "Gift Card"} - ₹${item.denomination}`, 50, y, { width: 260 });
    doc.text(String(item.quantity), 320, y);
    doc.text(formatAmount(item.unitPrice, currency), 390, y);
    doc.text(formatAmount(subtotal, currency), 470, y);
    y += 22;
  });

  doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke();
  y += 15;
  doc.fontSize(12).text("Total Paid", 390, y);
  doc
    .fontSize(12)
    .fillColor("#3b7bf6")
    .text(formatAmount(order.totalAmount, currency), 470, y);

  doc.moveDown(3);
  doc.fontSize(10).fillColor("#555");
  doc.text(`Payment method: ${order.paymentMethod.toUpperCase()}`);
  doc.text(`Payment status: ${order.paymentStatus.toUpperCase()}`);
  doc.text(`Order status: ${order.orderStatus.toUpperCase()}`);

  const anyCodes = order.items.some((item) => item.giftCardCodes.length > 0);
  if (anyCodes) {
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#000").text("Gift Card Codes:");
    order.items.forEach((item) => {
      item.giftCardCodes.forEach((code) => {
        doc.fontSize(10).text(`  ${item.brandName || ""} ₹${item.denomination} — ${code}`);
      });
    });
  }

  doc.moveDown(2);

  // Stamp (left) and signature (right), side by side — only drawn if you've
  // actually dropped the images into server/assets/.
  const hasStamp = fs.existsSync(STAMP_PATH);
  const hasSignature = fs.existsSync(SIGNATURE_PATH);

  if (hasStamp || hasSignature) {
    const blockTop = doc.y;
    const stampSize = 80;
    const sigWidth = 130;

    if (hasStamp) {
      doc.image(STAMP_PATH, 50, blockTop, { width: stampSize });
      doc.fontSize(8).fillColor("#888").text("Company Seal", 50, blockTop + stampSize + 4, { width: stampSize, align: "center" });
    }

    if (hasSignature) {
      const sigX = 550 - sigWidth;
      doc.image(SIGNATURE_PATH, sigX, blockTop, { width: sigWidth });
      doc.fontSize(9).fillColor("#555").text("Authorized Signatory", sigX, blockTop + 55, { width: sigWidth, align: "center" });
    }

    doc.y = blockTop + 90;
  }

  doc
    .fontSize(9)
    .fillColor("#888")
    .text(
      "This is a system-generated invoice. GIFTKART is an independent reseller and is not affiliated with the brands listed above.",
      { align: "center" }
    );

  doc.end();
}

module.exports = streamInvoicePDF;
