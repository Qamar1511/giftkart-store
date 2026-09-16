import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStockSummary } from "../../services/adminService";

const LOW_STOCK_THRESHOLD = 5;

const AdminLowStock = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getStockSummary();
      setItems(data.filter((s) => s.available < LOW_STOCK_THRESHOLD));
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load stock right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="admin-page-title">Low stock items</h1>
      <p className="admin-page-sub">Denominations with fewer than {LOW_STOCK_THRESHOLD} codes left.</p>

      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <p className="admin-page-sub">Loading stock…</p>
      ) : (
        <div className="admin-card">
          <h2 className="admin-card-title">⚠️ Top up soon</h2>
          {items.length === 0 ? (
            <p className="admin-page-sub">Nothing is low right now — every denomination is well stocked.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Denomination</th>
                    <th>Codes left</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={`${item.brand}-${item.denomination}`}>
                      <td>{item.brandName}</td>
                      <td>₹{item.denomination}</td>
                      <td className="admin-table-mono">{item.available}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link to="/admin/stock" className="admin-link-btn">Add more stock →</Link>
        </div>
      )}
    </div>
  );
};

export default AdminLowStock;
