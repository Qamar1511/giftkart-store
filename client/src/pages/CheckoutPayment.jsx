import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { createOrder, submitUtr } from "../services/orderService";
import {
  createRazorpayOrder,
  openRazorpayCheckout,
  verifyRazorpayPayment,
  createPaypalOrder,
  createUsdtInvoice,
  getUsdtPaymentStatus,
  getUpiQrDetails,
  mockConfirmPayment, // eslint-disable-line no-unused-vars -- kept for potential future dev/testing use
} from "../services/paymentService";
import { getSession } from "../services/authService";
import { getBrand } from "../data/catalog";
import "../styles/Shop.css";

// Only these methods are live for now — the rest render as disabled tiles.
const ENABLED_METHODS = ["upi_manual", "usdt"];

const PAYMENT_METHODS = [
  {
    id: "upi_manual",
    label: "UPI (Scan QR)",
    hint: "Pay via any UPI app",
    iconBg: "#fff5e6",
    icon: (
      <svg viewBox="0 0 32 20" width="26" height="16" fill="none">
        <path d="M2 2h5l4 16H6L2 2Z" fill="#f97316" />
        <path d="M12 2h5l4 16h-5l-4-16Z" fill="#4b5563" />
        <path d="M22 2h5l3 12 3-12h-3L26 14 22 2Z" fill="#16a34a" />
      </svg>
    ),
  },
  {
    id: "usdt",
    label: "USDT",
    hint: "Crypto (TRC20)",
    iconBg: "#e7f9f1",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
        <path d="M12 2 2 8l10 14L22 8 12 2Z" fill="#26a17b" />
        <path
          d="M13 9.6v-2h4V6H7v1.6h4v2c-3.2.15-5.6.8-5.6 1.55S7.8 12.5 11 12.65v4.35h2v-4.35c3.2-.15 5.6-.8 5.6-1.55S16.2 9.75 13 9.6Zm-1 2.65c-2.9 0-5.25-.5-5.25-1.1s2.35-1.1 5.25-1.1 5.25.5 5.25 1.1-2.35 1.1-5.25 1.1Z"
          fill="#fff"
        />
      </svg>
    ),
  },
  {
    id: "razorpay",
    label: "Razorpay",
    hint: "Cards, UPI, Netbanking, Wallets",
    iconBg: "#eef2ff",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
        <path d="M15.5 2 6 14.5h5.2L9.5 22 18 9.5h-5.2L15.5 2Z" fill="#3b82f6" />
      </svg>
    ),
  },
  {
    id: "card",
    label: "Credit Card",
    hint: "Visa, Mastercard",
    iconBg: "#f1edff",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
        <rect x="2.5" y="5.5" width="19" height="13" rx="2" fill="#7c4fe0" />
        <rect x="2.5" y="9" width="19" height="2.5" fill="#fff" />
        <rect x="5" y="14" width="6" height="1.6" rx="0.8" fill="#fff" />
      </svg>
    ),
  },
  {
    id: "debit_card",
    label: "Debit Card",
    hint: "Visa, Mastercard",
    iconBg: "#e9eefd",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
        <rect x="2.5" y="5.5" width="19" height="13" rx="2" fill="#2f6fed" />
        <rect x="2.5" y="9" width="19" height="2.5" fill="#fff" />
        <rect x="5" y="14" width="6" height="1.6" rx="0.8" fill="#fff" />
      </svg>
    ),
  },
  {
    id: "paypal",
    label: "PayPal",
    hint: "Pay in USD",
    iconBg: "#eaf2ff",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
        <path
          d="M7.5 19h-2l1.9-12h4.9c2.6 0 4.1 1.3 3.7 3.6-.4 2.7-2.4 4.2-5.1 4.2H8.6L7.5 19Z"
          fill="#1e3a8a"
        />
        <path
          d="M10 15.8h1.9c1.9 0 3.4-1.1 3.7-3.1.3-2-.9-3-2.9-3H9.2L10 15.8Z"
          fill="#2563eb"
        />
      </svg>
    ),
  },
];

const CheckoutPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, totalAmount, clearCart } = useCart();
  const session = getSession();

  const address = location.state?.address;

  const [paymentMethod, setPaymentMethod] = useState("upi_manual");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [usdtInvoice, setUsdtInvoice] = useState(null);
  const [polling, setPolling] = useState(false);
  const [upiInvoice, setUpiInvoice] = useState(null);
  const [utrValue, setUtrValue] = useState("");
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [utrSubmitted, setUtrSubmitted] = useState(false);

  useEffect(() => {
    if (!address || items.length === 0) {
      navigate("/cart", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll for USDT payment confirmation once the invoice is shown
  useEffect(() => {
    if (!usdtInvoice || !polling) return;
    const interval = setInterval(async () => {
      try {
        const status = await getUsdtPaymentStatus(usdtInvoice.dbOrderId);
        if (status.paymentStatus === "paid") {
          clearInterval(interval);
          clearCart();
          navigate(`/order-confirmation/${usdtInvoice.dbOrderId}`);
        }
      } catch (err) {
        // stay quiet, keep polling
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [usdtInvoice, polling, navigate, clearCart]);

  if (!address || items.length === 0) return null;

  const buildItemsPayload = () =>
    items.map((item) => ({ brand: item.brand, denomination: item.denomination, quantity: item.quantity }));

  const handleUtrSubmit = async (e) => {
    e.preventDefault();
    if (!utrValue.trim()) {
      setError("Enter the UTR / reference number from your UPI app.");
      return;
    }
    setUtrSubmitting(true);
    setError("");
    try {
      await submitUtr(upiInvoice.dbOrderId, utrValue.trim());
      clearCart();
      setUtrSubmitted(true);
      setTimeout(() => navigate(`/order-confirmation/${upiInvoice.dbOrderId}`), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit the UTR. Please try again.");
      setUtrSubmitting(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const order = await createOrder({ items: buildItemsPayload(), paymentMethod, address });

      if (paymentMethod === "paypal") {
        const approveUrl = await createPaypalOrder(order._id);
        clearCart();
        window.location.href = approveUrl;
        return;
      }

      if (paymentMethod === "usdt") {
        const invoice = await createUsdtInvoice(order._id);
        setUsdtInvoice({ ...invoice, dbOrderId: order._id });
        setPolling(true);
        setSubmitting(false);
        return;
      }

      if (paymentMethod === "upi_manual") {
        const qr = await getUpiQrDetails(order._id);
        setUpiInvoice({ ...qr, dbOrderId: order._id });
        setSubmitting(false);
        return;
      }

      // razorpay / card / debit_card all go through Razorpay Checkout
      const razorpayData = await createRazorpayOrder(order._id);
      openRazorpayCheckout({
        razorpayOrderId: razorpayData.razorpayOrderId,
        amount: razorpayData.amount,
        currency: razorpayData.currency,
        keyId: razorpayData.keyId,
        preferredMethod: paymentMethod,
        userName: session?.user?.fullName,
        userEmail: session?.user?.email,
        onSuccess: async (response) => {
          try {
            await verifyRazorpayPayment({
              orderId: order._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            clearCart();
            navigate(`/order-confirmation/${order._id}`);
          } catch (err) {
            setError("Payment succeeded but verification failed. Contact support with your order ID.");
          }
        },
        onDismiss: () => setSubmitting(false),
      });
    } catch (err) {
      const message = err.response?.data?.message || "Something went wrong. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  };

  // ---- Manual UPI: QR + UTR entry screen ----
  if (upiInvoice) {
    return (
      <div className="buy-page upi-wait-page">
        <div
          className="checkout-bg-decor upi-wait-bg-decor"
          style={{ backgroundImage: "url(/images/upi-wait-bg.png)" }}
          aria-hidden="true"
        />
        <div className="usdt-invoice-card">
          <h2>Scan & pay via any UPI app</h2>
          <img src={upiInvoice.qrImageUrl} alt="UPI QR code" className="upi-qr-image" />
          <div className="usdt-field">
            <span>UPI ID</span>
            <code>{upiInvoice.upiId}</code>
          </div>
          <div className="usdt-field">
            <span>Amount to pay</span>
            <strong>₹{upiInvoice.amount.toLocaleString("en-IN")}</strong>
          </div>

          {utrSubmitted ? (
            <p className="shop-status">✅ UTR submitted — redirecting…</p>
          ) : (
            <form onSubmit={handleUtrSubmit}>
              {error && <div className="auth-error" role="alert">{error}</div>}
              <label className="auth-field" style={{ textAlign: "left" }}>
                <span>UTR / Reference number (from your UPI app, after paying)</span>
                <input
                  value={utrValue}
                  onChange={(e) => setUtrValue(e.target.value)}
                  placeholder="e.g. 123456789012"
                />
              </label>
              <button type="submit" className="auth-submit" disabled={utrSubmitting} style={{ marginTop: "0.5rem" }}>
                {utrSubmitting ? "Submitting…" : "Submit UTR"}
              </button>
            </form>
          )}
          <p className="shop-status" style={{ marginTop: "1rem" }}>
            We'll verify your payment against your UTR and deliver your code shortly after.
          </p>
        </div>
      </div>
    );
  }

  // ---- USDT: waiting-for-blockchain screen ----
  if (usdtInvoice) {
    return (
      <div className="buy-page">
        <div className="usdt-invoice-card">
          <h2>Send USDT to complete your order</h2>
          <p className="shop-status">Waiting for blockchain confirmation…</p>
          <div className="usdt-field">
            <span>Amount</span>
            <strong>{usdtInvoice.payAmount} {usdtInvoice.payCurrency?.toUpperCase()}</strong>
          </div>
          <div className="usdt-field">
            <span>Send to address</span>
            <code>{usdtInvoice.payAddress}</code>
          </div>
          <p className="shop-status">
            This page will automatically move on once payment is confirmed on-chain — no need to refresh.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="buy-page checkout-payment-page">
      <div
        className="checkout-bg-decor payment-bg-decor"
        style={{ backgroundImage: "url(/images/payment-bg.png)" }}
        aria-hidden="true"
      />
      <div className="buy-summary-card">
        <span className="giftcard-card-console">Order summary</span>
        {items.map((item) => (
          <div className="confirmation-row" key={`${item.brand}-${item.denomination}`}>
            <span>
              {getBrand(item.brand).name} ₹{item.denomination.toLocaleString("en-IN")} × {item.quantity}
            </span>
            <strong>₹{(item.denomination * item.quantity).toLocaleString("en-IN")}</strong>
          </div>
        ))}
        <div className="confirmation-row" style={{ borderTop: "1px solid var(--card-border)", marginTop: "0.5rem", paddingTop: "0.75rem" }}>
          <span>Total</span>
          <strong>₹{totalAmount.toLocaleString("en-IN")}</strong>
        </div>
        <div className="order-row-meta delivering-to" style={{ marginTop: "0.75rem" }}>
          <span className="delivering-to-icon" aria-hidden="true">📨</span>
          <span>
            Delivering to: {address.fullName}, {address.city}
          </span>
        </div>
      </div>

      <form className="buy-form-card" onSubmit={handlePayment}>
        <h2 className="auth-form-title">Payment method</h2>
        {error && <div className="auth-error" role="alert">{error}</div>}

        <div className="payment-method-grid">
          {PAYMENT_METHODS.map((method) => {
            const isEnabled = ENABLED_METHODS.includes(method.id);
            return (
              <button
                type="button"
                key={method.id}
                className={`payment-method-tile ${paymentMethod === method.id ? "is-selected" : ""} ${
                  isEnabled ? "" : "is-disabled"
                }`}
                onClick={() => isEnabled && setPaymentMethod(method.id)}
                disabled={!isEnabled}
                aria-disabled={!isEnabled}
                title={isEnabled ? undefined : "Coming soon"}
              >
                <span className="payment-method-label">{method.label}</span>
                <span className="payment-method-hint">
                  {isEnabled ? method.hint : "Coming soon"}
                </span>
              </button>
            );
          })}
        </div>

        <button type="submit" className="auth-submit" disabled={submitting} style={{ marginTop: "1.5rem" }}>
          {submitting ? "Processing…" : "Pay & get my gift cards"}
        </button>
      </form>
    </div>
  );
};

export default CheckoutPayment;
