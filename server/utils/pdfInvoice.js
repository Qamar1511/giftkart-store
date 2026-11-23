const PDFDocument = require("pdfkit");

/**
 * Streams a PDF invoice directly into the given HTTP response.
 * `order` must already be populated with `user` (fullName, email).
 */
function streamInvoicePDF(order, res) {
  const doc = new PDFDocument({ margin: 50 });

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
  doc.moveDown(1.5);

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
    doc.text(`₹${item.unitPrice.toLocaleString("en-IN")}`, 390, y);
    doc.text(`₹${subtotal.toLocaleString("en-IN")}`, 470, y);
    y += 22;
  });

  doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke();
  y += 15;
  doc.fontSize(12).text("Total Paid", 390, y);
  doc
    .fontSize(12)
    .fillColor("#3b7bf6")
    .text(`${order.currency} ${order.totalAmount.toLocaleString("en-IN")}`, 470, y);

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
