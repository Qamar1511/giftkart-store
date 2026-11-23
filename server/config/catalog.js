// Single source of truth for the store's brand catalog.
// Add/remove brands or denominations here, then re-run the seed script.
// `color` drives the brand's badge color on the frontend (we don't ship
// real brand logos — see BrandBadge.jsx on the client).

const CATEGORIES = [
  { slug: "gaming", label: "Gaming" },
  { slug: "shopping", label: "Shopping" },
  { slug: "entertainment", label: "Entertainment" },
  { slug: "food", label: "Food & Lifestyle" },
  { slug: "payments", label: "Payments" },
];

const BRANDS = [
  {
    slug: "psn",
    name: "PlayStation",
    tagline: "PSN Wallet Top-up",
    category: "gaming",
    color: "#0070d1",
    image: "/images/brands/psn.jpg",
    denominationImages: {
      1000: "/images/giftcards/psn-1000.jpg",
      2000: "/images/giftcards/psn-2000.jpg",
      3000: "/images/giftcards/psn-3000.jpg",
      4000: "/images/giftcards/psn-4000.jpg",
      5000: "/images/giftcards/psn-5000.jpg",
    },
    denominations: [1000, 2000, 3000, 4000, 5000],
  },
  {
    slug: "steam",
    name: "Steam",
    tagline: "Steam Wallet Code",
    category: "gaming",
    color: "#1b2838",
    image: "/images/brands/steam.jpg",
    denominationImages: {
      1000: "/images/giftcards/steam-1000.jpg",
      2000: "/images/giftcards/steam-2000.jpg",
      3000: "/images/giftcards/steam-3000.jpg",
      4000: "/images/giftcards/steam-4000.jpg",
      5000: "/images/giftcards/steam-5000.jpg",
    },
    denominations: [1000, 2000, 3000, 4000, 5000],
  },
  {
    slug: "xbox",
    name: "Xbox",
    tagline: "Xbox Gift Card",
    category: "gaming",
    color: "#107c10",
    image: "/images/brands/xbox.jpg",
    denominationImages: {
      1000: "/images/giftcards/xbox-1000.jpg",
      2000: "/images/giftcards/xbox-2000.jpg",
      3000: "/images/giftcards/xbox-3000.jpg",
      4000: "/images/giftcards/xbox-4000.jpg",
      5000: "/images/giftcards/xbox-5000.jpg",
    },
    denominations: [1000, 2000, 3000, 4000, 5000],
  },
  {
    slug: "amazon",
    name: "Amazon",
    tagline: "Amazon.in Gift Card",
    category: "shopping",
    color: "#ff9900",
    image: "/images/brands/amazon.jpg",
    denominationImages: {
      2000: "/images/giftcards/amazon-2000.jpg",
      3000: "/images/giftcards/amazon-3000.jpg",
      5000: "/images/giftcards/amazon-5000.jpg",
    },
    denominations: [500, 1000, 2000, 3000, 5000],
  },
  {
    slug: "flipkart",
    name: "Flipkart",
    tagline: "Flipkart Gift Card",
    category: "shopping",
    color: "#2874f0",
    image: "/images/brands/flipkart.jpg",
    denominationImages: {
      1000: "/images/giftcards/flipkart-1000.jpg",
      2000: "/images/giftcards/flipkart-2000.jpg",
      3000: "/images/giftcards/flipkart-3000.jpg",
      4000: "/images/giftcards/flipkart-4000.jpg",
      5000: "/images/giftcards/flipkart-5000.jpg",
    },
    denominations: [1000, 2000, 3000, 4000, 5000],
  },
  {
    slug: "google-play",
    name: "Google Play",
    tagline: "Google Play Recharge Code",
    category: "entertainment",
    color: "#01875f",
    image: "/images/brands/google-play.jpg",
    denominations: [500, 1000, 2000, 5000],
  },
  {
    slug: "netflix",
    name: "Netflix",
    tagline: "Netflix Gift Card",
    category: "entertainment",
    color: "#e50914",
    image: "/images/brands/netflix.jpg",
    denominationImages: {
      1000: "/images/giftcards/netflix-1000.jpg",
      2000: "/images/giftcards/netflix-2000.jpg",
      3000: "/images/giftcards/netflix-3000.jpg",
      4000: "/images/giftcards/netflix-4000.jpg",
    },
    denominations: [1000, 2000, 3000, 4000],
  },
  {
    slug: "swiggy",
    name: "Swiggy",
    tagline: "Swiggy Gift Card",
    category: "food",
    color: "#fc8019",
    image: "/images/brands/swiggy.jpg",
    denominations: [250, 500, 1000],
  },
  {
    slug: "dominos",
    name: "Domino's",
    tagline: "Domino's Gift Voucher",
    category: "food",
    color: "#e31837",
    image: "/images/brands/dominos.jpg",
    denominationImages: {
      1000: "/images/giftcards/dominos-1000.jpg",
    },
    denominations: [250, 500, 1000],
  },
  {
    slug: "paypal",
    name: "PayPal",
    tagline: "PayPal Balance Top-up",
    category: "payments",
    color: "#003087",
    image: "/images/brands/paypal.jpg",
    denominationImages: {
      1000: "/images/giftcards/paypal-1000.jpg",
    },
    denominations: [1000, 2500, 5000],
  },
];

const BRAND_SLUGS = BRANDS.map((b) => b.slug);

function getBrand(slug) {
  return BRANDS.find((b) => b.slug === slug) || null;
}

// Flat list of every distinct denomination across all brands — used only
// for a loose schema-level sanity check; the real brand+denomination
// combo is validated in the controllers against getBrand().denominations.
const ALL_DENOMINATIONS = [...new Set(BRANDS.flatMap((b) => b.denominations))];

// Placeholder conversion rate for PayPal (USD). Replace with a live forex
// rate lookup before going live. (USDT pricing no longer uses this — see
// CURRENCIES below — but it's kept for the PayPal flow.)
const INR_TO_USD_RATE = 0.012;

// -------------------------- Buying currencies ---------------------------
// Customers pick a buying currency at signup and can switch it from the
// navbar (see User.currency). The catalog `denomination` stays the face
// value / stock key; the price we actually charge is DERIVED from it per
// currency using the `rate` below:
//
//   INR  = denomination × 1.1     →  1000 → ₹1100, 2000 → ₹2200 … 5000 → ₹5500
//   USDT = denomination × 0.011   →  1000 → $11,   2000 → $22   … 5000 → $55
//
// The 1000–5000 prices match the agreed price list exactly; any other
// denomination (250 / 500 / 2500) follows the same formula
// (e.g. 250 → ₹275 / $2.75, 500 → ₹550 / $5.50, 2500 → ₹2750 / $27.50).
const CURRENCIES = {
  INR: { code: "INR", symbol: "₹", label: "INR (₹)", rate: 1.1, decimals: 0 },
  USDT: { code: "USDT", symbol: "$", label: "USDT ($)", rate: 0.011, decimals: 2 },
};

const CURRENCY_CODES = Object.keys(CURRENCIES); // ["INR", "USDT"]
const DEFAULT_CURRENCY = "INR";

// Which order paymentMethods are valid for each buying currency. INR is
// paid in rupees (UPI/Razorpay/cards); USDT is paid on-chain.
const CURRENCY_PAYMENT_METHODS = {
  INR: ["razorpay", "card", "debit_card", "upi_manual"],
  USDT: ["usdt"],
};

// ---------------------- Admin-editable price rates ----------------------
// The two `rate` values above are only DEFAULTS. Admin can change them from
// Admin → Pricing, which persists them in the PricingSetting singleton and
// then calls setRates() here so the whole server uses the new multipliers
// immediately — no redeploy.
//
// Why an in-memory cache instead of reading Mongo inside priceFor(): priceFor
// is synchronous and called from dozens of places (product listing, order
// creation, invoices, emails). Making it async would ripple through the whole
// codebase. So instead we mutate CURRENCIES[code].rate in place and hydrate it
// once at boot (see hydratePricing in server.js) plus on every admin save.
const DEFAULT_RATES = Object.freeze(
  CURRENCY_CODES.reduce((acc, code) => {
    acc[code] = CURRENCIES[code].rate;
    return acc;
  }, {})
);

// Currently active multipliers, e.g. { INR: 1.1, USDT: 0.011 }.
function getRates() {
  return CURRENCY_CODES.reduce((acc, code) => {
    acc[code] = CURRENCIES[code].rate;
    return acc;
  }, {});
}

// Overwrite the live multipliers. Only positive finite numbers for known
// currency codes are accepted; anything else is ignored so a bad value can
// never zero out the store's prices. Returns the rates actually in effect.
function setRates(next = {}) {
  CURRENCY_CODES.forEach((code) => {
    const value = Number(next[code]);
    if (Number.isFinite(value) && value > 0) {
      CURRENCIES[code].rate = value;
    }
  });
  return getRates();
}

// Back to the hardcoded defaults (used by the admin "Reset" action).
function resetRates() {
  return setRates(DEFAULT_RATES);
}

// Price of a single denomination in the given currency, correctly rounded
// (INR = whole rupees, USDT = 2 decimals). Reads the LIVE rate, so it always
// reflects whatever admin last saved.
function priceFor(denomination, currency = DEFAULT_CURRENCY) {
  const cfg = CURRENCIES[currency] || CURRENCIES[DEFAULT_CURRENCY];
  const raw = Number(denomination) * cfg.rate;
  return cfg.decimals === 0 ? Math.round(raw) : +raw.toFixed(cfg.decimals);
}

// Both currency prices for a denomination, e.g. { INR: 1100, USDT: 11 } —
// handy to attach to each product in the /api/products response.
function pricesFor(denomination) {
  return CURRENCY_CODES.reduce((acc, code) => {
    acc[code] = priceFor(denomination, code);
    return acc;
  }, {});
}

// -------------------------- Purchase limits -----------------------------
// Anti-abuse caps enforced authoritatively in orderController.createOrder
// (and mirrored as UX guardrails in the client cart):
//   • At most 3 gift cards per single order (sum of item quantities).
//   • At most ₹15,200 of purchases per user in any rolling 30-day window.
// The monthly cap is always measured in an INR-equivalent value so it
// applies identically to USDT buyers (USDT orders are converted back to
// their INR face-based price for the tally).
const MAX_CARDS_PER_ORDER = 3;
const MONTHLY_SPEND_LIMIT_INR = 15200;
const MONTHLY_WINDOW_DAYS = 30;

// INR-equivalent value of a set of order items — face × 1.1 per unit,
// regardless of the order's actual buying currency. Used only for the
// per-user monthly spend cap so the limit is currency-agnostic.
function orderInrValue(items = []) {
  return items.reduce(
    (sum, it) =>
      sum + priceFor(Number(it.denomination), "INR") * Number(it.quantity || 0),
    0
  );
}

module.exports = {
  CATEGORIES,
  BRANDS,
  BRAND_SLUGS,
  ALL_DENOMINATIONS,
  INR_TO_USD_RATE,
  CURRENCIES,
  CURRENCY_CODES,
  DEFAULT_CURRENCY,
  CURRENCY_PAYMENT_METHODS,
  DEFAULT_RATES,
  getRates,
  setRates,
  resetRates,
  MAX_CARDS_PER_ORDER,
  MONTHLY_SPEND_LIMIT_INR,
  MONTHLY_WINDOW_DAYS,
  orderInrValue,
  priceFor,
  pricesFor,
  getBrand,
};
