import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getOrderById, downloadInvoice } from "../services/orderService";
import { getDisplayStatus } from "../utils/orderStatus";
import { useCart } from "../context/CartContext";
import "../styles/Shop.css";

const STATUS_COPY = {
  delivered: {
    heading: "Your gift cards are ready 🎉",
    sub: "Payment confirmed and your codes have been delivered instantly.",
  },
  paid: {
    heading: "Payment received",
    sub: "We're preparing your gift card codes — this usually takes just a few seconds. Refresh to check.",
  },
  cancelled: {
    heading: "Order cancelled",
    sub: "This order was cancelled.",
  },
  failed: {
    heading: "Payment failed",
    sub: "Your payment didn't go through. No amount was charged for this order.",
  },
  refunded: {
    heading: "Order refunded",
    sub: "Your payment has been refunded.",
  },
  refund_pending: {
    heading: "Refund in progress",
    sub: "We've requested your refund — it can take a few days to reflect.",
  },
  placed: {
    heading: "Order created",
    sub: "Waiting for payment confirmation.",
  },
};

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await getOrderById(orderId);
        setOrder(data);
      } catch (err) {
        setError(err.response?.data?.message || "Couldn't load this order.");
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleDownloadInvoice = async () => {
    setDownloading(true);
    try {
      await downloadInvoice(orderId);
    } catch (err) {
      setError("Couldn't download the invoice. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleReorder = () => {
    (order.items || [])
      .filter((item) => item && item.denomination != null)
      .forEach((item) => addToCart(item.brand, item.denomination, item.quantity || 1));
    navigate("/cart");
  };

  if (error) {
    return (
      <div className="buy-page">
        <div className="confirmation-card">
          <p className="shop-status shop-status-error">{error}</p>
          <button className="auth-submit" onClick={() => navigate("/")}>
            Go to homepage
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="buy-page">
        <p className="shop-status">Loading your order…</p>
      </div>
    );
  }

  const status = getDisplayStatus(order);
  const copy = STATUS_COPY[status.key] || STATUS_COPY.placed;
  const showUtrPending = order.paymentMethod === "upi_manual" && order.verificationStatus === "submitted";
  const items = (Array.isArray(order.items) ? order.items : []).filter((item) => item && item.denomination != null);

  return (
    <div className="buy-page">
      <div className="confirmation-card">
        <span className={`order-status-pill status-${status.key}`}>
          {showUtrPending ? "Verification pending" : status.label}
        </span>
        <h1 className="confirmation-heading">{copy.heading}</h1>
        <p className="auth-form-sub">
          {showUtrPending
            ? "We've received your UTR — we'll verify it against our bank statement and deliver your code shortly."
            : copy.sub}
        </p>

        <div className="confirmation-summary">
          <div className="confirmation-row">
            <span>Invoice number</span>
            <strong>{order.invoiceNumber || "—"}</strong>
          </div>
          {items.map((item, idx) => (
            <div className="confirmation-row" key={idx}>
              <span>
                {item.brandName || "Gift Card"} ₹{item.denomination.toLocaleString("en-IN")} × {item.quantity ?? 1}
              </span>
              <strong>₹{(item.denomination * (item.quantity ?? 1)).toLocaleString("en-IN")}</strong>
            </div>
          ))}
          <div className="confirmation-row" style={{ borderTop: "1px solid var(--card-border)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
            <span>Total paid</span>
            <strong>
              {order.currency || "INR"} {(order.totalAmount ?? 0).toLocaleString("en-IN")}
            </strong>
          </div>
          <div className="confirmation-row">
            <span>Payment method</span>
            <strong>{(order.paymentMethod || "").replace("_", " ").toUpperCase()}</strong>
          </div>

          {items.some((item) => item.giftCardCodes?.length > 0) && (
            <div className="confirmation-code-row" style={{ marginTop: "0.75rem" }}>
              <span>Your gift card codes</span>
              {items.map((item) =>
                (item.giftCardCodes || []).map((code, i) => (
                  <div key={`${item.denomination}-${i}`} style={{ marginTop: "0.35rem" }}>
                    <code>{item.brandName || "Gift Card"} ₹{item.denomination} — {code}</code>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="confirmation-actions">
          <button
            className="auth-submit"
            onClick={handleDownloadInvoice}
            disabled={downloading || order.paymentStatus !== "paid"}
          >
            {downloading ? "Preparing PDF…" : "Download invoice"}
          </button>
          <button className="navbar-btn navbar-btn-ghost" onClick={handleReorder}>
            Reorder these items
          </button>
          <Link to="/" className="navbar-btn navbar-btn-ghost" style={{ textAlign: "center" }}>
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
