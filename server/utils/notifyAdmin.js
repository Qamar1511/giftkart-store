const { sendEmail } = require("./sendEmail");

// Where these three admin alerts go. Falls back to a fixed address if
// CONTACT_INBOX isn't set in .env/Render — but setting CONTACT_INBOX is
// still the right way to change this without touching code.
const ADMIN_INBOX = process.env.CONTACT_INBOX || "support@giftkartstore.in";

// Fired once a payment is submitted (UTR entered, USDT tx submitted, or
// Razorpay signature verified) — the moment an order actually needs an
// admin to go check and deliver it, not at checkout-start when someone
// might still abandon before paying.
exports.notifyAdminNewOrder = async (order) => {
  try {
    const itemsHtml = (order.items || [])
      .map((item) => `${item.brand} ₹${item.denomination} × ${item.quantity}`)
      .join("<br/>");

    await sendEmail({
      to: ADMIN_INBOX,
      subject: `New order to verify — ${order.currency} ${order.totalAmount}`,
      html: `
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Customer:</strong> ${order.user?.fullName || "—"} (${order.user?.email || "—"})</p>
        <p><strong>Items:</strong><br/>${itemsHtml}</p>
        <p><strong>Total:</strong> ${order.currency} ${order.totalAmount}</p>
        <p><strong>Payment method:</strong> ${order.paymentMethod}</p>
        <p>Head to the admin panel's Orders tab to verify and deliver.</p>
      `,
    });
  } catch (err) {
    console.error("Couldn't send new-order admin notification:", err.message);
  }
};

// Fired every time someone clicks "Notify me" on an out-of-stock card —
// gives you a heads-up on demand even before you check the stock page.
exports.notifyAdminStockRequest = async ({ brandName, denomination, customerEmail }) => {
  try {
    await sendEmail({
      to: ADMIN_INBOX,
      subject: `Stock request — ${brandName} ₹${denomination}`,
      html: `
        <p>${customerEmail} asked to be notified when <strong>${brandName} ₹${denomination}</strong> is back in stock.</p>
      `,
    });
  } catch (err) {
    console.error("Couldn't send notify-me admin notification:", err.message);
  }
};
