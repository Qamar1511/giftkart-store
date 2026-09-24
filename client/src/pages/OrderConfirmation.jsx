import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getOrderById, downloadInvoice } from "../services/orderService";
import { getDisplayStatus } from "../utils/orderStatus";
import { reorderItems } from "../utils/reorderItems";
import { useCart } from "../context/CartContext";
import { formatMoney } from "../data/catalog";
import Seo from "../components/Seo";
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
  const [reordering, setReordering] = useState(false);
  const [reorderNotice, setReorderNotice] = useState("");

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

  const handleReorder = async () => {
    setReordering(true);
    setReorderNotice("");
    try {
      const { addedAny, limitedItems } = await reorderItems(order, addToCart);
      if (limitedItems.length > 0) {
        const detail = limitedItems
          .map((li) =>
            li.available > 0
              ? `${li.brandName} ₹${li.denomination} (only ${li.available} available, added ${li.available})`
              : `${li.brandName} ₹${li.denomination} (out of stock, not added)`
          )
          .join("; ");
        setReorderNotice(`Some quantities were reduced to match current stock: ${detail}`);
        // Don't auto-navigate away — let them read the warning first, then
        // go to the cart themselves when ready.
      } else if (addedAny) {
        navigate("/cart");
      }
    } catch (err) {
      setReorderNotice("Couldn't check current stock. Please try again.");
    } finally {
      setReordering(false);
    }
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
  // Every manual-review payment method (UPI, USDT, Binance/Bybit internal
  // transfer, and Razorpay too — no order auto-delivers anymore) shows the
  // same "we're checking it" state until an admin verifies it in the dashboard.
  const isManualReview = ["upi_manual", "usdt", "binance_uid", "bybit_uid", "razorpay"].includes(order.paymentMethod);
  const showUtrPending = isManualReview && order.verificationStatus === "submitted";
  const items = (Array.isArray(order.items) ? order.items : []).filter((item) => item && item.denomination != null);
  // A historical order is shown in the currency it was actually charged in,
  // using the unit price snapshotted at order time — never the shopper's
  // current active currency (which may have changed since).
  const currency = order.currency || "INR";

  return (
    <div className="buy-page">
      <Seo title="Order Confirmation — GIFTKART" path="/order-confirmation" noindex />
      <div className="confirmation-card">
        <span className={`order-status-pill status-${status.key}`}>
          {showUtrPending ? "Verification pending" : status.label}
        </span>
        <h1 className="confirmation-heading">{copy.heading}</h1>
        <p className="auth-form-sub">
          {showUtrPending
            ? "We've received your payment details — we'll verify it and deliver your code shortly."
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
              <strong>{formatMoney((item.unitPrice ?? item.denomination) * (item.quantity ?? 1), currency)}</strong>
            </div>
          ))}
          <div className="confirmation-row" style={{ borderTop: "1px solid var(--card-border)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
            <span>Total paid</span>
            <strong>
              {formatMoney(order.totalAmount ?? 0, currency)}
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
          <button className="navbar-btn navbar-btn-ghost" onClick={handleReorder} disabled={reordering}>
            {reordering ? "Checking stock…" : "Reorder these items"}
          </button>
          {reorderNotice && (
            <p className="shop-status shop-status-error" style={{ textAlign: "left", fontSize: "0.82rem" }}>
              {reorderNotice} <Link to="/cart">Go to cart →</Link>
            </p>
          )}
          <Link to="/" className="navbar-btn navbar-btn-ghost" style={{ textAlign: "center" }}>
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
