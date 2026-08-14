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

// Placeholder conversion rate for PayPal (USD) and USDT pricing.
// Replace with a live forex rate lookup before going live.
const INR_TO_USD_RATE = 0.012;

module.exports = { CATEGORIES, BRANDS, BRAND_SLUGS, ALL_DENOMINATIONS, INR_TO_USD_RATE, getBrand };
