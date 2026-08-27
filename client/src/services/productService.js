import axios from "axios";
import apiClient from "./apiClient";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Returns { categories: [...], brands: [{ slug, name, category, color, products: [...] }] }
export const getCatalog = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/products`);
  return data;
};

// Convenience helper for pages that just want a flat list of every
// brand+denomination product (e.g. the homepage "featured" strip).
export const getGiftCardProducts = async () => {
  const { categories, brands } = await getCatalog();
  const products = brands.flatMap((brand) => brand.products);
  return { categories, brands, products };
};

// "Notify me" on an out-of-stock card. Requires login (uses the logged-in
// user's email server-side) — GiftCardCard.jsx sends people to /login first
// if they're not signed in yet.
export const requestStockNotification = async (brand, denomination) => {
  const { data } = await apiClient.post("/products/notify", { brand, denomination });
  return data;
};
