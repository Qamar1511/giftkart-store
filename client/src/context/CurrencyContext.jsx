import React, { createContext, useContext, useState, useCallback } from "react";
import {
  CURRENCIES,
  CURRENCY_CODES,
  DEFAULT_CURRENCY,
  isCurrency,
  priceFor as priceForCurrency,
  formatMoney as formatMoneyCurrency,
} from "../data/catalog";
import {
  getSession,
  updateCurrency as updateCurrencyApi,
  updateStoredUserCurrency,
} from "../services/authService";

// Tracks the shopper's chosen buying currency (INR or USDT) and exposes
// helpers that format/derive prices in it. A logged-in customer's currency
// lives on their User document (server source of truth); guests get a
// locally-remembered choice. See server/config/catalog.js for the pricing
// rule (INR = face × 1.1, USDT = face × 0.011).
const CurrencyContext = createContext(null);
const STORAGE_KEY = "psc_currency";

function loadInitialCurrency() {
  try {
    const session = getSession();
    if (session?.user?.currency && isCurrency(session.user.currency)) {
      return session.user.currency; // logged-in user's saved choice wins
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isCurrency(saved)) return saved; // remembered guest choice
  } catch {
    // ignore storage / parse errors (private browsing, etc.)
  }
  return DEFAULT_CURRENCY;
}

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrencyState] = useState(loadInitialCurrency);

  const persistLocal = useCallback((code) => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore storage errors
    }
    updateStoredUserCurrency(code); // keep psc_user in sync for the Navbar/refresh
  }, []);

  // Adopt the currency stored on a freshly-authenticated user — call this
  // right after login / signup / OTP verify. This is the server's truth, so
  // it overrides any guest choice made before logging in.
  const syncFromUser = useCallback((user) => {
    const code = user?.currency;
    if (code && isCurrency(code)) {
      setCurrencyState(code);
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        // ignore
      }
    }
  }, []);

  // Switch the active buying currency. Updates the UI + local session right
  // away and, when logged in, persists to the backend. If the backend call
  // fails we roll back, so what the customer sees always matches what we'd
  // actually charge.
  const setCurrency = useCallback(
    async (code) => {
      if (!isCurrency(code) || code === currency) return { ok: true };
      const previous = currency;
      setCurrencyState(code);
      persistLocal(code);

      const session = getSession();
      if (!session?.token) return { ok: true }; // guest — local only

      try {
        const data = await updateCurrencyApi(code, session.token);
        if (data?.user?.currency && isCurrency(data.user.currency)) {
          updateStoredUserCurrency(data.user.currency);
          setCurrencyState(data.user.currency);
        }
        return { ok: true };
      } catch (err) {
        setCurrencyState(previous);
        persistLocal(previous);
        return { ok: false, error: err };
      }
    },
    [currency, persistLocal]
  );

  const config = CURRENCIES[currency] || CURRENCIES[DEFAULT_CURRENCY];

  // Display helpers bound to the active currency.
  const priceFor = useCallback((denomination) => priceForCurrency(denomination, currency), [currency]);
  const formatMoney = useCallback((amount) => formatMoneyCurrency(amount, currency), [currency]);
  const formatPrice = useCallback(
    (denomination) => formatMoneyCurrency(priceForCurrency(denomination, currency), currency),
    [currency]
  );

  // Prefer the server-sent per-product `pricing` map when present (products
  // from /api/products carry { pricing: { INR, USDT } }); otherwise derive it
  // from the denomination so cart/checkout rows work without that payload.
  const priceForProduct = useCallback(
    (product) => {
      if (product?.pricing && typeof product.pricing[currency] === "number") {
        return product.pricing[currency];
      }
      return priceForCurrency(product?.denomination, currency);
    },
    [currency]
  );
  const formatProduct = useCallback(
    (product) => formatMoneyCurrency(priceForProduct(product), currency),
    [currency, priceForProduct]
  );

  // Total for a set of cart lines ([{ denomination, quantity }]) in the
  // active currency, rounded the same way the server rounds an order
  // (INR = whole rupees, USDT = 2 decimals) so the checkout preview matches
  // what actually gets charged.
  const totalFor = useCallback(
    (lines = []) => {
      const raw = lines.reduce(
        (sum, line) => sum + priceForCurrency(line.denomination, currency) * (line.quantity || 0),
        0
      );
      return currency === "INR" ? Math.round(raw) : +raw.toFixed(2);
    },
    [currency]
  );

  const value = {
    currency,
    setCurrency,
    syncFromUser,
    config,
    symbol: config.symbol,
    currencies: CURRENCIES,
    currencyCodes: CURRENCY_CODES,
    priceFor,
    formatMoney,
    formatPrice,
    priceForProduct,
    formatProduct,
    totalFor,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within a CurrencyProvider");
  return ctx;
};
