import axios from "axios";

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
