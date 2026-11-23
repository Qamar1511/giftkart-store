// Frontend mirror of server/config/catalog.js — display metadata only
// (name, color, category). Live stock/denominations always come from the
// /api/products response; this file just lets any page look up a brand's
// name/color instantly without an extra fetch (e.g. cart, checkout, order
// history rows).

export const CATEGORIES = [
  { slug: "gaming", label: "Gaming" },
  { slug: "shopping", label: "Shopping" },
  { slug: "entertainment", label: "Entertainment" },
  { slug: "food", label: "Food & Lifestyle" },
  { slug: "payments", label: "Payments" },
];

export const BRANDS = [
  { slug: "psn", name: "PlayStation", tagline: "PSN Wallet Top-up", category: "gaming", color: "#0070d1" },
  { slug: "steam", name: "Steam", tagline: "Steam Wallet Code", category: "gaming", color: "#1b2838" },
  { slug: "xbox", name: "Xbox", tagline: "Xbox Gift Card", category: "gaming", color: "#107c10" },
  { slug: "amazon", name: "Amazon", tagline: "Amazon.in Gift Card", category: "shopping", color: "#ff9900" },
  { slug: "flipkart", name: "Flipkart", tagline: "Flipkart Gift Card", category: "shopping", color: "#2874f0" },
  { slug: "google-play", name: "Google Play", tagline: "Google Play Recharge Code", category: "entertainment", color: "#01875f" },
  { slug: "netflix", name: "Netflix", tagline: "Netflix Gift Card", category: "entertainment", color: "#e50914" },
  { slug: "swiggy", name: "Swiggy", tagline: "Swiggy Gift Card", category: "food", color: "#fc8019" },
  { slug: "dominos", name: "Domino's", tagline: "Domino's Gift Voucher", category: "food", color: "#e31837" },
  { slug: "paypal", name: "PayPal", tagline: "PayPal Balance Top-up", category: "payments", color: "#003087" },
];

export const brandLookup = Object.fromEntries(BRANDS.map((b) => [b.slug, b]));

export const getBrand = (slug) => brandLookup[slug] || { slug, name: slug, color: "#3b7bf6", category: "" };
