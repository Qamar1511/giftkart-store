import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { createOrder, submitUtr, submitUsdtTx } from "../services/orderService";
import {
  createRazorpayOrder,
  openRazorpayCheckout,
  verifyRazorpayPayment,
  createPaypalOrder,
  getUsdtWalletDetails,
  getUpiQrDetails,
  mockConfirmPayment, // eslint-disable-line no-unused-vars -- kept for potential future dev/testing use
} from "../services/paymentService";
import { getSession } from "../services/authService";
import { getBrand, CURRENCY_PAYMENT_METHODS } from "../data/catalog";
import Seo from "../components/Seo";
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

// Payment methods available for a buying currency, in tile order. INR is paid
// in rupees (UPI/cards), USDT is paid on-chain — so we only show the tiles that
// match the shopper's currency (see CURRENCY_PAYMENT_METHODS).
const methodsForCurrency = (currency) => {
  const allowed = CURRENCY_PAYMENT_METHODS[currency] || CURRENCY_PAYMENT_METHODS.INR;
  return PAYMENT_METHODS.filter((m) => allowed.includes(m.id));
};

// The method to pre-select for a currency: the first *enabled* one for it
// (INR → UPI, USDT → USDT), falling back to the first allowed tile.
const defaultMethodFor = (currency) => {
  const methods = methodsForCurrency(currency);
  const enabled = methods.find((m) => ENABLED_METHODS.includes(m.id));
  return (enabled || methods[0])?.id || "upi_manual";
};

const CheckoutPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, clearCart } = useCart();
  const { currency, formatMoney, priceFor, totalFor } = useCurrency();
  const session = getSession();

  const address = location.state?.address;

  const [paymentMethod, setPaymentMethod] = useState(() => defaultMethodFor(currency));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [usdtInvoice, setUsdtInvoice] = useState(null);
  const [txIdValue, setTxIdValue] = useState("");
  const [txIdSubmitting, setTxIdSubmitting] = useState(false);
  const [txIdSubmitted, setTxIdSubmitted] = useState(false);
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

  // If the shopper switches buying currency (e.g. via the navbar) while on this
  // page, the previously-selected tile may no longer be valid for that currency.
  // Snap the selection back to that currency's default method (INR → UPI,
  // USDT → USDT) so it always matches what the server will accept.
  useEffect(() => {
    const allowed = CURRENCY_PAYMENT_METHODS[currency] || [];
    if (!allowed.includes(paymentMethod)) {
      setPaymentMethod(defaultMethodFor(currency));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  if (!address || items.length === 0) return null;

  const buildItemsPayload = () =>
    items.map((item) => ({ brand: item.brand, denomination: item.denomination, quantity: item.quantity }));

  const handleUtrSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{12}$/.test(utrValue.trim())) {
      setError("Enter the 12-digit UTR / reference number from your UPI app.");
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

  const handleTxIdSubmit = async (e) => {
    e.preventDefault();
    if (txIdValue.trim().length < 10) {
      setError("Enter the transaction hash / ID from your wallet or exchange app.");
      return;
    }
    setTxIdSubmitting(true);
    setError("");
    try {
      await submitUsdtTx(usdtInvoice.dbOrderId, txIdValue.trim());
      clearCart();
      setTxIdSubmitted(true);
      setTimeout(() => navigate(`/order-confirmation/${usdtInvoice.dbOrderId}`), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit the transaction ID. Please try again.");
      setTxIdSubmitting(false);
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
        const wallet = await getUsdtWalletDetails(order._id);
        setUsdtInvoice({ ...wallet, dbOrderId: order._id });
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
                  onChange={(e) => setUtrValue(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="12-digit UTR, e.g. 123456789012"
                  inputMode="numeric"
                  maxLength={12}
                />
                <span className="shop-status" style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>
                  {utrValue.length}/12 digits
                </span>
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

  // ---- Manual USDT: wallet address / QR + transaction ID entry screen ----
  if (usdtInvoice) {
    return (
      <div className="buy-page">
        <div className="usdt-invoice-card">
          <h2>Send USDT to complete your order</h2>
          <img src={usdtInvoice.qrImageUrl} alt="USDT wallet address QR code" className="upi-qr-image" />
          <div className="usdt-field">
            <span>Network</span>
            <strong>{usdtInvoice.network}</strong>
          </div>
          <div className="usdt-field">
            <span>Send to address</span>
            <code>{usdtInvoice.walletAddress}</code>
          </div>
          <div className="usdt-field">
            <span>Amount</span>
            <strong>{usdtInvoice.amount} USDT</strong>
          </div>

          {txIdSubmitted ? (
            <p className="shop-status">✅ Transaction ID submitted — redirecting…</p>
          ) : (
            <form onSubmit={handleTxIdSubmit}>
              {error && <div className="auth-error" role="alert">{error}</div>}
              <label className="auth-field" style={{ textAlign: "left" }}>
                <span>Transaction hash / ID (from your wallet or exchange app, after sending)</span>
                <input
                  value={txIdValue}
                  onChange={(e) => setTxIdValue(e.target.value)}
                  placeholder="e.g. a1b2c3d4e5f6…"
                />
              </label>
              <button type="submit" className="auth-submit" disabled={txIdSubmitting} style={{ marginTop: "0.5rem" }}>
                {txIdSubmitting ? "Submitting…" : "Submit transaction ID"}
              </button>
            </form>
          )}
          <p className="shop-status" style={{ marginTop: "1rem" }}>
            Double-check the network before sending — sending on the wrong network can lose your funds. We'll verify your transaction and deliver your code shortly after.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="buy-page checkout-payment-page">
      <Seo title="Payment — GIFTKART" path="/checkout/payment" noindex />
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
            <strong>{formatMoney(priceFor(item.denomination) * item.quantity)}</strong>
          </div>
        ))}
        <div className="confirmation-row" style={{ borderTop: "1px solid var(--card-border)", marginTop: "0.5rem", paddingTop: "0.75rem" }}>
          <span>Total</span>
          <strong>{formatMoney(totalFor(items))}</strong>
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
          {methodsForCurrency(currency).map((method) => {
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
