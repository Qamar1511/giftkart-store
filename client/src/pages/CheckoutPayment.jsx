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
  mockConfirmPayment,
} from "../services/paymentService";
import { getSession } from "../services/authService";
import { getBrand } from "../data/catalog";
import "../styles/Shop.css";

const PAYMENT_METHODS = [
  { id: "razorpay", label: "Razorpay", hint: "Cards, UPI, Netbanking, Wallets" },
  { id: "card", label: "Credit Card", hint: "via Razorpay" },
  { id: "debit_card", label: "Debit Card", hint: "via Razorpay" },
  { id: "upi_manual", label: "UPI (Scan QR)", hint: "Pay via any UPI app" },
  { id: "usdt", label: "USDT", hint: "Crypto (TRC20)" },
  { id: "paypal", label: "PayPal", hint: "Pay in USD" },
];

const CheckoutPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, totalAmount, clearCart } = useCart();
  const session = getSession();

  const address = location.state?.address;

  const [paymentMethod, setPaymentMethod] = useState("razorpay");
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

  const handleMockPayment = async () => {
    setSubmitting(true);
    setError("");
    try {
      const order = await createOrder({ items: buildItemsPayload(), paymentMethod, address });
      await mockConfirmPayment(order._id);
      clearCart();
      navigate(`/order-confirmation/${order._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't simulate the payment.");
      setSubmitting(false);
    }
  };

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
      <div className="buy-page">
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
    <div className="buy-page">
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
        <p className="order-row-meta" style={{ marginTop: "0.75rem" }}>
          Delivering to: {address.fullName}, {address.city}
        </p>
      </div>

      <form className="buy-form-card" onSubmit={handlePayment}>
        <h2 className="auth-form-title">Payment method</h2>
        {error && <div className="auth-error" role="alert">{error}</div>}

        <div className="payment-method-grid">
          {PAYMENT_METHODS.map((method) => (
            <button
              type="button"
              key={method.id}
              className={`payment-method-tile ${paymentMethod === method.id ? "is-selected" : ""}`}
              onClick={() => setPaymentMethod(method.id)}
            >
              <span className="payment-method-label">{method.label}</span>
              <span className="payment-method-hint">{method.hint}</span>
            </button>
          ))}
        </div>

        <button type="submit" className="auth-submit" disabled={submitting} style={{ marginTop: "1.5rem" }}>
          {submitting ? "Processing…" : "Pay & get my gift cards"}
        </button>

        <button type="button" className="test-mode-btn" disabled={submitting} onClick={handleMockPayment}>
          🧪 Test mode: simulate successful payment (no real gateway needed)
        </button>
      </form>
    </div>
  );
};

export default CheckoutPayment;
