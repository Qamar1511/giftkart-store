import axios from "axios";
import apiClient from "./apiClient";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

/* ---------------------------------------------------------------------------
   Catalog cache.
   The /products endpoint recomputes every brand+denomination stock count on
   each call, so it's relatively expensive. The Home page already loads the
   full catalog; without a cache, clicking into any brand (BrandProducts) —
   or opening the cart — refetched the WHOLE catalog again, which is what
   caused the 10-15s "loading" on every brand click.

   We keep a short-lived in-memory cache and de-dupe concurrent requests so
   navigation after the first load is instant. Stock freshness is not a
   concern here: the cart caps quantities from live data on its own mount and
   checkout re-verifies real stock server-side before delivering, so a
   slightly stale catalog can never oversell.
--------------------------------------------------------------------------- */
const CATALOG_TTL_MS = 2 * 60 * 1000; // 2 minutes
let catalogCache = null; // { data, ts }
let catalogInflight = null; // Promise while a fetch is in progress

// Call after an action that changes stock (e.g. a successful order) so the
// next read fetches fresh data instead of a stale cached copy.
export const invalidateCatalogCache = () => {
  catalogCache = null;
  catalogInflight = null;
};

// Returns { categories: [...], brands: [{ slug, name, category, color, products: [...] }] }
// Pass { force: true } to bypass the cache and refetch.
export const getCatalog = async ({ force = false } = {}) => {
  const now = Date.now();
  if (!force && catalogCache && now - catalogCache.ts < CATALOG_TTL_MS) {
    return catalogCache.data;
  }
  if (!force && catalogInflight) return catalogInflight;

  catalogInflight = axios
    .get(`${API_BASE_URL}/products`)
    .then(({ data }) => {
      catalogCache = { data, ts: Date.now() };
      catalogInflight = null;
      return data;
    })
    .catch((err) => {
      catalogInflight = null; // let the next call retry
      throw err;
    });

  return catalogInflight;
};

// Convenience helper for pages that just want a flat list of every
// brand+denomination product (e.g. the homepage "featured" strip).
export const getGiftCardProducts = async () => {
  const { categories, brands } = await getCatalog();
  const products = brands.flatMap((brand) => brand.products);
  return { categories, brands, products };
};

// Live currency configs + the price multipliers admin last saved. Fetched once
// on app start by CurrencyContext, which mirrors them into data/catalog.js so
// client-side price math (cart & checkout totals) matches the server.
export const getCurrencyConfig = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/products/currencies`);
  return data;
};

// "Notify me" on an out-of-stock card. Requires login (uses the logged-in
// user's email server-side) — GiftCardCard.jsx sends people to /login first
// if they're not signed in yet.
export const requestStockNotification = async (brand, denomination) => {
  const { data } = await apiClient.post("/products/notify", { brand, denomination });
  return data;
};
