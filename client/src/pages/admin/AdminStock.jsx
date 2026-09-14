import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  getStockSummary,
  getStockCodes,
  addStockCodes,
  deleteStockCode,
  deleteAllStockCodes,
} from "../../services/adminService";

const LOW_STOCK = 5;

const AdminStock = () => {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedDenom, setSelectedDenom] = useState("");
  const [codesText, setCodesText] = useState("");
  const [adding, setAdding] = useState(false);
  const [addMessage, setAddMessage] = useState("");

  const [expanded, setExpanded] = useState(null); // "brand:denom" key
  const [expandedCodes, setExpandedCodes] = useState([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStockSummary();
      setSummary(data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load stock.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const brandOptions = useMemo(() => {
    const seen = new Map();
    summary.forEach((row) => seen.set(row.brand, row.brandName));
    return [...seen.entries()].map(([brand, brandName]) => ({ brand, brandName }));
  }, [summary]);

  const denomOptions = useMemo(
    () => summary.filter((row) => row.brand === selectedBrand).map((row) => row.denomination),
    [summary, selectedBrand]
  );

  const handleAddCodes = async (e) => {
    e.preventDefault();
    setAddMessage("");
    if (!selectedBrand || !selectedDenom) {
      setAddMessage("Pick a brand and denomination first.");
      return;
    }
    setAdding(true);
    try {
      const data = await addStockCodes(selectedBrand, selectedDenom, codesText);
      setAddMessage(data.message);
      setCodesText("");
      loadSummary();
      if (expanded === `${selectedBrand}:${selectedDenom}`) {
        toggleExpand(selectedBrand, selectedDenom, true);
      }
    } catch (err) {
      setAddMessage(err.response?.data?.message || "Couldn't add those codes.");
    } finally {
      setAdding(false);
    }
  };

  const toggleExpand = async (brand, denomination, forceReload) => {
    const key = `${brand}:${denomination}`;
    if (expanded === key && !forceReload) {
      setExpanded(null);
      return;
    }
    setExpanded(key);
    setExpandedLoading(true);
    try {
      const codes = await getStockCodes(brand, denomination);
      setExpandedCodes(codes);
    } catch (err) {
      setExpandedCodes([]);
    } finally {
      setExpandedLoading(false);
    }
  };

  const handleDeleteCode = async (codeId, brand, denomination) => {
    try {
      await deleteStockCode(codeId);
      setExpandedCodes((prev) => prev.filter((c) => c._id !== codeId));
      loadSummary();
    } catch (err) {
      alert(err.response?.data?.message || "Couldn't remove this code.");
    }
  };

  const [deletingAll, setDeletingAll] = useState(false);

  const handleDeleteAllCodes = async (brand, denomination, brandName) => {
    if (
      !window.confirm(
        `Delete all unsold ${brandName} ₹${denomination} codes? Codes already delivered to a customer are never touched — only what's still sitting in stock.`
      )
    ) {
      return;
    }
    setDeletingAll(true);
    try {
      const result = await deleteAllStockCodes(brand, denomination);
      alert(result.message);
      setExpandedCodes([]);
      loadSummary();
    } catch (err) {
      alert(err.response?.data?.message || "Couldn't remove these codes.");
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Gift card stock</h1>
      <p className="admin-page-sub">
        Add codes for each brand and denomination, and keep an eye on what's running low.
      </p>

      <div className="admin-card admin-stock-form-card">
        <h2 className="admin-card-title">Add codes</h2>
        <form onSubmit={handleAddCodes}>
          <div className="admin-stock-form-row">
            <label className="admin-field">
              <span>Brand</span>
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setSelectedDenom("");
                }}
              >
                <option value="">Select brand</option>
                {brandOptions.map((b) => (
                  <option key={b.brand} value={b.brand}>
                    {b.brandName}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>Denomination</span>
              <select
                value={selectedDenom}
                onChange={(e) => setSelectedDenom(e.target.value)}
                disabled={!selectedBrand}
              >
                <option value="">Select amount</option>
                {denomOptions.map((d) => (
                  <option key={d} value={d}>
                    ₹{d.toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="admin-field">
            <span>Codes (one per line)</span>
            <textarea
              rows={5}
              value={codesText}
              onChange={(e) => setCodesText(e.target.value)}
              placeholder={"XXXX-XXXX-XXXX\nXXXX-XXXX-XXXX"}
            />
          </label>

          {addMessage && <p className="admin-form-message">{addMessage}</p>}

          <button type="submit" className="auth-submit" disabled={adding} style={{ maxWidth: "12rem" }}>
            {adding ? "Adding…" : "Add codes"}
          </button>
        </form>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <p className="admin-page-sub">Loading…</p>
      ) : (
        <div className="admin-table-wrap" style={{ marginTop: "1.5rem" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Denomination</th>
                <th>Available</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => {
                const key = `${row.brand}:${row.denomination}`;
                const isLow = row.available > 0 && row.available <= LOW_STOCK;
                const isEmpty = row.available === 0;
                return (
                  <React.Fragment key={key}>
                    <tr>
                      <td>{row.brandName}</td>
                      <td>₹{row.denomination.toLocaleString("en-IN")}</td>
                      <td>
                        <span
                          className={`admin-status-pill ${
                            isEmpty ? "status-empty" : isLow ? "status-low" : "status-ok"
                          }`}
                        >
                          {row.available} left
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-link-btn"
                          onClick={() => toggleExpand(row.brand, row.denomination)}
                        >
                          {expanded === key ? "Hide" : "View codes"}
                        </button>
                      </td>
                    </tr>
                    {expanded === key && (
                      <tr>
                        <td colSpan={4} className="admin-stock-expand">
                          {expandedLoading ? (
                            "Loading…"
                          ) : expandedCodes.length === 0 ? (
                            "No codes in stock for this combo."
                          ) : (
                            <>
                              <button
                                type="button"
                                className="admin-btn-reject"
                                disabled={deletingAll}
                                onClick={() => handleDeleteAllCodes(row.brand, row.denomination, row.brandName)}
                                style={{ marginBottom: "0.75rem" }}
                              >
                                {deletingAll ? "Deleting…" : `Delete all ${expandedCodes.length} unsold codes`}
                              </button>
                              <ul className="admin-code-list">
                                {expandedCodes.map((c) => (
                                  <li key={c._id}>
                                    <code>{c.code}</code>
                                    <button
                                      type="button"
                                      className="admin-code-remove"
                                      onClick={() => handleDeleteCode(c._id, row.brand, row.denomination)}
                                      aria-label="Remove code"
                                    >
                                      ×
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminStock;
