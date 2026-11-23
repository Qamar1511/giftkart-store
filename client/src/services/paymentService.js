import apiClient from "./apiClient";

/* ---------- Razorpay (covers razorpay / card / debit_card / upi) ---------- */

// checkout.js used to sit in index.html with `defer`, so every visitor
// downloaded and parsed a few hundred KB of third-party JS even if they never
// went near checkout. On a throttled mobile connection that came straight out
// of the homepage's budget — it was the single biggest mobile-only cost on the
// site. It's now injected on demand: the payment page warms it on mount (long
// before anyone can click Pay) and openRazorpayCheckout awaits it as a
// safety net.
const RAZORPAY_SDK_URL = "https://checkout.razorpay.com/v1/checkout.js";
let razorpayLoader = null;

export const loadRazorpayCheckout = () => {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  // One shared promise, so the mount-time warm and a click-time await can
  // never inject the script twice.
  if (razorpayLoader) return razorpayLoader;

  razorpayLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("Razorpay checkout.js loaded but window.Razorpay is missing"));
    };
    script.onerror = () => {
      // Clear the cache so a retry — say, after the customer fixes their
      // connection — actually re-attempts the download instead of replaying
      // this rejection forever.
      razorpayLoader = null;
      reject(new Error("Failed to load Razorpay checkout.js"));
    };
    document.head.appendChild(script);
  });

  return razorpayLoader;
};

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
 *
 * Async because the SDK is no longer in index.html. In practice the script is
 * already warm (CheckoutPayment fetches it on mount), so this resolves
 * instantly; the await only matters if someone reaches Pay unusually fast or
 * the warm-up failed.
 */
export const openRazorpayCheckout = async ({
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
  try {
    await loadRazorpayCheckout();
  } catch (err) {
    // `userMessage` is what the payment page shows the customer; the raw
    // message stays on the error for the console.
    err.userMessage = "Payment SDK couldn't load. Check your internet connection and try again.";
    throw err;
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
