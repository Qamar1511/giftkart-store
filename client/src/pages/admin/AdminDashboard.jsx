import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSession } from "../../services/authService";
import { getAdminOrders, getStockSummary, getContactQueries } from "../../services/adminService";
import { formatMoney, CURRENCY_CODES } from "../../data/catalog";

const LOW_STOCK_THRESHOLD = 5;

const AdminDashboard = () => {
  const session = getSession();
  const [orders, setOrders] = useState(null);
  const [stock, setStock] = useState(null);
  const [queries, setQueries] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [ordersData, stockData, queriesData] = await Promise.all([
          getAdminOrders(),
          getStockSummary(),
          getContactQueries(),
        ]);
        setOrders(ordersData);
        setStock(stockData);
        setQueries(queriesData);
      } catch (err) {
        setError("Couldn't load some dashboard data. Try refreshing.");
      }
    };
    loadAll();
  }, []);

  const loading = orders === null || stock === null || queries === null;

  // ---- Derived stats (all computed client-side from the same data the
  // Orders / Stock / Queries pages already use — no extra backend route
  // needed) ----
  const totalOrders = orders?.length || 0;
  // Orders can be placed in INR or USDT, so revenue can't be a single summed
  // number — we total each currency separately and show them side by side
  // (e.g. "₹12,100 · $55").
  const revenueByCurrency =
    orders
      ?.filter((o) => o.paymentStatus === "paid")
      .reduce((acc, o) => {
        const cur = o.currency || "INR";
        acc[cur] = (acc[cur] || 0) + (o.totalAmount || 0);
        return acc;
      }, {}) || {};
  const revenueLabel =
    CURRENCY_CODES.filter((c) => revenueByCurrency[c]).map((c) => formatMoney(revenueByCurrency[c], c)).join(" · ") ||
    formatMoney(0, "INR");
  const pendingVerification =
    orders?.filter((o) => o.paymentMethod === "upi_manual" && o.verificationStatus === "submitted")
      .length || 0;
  const deliveredOrders = orders?.filter((o) => o.orderStatus === "delivered").length || 0;

  const lowStockItems = stock?.filter((s) => s.available < LOW_STOCK_THRESHOLD) || [];

  const newQueries = queries?.filter((q) => q.status === "new").length || 0;
  // const totalQueries = queries?.length || 0;

  const STAT_CARDS = [
    {
      label: "Total orders",
      value: totalOrders,
      icon: "📦",
      to: "/admin/orders?status=all",
    },
    {
      label: "Revenue collected",
      value: revenueLabel,
      icon: "💰",
      to: "/admin/orders?status=all",
    },
    {
      label: "Pending UPI verification",
      value: pendingVerification,
      icon: "🕒",
      to: "/admin/orders?status=upi_pending",
      highlight: pendingVerification > 0,
    },
    {
      label: "Delivered orders",
      value: deliveredOrders,
      icon: "✅",
      to: "/admin/orders?status=delivered",
    },
    {
      label: "Low stock items",
      value: lowStockItems.length,
      icon: "⚠️",
      to: "/admin/stock",
      highlight: lowStockItems.length > 0,
    },
    {
      label: "New contact queries",
      value: newQueries,
      icon: "💬",
      to: "/admin/queries",
      highlight: newQueries > 0,
    },
  ];

  return (
    <div>
      <h1 className="admin-page-title">Welcome, {session?.user?.fullName?.split(" ")[0]}</h1>
      <p className="admin-page-sub">Here's how the store is doing right now.</p>

      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <p className="admin-page-sub">Loading dashboard…</p>
      ) : (
        <>
          <div className="admin-stat-grid">
            {STAT_CARDS.map((card) => (
              <Link
                to={card.to}
                key={card.label}
                className={`admin-stat-card ${card.highlight ? "is-highlight" : ""}`}
              >
                <span className="admin-stat-icon" aria-hidden="true">{card.icon}</span>
                <span className="admin-stat-value">{card.value}</span>
                <span className="admin-stat-label">{card.label}</span>
              </Link>
            ))}
          </div>

          {lowStockItems.length > 0 && (
            <div className="admin-card">
              <h2 className="admin-card-title">⚠️ Low stock — top up soon</h2>
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
                    {lowStockItems.map((item) => (
                      <tr key={`${item.brand}-${item.denomination}`}>
                        <td>{item.brandName}</td>
                        <td>₹{item.denomination}</td>
                        <td className="admin-table-mono">{item.available}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link to="/admin/stock" className="admin-link-btn">Add more stock →</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
