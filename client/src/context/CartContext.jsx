import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "psc_cart";
export const MAX_QUANTITY_PER_ITEM = 10;
// Whole-order cap: a single order can hold at most this many gift cards
// (summed across every line). Mirrors the server-side rule in
// server/config/catalog.js — the server is authoritative, this is just UX.
export const MAX_CARDS_PER_ORDER = 3;

const sameLine = (item, brand, denomination) => item.brand === brand && item.denomination === denomination;

const sumQuantities = (list) => list.reduce((sum, item) => sum + item.quantity, 0);

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
  // Returns { added, atOrderCap } so the caller can react (e.g. skip the
  // fly-to-cart animation and show a "max 3 per order" hint when nothing
  // could be added). `added` is how many units actually went into the cart.
  const addToCart = (brand, denomination, quantity = 1, maxStock = null) => {
    const existing = items.find((item) => sameLine(item, brand, denomination));
    const currentQty = existing ? existing.quantity : 0;
    const otherQty = sumQuantities(items) - currentQty;
    // The line can grow to whichever is smallest: the per-item/stock cap, or
    // whatever's left under the whole-order MAX_CARDS_PER_ORDER cap.
    const stockCap = clampQuantity(currentQty + quantity, maxStock);
    const orderCap = Math.max(0, MAX_CARDS_PER_ORDER - otherQty);
    const nextQty = Math.min(stockCap, orderCap);
    const added = nextQty - currentQty;

    if (added > 0) {
      setItems((prev) => {
        const ex = prev.find((item) => sameLine(item, brand, denomination));
        if (ex) {
          return prev.map((item) =>
            sameLine(item, brand, denomination) ? { ...item, quantity: nextQty } : item
          );
        }
        return [...prev, { brand, denomination, quantity: nextQty }];
      });
    }

    return { added, atOrderCap: otherQty + nextQty >= MAX_CARDS_PER_ORDER };
  };

  const setQuantity = (brand, denomination, quantity, maxStock = null) => {
    const otherQty = sumQuantities(items.filter((item) => !sameLine(item, brand, denomination)));
    const orderCap = Math.max(0, MAX_CARDS_PER_ORDER - otherQty);
    const clamped = Math.min(clampQuantity(quantity, maxStock), orderCap);
    setItems((prev) => {
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
  const cartFull = totalItems >= MAX_CARDS_PER_ORDER;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        setQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        totalAmount,
        cartFull,
        maxCardsPerOrder: MAX_CARDS_PER_ORDER,
      }}
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
