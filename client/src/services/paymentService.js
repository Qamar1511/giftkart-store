import apiClient from "./apiClient";

/* ---------- Razorpay (covers razorpay / card / debit_card / upi) ---------- */

export const createRazorpayOrder = async (orderId) => {
  const { data } = await apiClient.post("/payments/razorpay/create", { orderId });
  return data;
};

export const verifyRazorpayPayment = async (payload) => {
  const { data } = await apiClient.post("/payments/razorpay/verify", payload);
  return data.order;
};

/**
 * Opens the Razorpay Checkout widget. `preferredMethod` hints which tab
 * opens first (card / upi / netbanking) — the customer can still switch.
 */
export const openRazorpayCheckout = ({
  razorpayOrderId,
  amount,
  currency,
  keyId,
  preferredMethod,
  userName,
  userEmail,
  onSuccess,
  onDismiss,
}) => {
  if (!window.Razorpay) {
    alert("Payment SDK failed to load. Check your internet connection and try again.");
    return;
  }

  const methodConfig = {
    card: { card: true, upi: false, netbanking: false, wallet: false },
    debit_card: { card: true, upi: false, netbanking: false, wallet: false },
  }[preferredMethod];

  const options = {
    key: keyId,
    amount,
    currency,
    name: "GIFTKART",
    description: "Gift Card Purchase",
    order_id: razorpayOrderId,
    prefill: { name: userName, email: userEmail },
    theme: { color: "#3b7bf6" },
    ...(methodConfig ? { config: { display: { blocks: {}, hide: [] } }, method: methodConfig } : {}),
    handler: onSuccess,
    modal: { ondismiss: onDismiss },
  };

  const razorpayInstance = new window.Razorpay(options);
  razorpayInstance.open();
};

/* --------------------------------- PayPal --------------------------------- */

export const createPaypalOrder = async (orderId) => {
  const { data } = await apiClient.post("/payments/paypal/create", { orderId });
  return data.approveUrl;
};

export const capturePaypalOrder = async (orderId) => {
  const { data } = await apiClient.post("/payments/paypal/capture", { orderId });
  return data.order;
};

/* ------------------------------- Manual USDT -------------------------------- */

export const getUsdtWalletDetails = async (orderId) => {
  const { data } = await apiClient.get(`/payments/usdt/wallet/${orderId}`);
  return data;
};

/* ------------------------------ Manual UPI --------------------------------- */

export const getUpiQrDetails = async (orderId) => {
  const { data } = await apiClient.get(`/payments/upi/qr/${orderId}`);
  return data;
};

/* ------------------------------- Test mode -------------------------------- */

export const mockConfirmPayment = async (orderId) => {
  const { data } = await apiClient.post("/payments/mock/confirm", { orderId });
  return data.order;
};
