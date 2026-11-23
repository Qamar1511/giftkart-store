import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "psc_cart";

const sameLine = (item, brand, denomination) => item.brand === brand && item.denomination === denomination;

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

  const addToCart = (brand, denomination, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => sameLine(item, brand, denomination));
      if (existing) {
        return prev.map((item) =>
          sameLine(item, brand, denomination)
            ? { ...item, quantity: Math.min(item.quantity + quantity, 20) }
            : item
        );
      }
      return [...prev, { brand, denomination, quantity: Math.min(quantity, 20) }];
    });
  };

  const setQuantity = (brand, denomination, quantity) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((item) => !sameLine(item, brand, denomination));
      return prev.map((item) =>
        sameLine(item, brand, denomination) ? { ...item, quantity: Math.min(quantity, 20) } : item
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
