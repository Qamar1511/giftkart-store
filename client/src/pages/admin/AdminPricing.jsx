import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getPricing, updatePricing, resetPricing } from "../../services/adminService";
import { useCurrency } from "../../context/CurrencyContext";
import { invalidateCatalogCache } from "../../services/productService";

/**
 * Admin → Pricing
 *
 * Prices in this store aren't stored per card. Each card has a face value
 * (its `denomination`) and the price we charge is derived from it by a
 * per-currency multiplier:
 *
 *     INR  price = denomination × rate.INR    (1.1   → ₹1000 face = ₹1100)
 *     USDT price = denomination × rate.USDT   (0.011 → ₹1000 face = $11)
 *
 * So editing one number here reprices every brand and every denomination at
 * once — no redeploy. The live preview below shows exactly what shoppers will
 * see before anything is saved.
 */

// Same rounding the server applies (INR = whole rupees, USDT = 2 decimals).
const round = (value, decimals) =>
  decimals === 0 ? Math.round(value) : +Number(value).toFixed(decimals);

const formatAmount = (amount, symbol, decimals) => {
  const n = Number(amount) || 0;
  if (decimals === 0) return `${symbol}${Math.round(n).toLocaleString("en-IN")}`;
  const body = Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${symbol}${body}`;
};

const AdminPricing = () => {
  const { refreshRates } = useCurrency();

  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await getPricing();
      setData(payload);
      setForm(
        Object.fromEntries((payload.currencies || []).map((c) => [c.code, String(c.rate)]))
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't load pricing settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  // Memoised so the `|| []` fallback doesn't produce a fresh array on every
  // render and re-run the memos below.
  const currencies = useMemo(() => data?.currencies || [], [data]);

  // Per-currency validation of what's currently typed.
  const parsed = useMemo(() => {
    const out = {};
    currencies.forEach(({ code }) => {
      const raw = (form[code] ?? "").toString().trim();
      const value = Number(raw);
      out[code] = {
        raw,
        value,
        valid: raw !== "" && Number.isFinite(value) && value > 0 && value <= 1000,
      };
    });
    return out;
  }, [currencies, form]);

  const allValid = currencies.length > 0 && currencies.every(({ code }) => parsed[code]?.valid);
  const dirty = currencies.some(
    ({ code, rate }) => parsed[code] && parsed[code].raw !== String(rate)
  );

  // Preview: denomination → saved price vs the price the typed rate would give.
  const preview = useMemo(() => {
    if (!data?.preview) return [];
    return data.preview.map((row) => ({
      denomination: row.denomination,
      cells: currencies.map(({ code, decimals }) => {
        const current = row.prices?.[code];
        const next = parsed[code]?.valid
          ? round(row.denomination * parsed[code].value, decimals)
          : null;
        return { code, current, next, changed: next !== null && next !== current };
      }),
    }));
  }, [data, currencies, parsed]);

  const handleChange = (code) => (e) => {
    setForm((prev) => ({ ...prev, [code]: e.target.value }));
    setMessage("");
    setError("");
  };
  // Applies the payload a save/reset returned, then makes the storefront pick
  // the new rates up immediately: refreshRates() re-reads them into the
  // currency context, and the catalog cache is dropped so the next product
  // fetch returns server-computed prices instead of the cached old ones.
  const applyResult = async (result) => {
    setData(result);
    setForm(Object.fromEntries((result.currencies || []).map((c) => [c.code, String(c.rate)])));
    invalidateCatalogCache();
    await refreshRates();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!allValid || saving) return;

    // Typo guard. The rates are small numbers (1.1 / 0.011) so a slipped
    // decimal point — 110 instead of 1.1 — would still pass validation while
    // multiplying every price 100×. Anything more than a 3× swing needs an
    // explicit confirmation.
    const wild = currencies.filter(({ code, rate }) => {
      const next = parsed[code].value;
      return next > rate * 3 || next < rate / 3;
    });
    if (wild.length > 0) {
      const detail = wild.map(({ code, rate }) => `${code}: ${rate} → ${parsed[code].value}`).join("\n");
      if (!window.confirm(`That's a very large price change:\n\n${detail}\n\nSave anyway?`)) return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const rates = Object.fromEntries(currencies.map(({ code }) => [code, parsed[code].value]));
      const result = await updatePricing(rates);
      await applyResult(result);
      setMessage(result.message || "Prices updated.");
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't save the new prices.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (saving) return;
    const defaults = currencies.map((c) => `${c.code} ${c.defaultRate}`).join(", ");
    if (!window.confirm(`Reset prices to the defaults (${defaults})?`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await resetPricing();
      await applyResult(result);
      setMessage(result.message || "Prices reset to defaults.");
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't reset the prices.");
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    setForm(Object.fromEntries(currencies.map((c) => [c.code, String(c.rate)])));
    setMessage("");
    setError("");
  };

  if (loading) {
    return (
      <div>
        <h1 className="admin-page-title">Pricing</h1>
        <p className="admin-page-sub">Loading current prices…</p>
      </div>
    );
  }
  return (
    <div className="admin-page-wrap">
      <h1 className="admin-page-title">Pricing</h1>
      <p className="admin-page-sub">
        Every card's selling price is its face value × the rate for the shopper's currency.
        Change a rate here and all brands and denominations reprice at once — no redeploy needed.
      </p>

      {error && <div className="admin-error">{error}</div>}
      {message && <div className="admin-notice">{message}</div>}

      <form className="admin-card admin-stock-form-card" onSubmit={handleSave}>
        <h2 className="admin-card-title">Rate per currency</h2>
        <div className="admin-stock-form-row">
          {currencies.map((c) => {
            const state = parsed[c.code] || {};
            const example = state.valid
              ? formatAmount(round(1000 * state.value, c.decimals), c.symbol, c.decimals)
              : "—";
            return (
              <label className="admin-field" key={c.code}>
                <span>{c.label} rate</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  inputMode="decimal"
                  value={form[c.code] ?? ""}
                  onChange={handleChange(c.code)}
                  aria-label={`${c.code} price rate`}
                  aria-invalid={state.raw !== "" && !state.valid}
                />
                <span className="admin-form-message">
                  {state.raw !== "" && !state.valid
                    ? "Enter a number greater than 0 (max 1000)."
                    : `₹1,000 face → ${example} · default ${c.defaultRate} · saved ${c.rate}`}
                </span>
              </label>
            );
          })}
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn-approve" disabled={!allValid || !dirty || saving}>
            {saving ? "Saving…" : "Save new prices"}
          </button>
          <button type="button" className="admin-btn" onClick={handleRevert} disabled={!dirty || saving}>
            Undo changes
          </button>
          <button type="button" className="admin-link-btn" onClick={handleReset} disabled={saving}>
            Reset to defaults
          </button>
        </div>

        {data?.updatedAt && (
          <p className="admin-form-message">
            Last changed {new Date(data.updatedAt).toLocaleString("en-IN")}
            {data.updatedBy?.name ? ` by ${data.updatedBy.name}` : ""}.
          </p>
        )}
      </form>
      <div className="admin-card">
        <h2 className="admin-card-title">
          Price preview {dirty && allValid ? "(unsaved changes shown in green)" : ""}
        </h2>
        <p className="admin-form-message">
          What a shopper will pay for each face value. Applies to every brand.
        </p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Face value</th>
                {currencies.map((c) => (
                  <th key={c.code}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr key={row.denomination}>
                  <td className="admin-table-mono">₹{row.denomination.toLocaleString("en-IN")}</td>
                  {row.cells.map((cell) => {
                    const cfg = currencies.find((c) => c.code === cell.code) || {};
                    return (
                      <td key={cell.code} className="admin-table-mono">
                        {cell.changed ? (
                          <>
                            <span className="admin-table-muted" style={{ textDecoration: "line-through" }}>
                              {formatAmount(cell.current, cfg.symbol, cfg.decimals)}
                            </span>{" "}
                            <strong style={{ color: "#15803d" }}>
                              {formatAmount(cell.next, cfg.symbol, cfg.decimals)}
                            </strong>
                          </>
                        ) : (
                          formatAmount(cell.current, cfg.symbol, cfg.decimals)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPricing;
