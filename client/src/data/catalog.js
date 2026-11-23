// Frontend mirror of server/config/catalog.js — display metadata only
// (name, color, image, category). Live stock/denominations always come
// from the /api/products response; this file just lets any page look up
// a brand's name/color/image instantly without an extra fetch (e.g. cart,
// checkout, order history rows). Per-denomination card images (like the
// PSN/Amazon card art) only apply on the product grid, driven by the API
// response — this file only needs each brand's one generic image.

export const CATEGORIES = [
  { slug: "gaming", label: "Gaming" },
  { slug: "shopping", label: "Shopping" },
  { slug: "entertainment", label: "Entertainment" },
  { slug: "food", label: "Food & Lifestyle" },
  { slug: "payments", label: "Payments" },
];

export const BRANDS = [
  { slug: "psn", name: "PlayStation", tagline: "PSN Wallet Top-up", category: "gaming", color: "#0070d1", image: "/images/brands/psn.jpg" },
  { slug: "steam", name: "Steam", tagline: "Steam Wallet Code", category: "gaming", color: "#1b2838", image: "/images/brands/steam.jpg" },
  { slug: "xbox", name: "Xbox", tagline: "Xbox Gift Card", category: "gaming", color: "#107c10", image: "/images/brands/xbox.jpg" },
  { slug: "amazon", name: "Amazon", tagline: "Amazon.in Gift Card", category: "shopping", color: "#ff9900", image: "/images/brands/amazon.jpg" },
  { slug: "flipkart", name: "Flipkart", tagline: "Flipkart Gift Card", category: "shopping", color: "#2874f0", image: "/images/brands/flipkart.jpg" },
  { slug: "google-play", name: "Google Play", tagline: "Google Play Recharge Code", category: "entertainment", color: "#01875f", image: "/images/brands/google-play.jpg" },
  { slug: "netflix", name: "Netflix", tagline: "Netflix Gift Card", category: "entertainment", color: "#e50914", image: "/images/brands/netflix.jpg" },
  { slug: "swiggy", name: "Swiggy", tagline: "Swiggy Gift Card", category: "food", color: "#fc8019", image: "/images/brands/swiggy.jpg" },
  { slug: "dominos", name: "Domino's", tagline: "Domino's Gift Voucher", category: "food", color: "#e31837", image: "/images/brands/dominos.jpg" },
  { slug: "paypal", name: "PayPal", tagline: "PayPal Balance Top-up", category: "payments", color: "#003087", image: "/images/brands/paypal.jpg" },
];

export const brandLookup = Object.fromEntries(BRANDS.map((b) => [b.slug, b]));

export const getBrand = (slug) => brandLookup[slug] || { slug, name: slug, color: "#3b7bf6", image: null, category: "" };

// ------------------------- Buying currencies ----------------------------
// Mirror of server/config/catalog.js. Customers buy in INR or USDT; the
// price is derived from a card's face-value `denomination`:
//   INR  = denomination × 1.1     (1000 → ₹1100 … 5000 → ₹5500)
//   USDT = denomination × 0.011   (1000 → $11   … 5000 → $55)
// The live /api/products response also sends a `pricing` object per product
// ({ INR, USDT }); prefer that when present, and fall back to priceFor().
export const CURRENCIES = {
  INR: { code: "INR", symbol: "₹", label: "INR (₹)", short: "INR", rate: 1.1, decimals: 0 },
  USDT: { code: "USDT", symbol: "$", label: "USDT ($)", short: "USDT", rate: 0.011, decimals: 2 },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES); // ["INR", "USDT"]
export const DEFAULT_CURRENCY = "INR";

// Which checkout payment methods are valid for each buying currency — mirror
// of server/config/catalog.js. INR is paid in rupees (UPI/cards), USDT is
// paid on-chain. Checkout shows only the methods for the shopper's currency.
export const CURRENCY_PAYMENT_METHODS = {
  INR: ["razorpay", "card", "debit_card", "upi_manual"],
  USDT: ["usdt", "binance_uid", "bybit_uid"],
};

export const isCurrency = (code) => CURRENCY_CODES.includes(code);

/* ------------------- Live (admin-editable) price rates -------------------
   The `rate` values in CURRENCIES above are only DEFAULTS / offline fallback.
   Admin can change them from Admin → Pricing, which saves them server-side.
   CurrencyContext fetches the live rates once on app start and calls
   applyRates() so every client-side price calculation — including the cart
   and checkout totals, which are computed here rather than read off the
   server response — matches exactly what the server will charge.
------------------------------------------------------------------------- */
export const DEFAULT_RATES = Object.freeze(
  CURRENCY_CODES.reduce((acc, code) => {
    acc[code] = CURRENCIES[code].rate;
    return acc;
  }, {})
);

// Currently active multipliers, e.g. { INR: 1.1, USDT: 0.011 }.
export const getRates = () =>
  CURRENCY_CODES.reduce((acc, code) => {
    acc[code] = CURRENCIES[code].rate;
    return acc;
  }, {});

// Overwrite the live multipliers from a server response. Ignores anything that
// isn't a positive finite number, so a bad/absent value can never zero out
// prices — the previous (or default) rate simply stays in effect.
// Returns true if any rate actually changed.
export const applyRates = (rates = {}) => {
  let changed = false;
  CURRENCY_CODES.forEach((code) => {
    const value = Number(rates?.[code]);
    if (Number.isFinite(value) && value > 0 && value !== CURRENCIES[code].rate) {
      CURRENCIES[code].rate = value;
      changed = true;
    }
  });
  return changed;
};

// Price of a single denomination in a currency, correctly rounded.
export const priceFor = (denomination, currency = DEFAULT_CURRENCY) => {
  const cfg = CURRENCIES[currency] || CURRENCIES[DEFAULT_CURRENCY];
  const raw = Number(denomination) * cfg.rate;
  return cfg.decimals === 0 ? Math.round(raw) : +raw.toFixed(cfg.decimals);
};

// Format an already-computed amount for display.
//   formatMoney(1100, "INR")  → "₹1,100"
//   formatMoney(11, "USDT")   → "$11"      (whole amounts stay clean)
//   formatMoney(5.5, "USDT")  → "$5.50"    (fractional → exactly 2 decimals)
//   formatMoney(2.75, "USDT") → "$2.75"
export const formatMoney = (amount, currency = DEFAULT_CURRENCY) => {
  const cfg = CURRENCIES[currency] || CURRENCIES[DEFAULT_CURRENCY];
  const n = Number(amount) || 0;
  if (cfg.decimals === 0) {
    return `${cfg.symbol}${Math.round(n).toLocaleString("en-IN")}`;
  }
  // Decimal currency (USDT): show no decimals when the amount is whole,
  // otherwise exactly 2 decimals — "$11", "$5.50", "$1,100.50".
  const body = Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", { minimumFractionDigits: cfg.decimals, maximumFractionDigits: cfg.decimals });
  return `${cfg.symbol}${body}`;
};

// Compute AND format a denomination's price in one call.
export const formatPrice = (denomination, currency = DEFAULT_CURRENCY) =>
  formatMoney(priceFor(denomination, currency), currency);
