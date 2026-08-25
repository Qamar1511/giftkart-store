import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "psc_cart";
export const MAX_QUANTITY_PER_ITEM = 10;

const sameLine = (item, brand, denomination) => item.brand === brand && item.denomination === denomination;

// Clamp to whichever is smallest: what was asked for, the hard per-item
// cap, and (if known) how many codes are actually in stock right now.
const clampQuantity = (quantity, maxStock) => {
  const cap = maxStock == null ? MAX_QUANTITY_PER_ITEM : Math.min(MAX_QUANTITY_PER_ITEM, maxStock);
  return Math.max(0, Math.min(quantity, cap));
};

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // Guard against a cart saved by an older single-brand version of the
    // store (no `brand` field) — drop those lines rather than crash.
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.brand && item.denomination) : [];
  } catch {
    return [];
  }
}

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // `maxStock` is optional — pass it (e.g. product.availableStock) whenever
  // you have it, so the cart can never hold more than what's really in
  // stock. If omitted, we still enforce the flat MAX_QUANTITY_PER_ITEM cap.
  const addToCart = (brand, denomination, quantity = 1, maxStock = null) => {
    setItems((prev) => {
      const existing = prev.find((item) => sameLine(item, brand, denomination));
      if (existing) {
        return prev.map((item) =>
          sameLine(item, brand, denomination)
            ? { ...item, quantity: clampQuantity(item.quantity + quantity, maxStock) }
            : item
        );
      }
      const clamped = clampQuantity(quantity, maxStock);
      if (clamped <= 0) return prev;
      return [...prev, { brand, denomination, quantity: clamped }];
    });
  };

  const setQuantity = (brand, denomination, quantity, maxStock = null) => {
    setItems((prev) => {
      const clamped = clampQuantity(quantity, maxStock);
      if (clamped <= 0) return prev.filter((item) => !sameLine(item, brand, denomination));
      return prev.map((item) =>
        sameLine(item, brand, denomination) ? { ...item, quantity: clamped } : item
      );
    });
  };

  const removeFromCart = (brand, denomination) => {
    setItems((prev) => prev.filter((item) => !sameLine(item, brand, denomination)));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.denomination * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, setQuantity, removeFromCart, clearCart, totalItems, totalAmount }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};
