const PDFDocument = require("pdfkit");

// Wraps a CSV field in quotes and escapes internal quotes whenever the value
// contains a comma, quote, or newline — the minimum needed for a value to
// round-trip correctly through Excel/Sheets without corrupting the columns
// next to it (customer names and addresses are free text and can contain
// commas).
const csvField = (value) => {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const summariseItems = (order) =>
  order.items
    .map((item) => `${item.brandName} x${item.quantity} (₹${item.denomination})`)
    .join("; ");

const ROW_FIELDS = (order) => [
  order.invoiceNumber || "",
  String(order._id),
  order.user?.fullName || order.address?.fullName || "",
  order.user?.email || order.address?.email || "",
  order.user?.phone || order.address?.phone || "",
  summariseItems(order),
  order.totalAmount,
  order.currency,
  order.paymentMethod,
  order.deliveredAt ? new Date(order.deliveredAt).toLocaleString("en-IN") : "",
];

const HEADERS = [
  "Invoice Number",
  "Order ID",
  "Customer Name",
  "Email",
  "Phone",
  "Items",
  "Total Amount",
  "Currency",
  "Payment Method",
  "Delivered At",
];

// Streams a CSV of delivered orders straight to the response — opens
// natively in Excel/Google Sheets, no extra dependency needed for it.
const streamOrdersCsv = (orders, res, rangeLabel) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="delivered-orders-${rangeLabel}.csv"`
  );
  // BOM so Excel on Windows recognises this as UTF-8 (otherwise ₹ and other
  // non-ASCII characters can render as mojibake).
  res.write("\uFEFF");
  res.write(HEADERS.map(csvField).join(",") + "\r\n");
  for (const order of orders) {
    res.write(ROW_FIELDS(order).map(csvField).join(",") + "\r\n");
  }
  res.end();
};

// Streams a simple tabular PDF report of delivered orders. Landscape, small
// enough type to fit every column without wrapping into a mess.
const streamOrdersPdf = (orders, res, rangeLabel, { from, to }) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="delivered-orders-${rangeLabel}.pdf"`
  );

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 30 });
  doc.pipe(res);

  doc.fontSize(16).fillColor("#000").text("GIFTKART — Delivered Orders", { align: "center" });
  doc
    .fontSize(10)
    .fillColor("#555")
    .text(`${from.toLocaleDateString("en-IN")} – ${to.toLocaleDateString("en-IN")}`, {
      align: "center",
    });
  doc.moveDown(1);

  const totalsByCurrency = {};
  for (const order of orders) {
    totalsByCurrency[order.currency] = (totalsByCurrency[order.currency] || 0) + order.totalAmount;
  }
  const totalsLine = Object.entries(totalsByCurrency)
    .map(([currency, amount]) => `${amount.toLocaleString("en-IN")} ${currency}`)
    .join("  ·  ");
  doc
    .fontSize(10)
    .fillColor("#000")
    .text(`${orders.length} order${orders.length === 1 ? "" : "s"}   |   Total: ${totalsLine || "0"}`);
  doc.moveDown(0.75);

  // Column layout — widths sum to roughly the usable landscape A4 width.
  const columns = [
    { label: "Invoice #", width: 70 },
    { label: "Customer", width: 110 },
    { label: "Email", width: 130 },
    { label: "Items", width: 260 },
    { label: "Total", width: 70 },
    { label: "Payment", width: 70 },
    { label: "Delivered", width: 90 },
  ];
  const rowOf = (order) => [
    order.invoiceNumber || "—",
    order.user?.fullName || order.address?.fullName || "—",
    order.user?.email || order.address?.email || "—",
    summariseItems(order),
    `${order.totalAmount} ${order.currency}`,
    order.paymentMethod,
    order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString("en-IN") : "—",
  ];

  const startX = doc.page.margins.left;
  let y = doc.y;
  const rowHeight = 18;

  const drawHeader = () => {
    let x = startX;
    doc.fontSize(8).fillColor("#fff");
    doc.rect(startX, y, columns.reduce((s, c) => s + c.width, 0), rowHeight).fill("#232f3e");
    doc.fillColor("#fff");
    columns.forEach((col) => {
      doc.text(col.label, x + 4, y + 5, { width: col.width - 8, lineBreak: false });
      x += col.width;
    });
    y += rowHeight;
  };

  drawHeader();

  doc.fontSize(7.5).fillColor("#000");
  orders.forEach((order, i) => {
    if (y > doc.page.height - doc.page.margins.bottom - rowHeight) {
      doc.addPage({ size: "A4", layout: "landscape", margin: 30 });
      y = doc.page.margins.top;
      drawHeader();
      doc.fontSize(7.5).fillColor("#000");
    }
    if (i % 2 === 0) {
      doc.rect(startX, y, columns.reduce((s, c) => s + c.width, 0), rowHeight).fill("#f7f9f9");
      doc.fillColor("#000");
    }
    let x = startX;
    rowOf(order).forEach((cell, idx) => {
      doc.text(String(cell), x + 4, y + 5, {
        width: columns[idx].width - 8,
        height: rowHeight - 4,
        ellipsis: true,
        lineBreak: false,
      });
      x += columns[idx].width;
    });
    y += rowHeight;
  });

  doc.end();
};

module.exports = { streamOrdersCsv, streamOrdersPdf };
