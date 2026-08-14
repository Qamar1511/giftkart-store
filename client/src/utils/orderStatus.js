// The backend tracks orderStatus (placed/delivered/cancelled), paymentStatus
// (pending/paid/failed/refunded), and refundStatus (none/requested/processed/
// manual_review) as separate fields. This collapses them into one label +
// CSS class for display, in priority order.
export function getDisplayStatus(order) {
  if (order.orderStatus === "cancelled") {
    return { key: "cancelled", label: "Cancelled" };
  }
  if (order.refundStatus === "processed") {
    return { key: "refunded", label: "Refunded" };
  }
  if (order.refundStatus === "requested" || order.refundStatus === "manual_review") {
    return { key: "refund_pending", label: "Refund pending" };
  }
  if (order.orderStatus === "delivered") {
    return { key: "delivered", label: "Delivered" };
  }
  if (order.paymentStatus === "paid") {
    return { key: "paid", label: "Payment received" };
  }
  if (order.paymentStatus === "failed") {
    return { key: "failed", label: "Payment failed" };
  }
  return { key: "placed", label: "Awaiting payment" };
}
