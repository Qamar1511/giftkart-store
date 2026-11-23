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
    denominations: [1000, 2000, 3000, 4000, 5000],
  },
  {
    slug: "steam",
    name: "Steam",
    tagline: "Steam Wallet Code",
    category: "gaming",
    color: "#1b2838",
    denominations: [500, 1000, 2000, 5000],
  },
  {
    slug: "xbox",
    name: "Xbox",
    tagline: "Xbox Gift Card",
    category: "gaming",
    color: "#107c10",
    denominations: [1000, 2000, 3000, 5000],
  },
  {
    slug: "amazon",
    name: "Amazon",
    tagline: "Amazon.in Gift Card",
    category: "shopping",
    color: "#ff9900",
    denominations: [500, 1000, 2000, 5000],
  },
  {
    slug: "flipkart",
    name: "Flipkart",
    tagline: "Flipkart Gift Card",
    category: "shopping",
    color: "#2874f0",
    denominations: [500, 1000, 2000, 5000],
  },
  {
    slug: "google-play",
    name: "Google Play",
    tagline: "Google Play Recharge Code",
    category: "entertainment",
    color: "#01875f",
    denominations: [500, 1000, 2000, 5000],
  },
  {
    slug: "netflix",
    name: "Netflix",
    tagline: "Netflix Gift Card",
    category: "entertainment",
    color: "#e50914",
    denominations: [500, 1000, 2000],
  },
  {
    slug: "swiggy",
    name: "Swiggy",
    tagline: "Swiggy Gift Card",
    category: "food",
    color: "#fc8019",
    denominations: [250, 500, 1000],
  },
  {
    slug: "dominos",
    name: "Domino's",
    tagline: "Domino's Gift Voucher",
    category: "food",
    color: "#e31837",
    denominations: [250, 500, 1000],
  },
  {
    slug: "paypal",
    name: "PayPal",
    tagline: "PayPal Balance Top-up",
    category: "payments",
    color: "#003087",
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

// Placeholder conversion rate for PayPal (USD) and USDT pricing.
// Replace with a live forex rate lookup before going live.
const INR_TO_USD_RATE = 0.012;

module.exports = { CATEGORIES, BRANDS, BRAND_SLUGS, ALL_DENOMINATIONS, INR_TO_USD_RATE, getBrand };
