import React, { useCallback, useEffect, useState } from "react";
import { getMonthlyRevenue } from "../../services/adminService";
import { formatMoney, CURRENCY_CODES } from "../../data/catalog";

const formatMonthLabel = (year, month) =>
  new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

const formatShortMonthLabel = (year, month) =>
  new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

// Small dependency-free bar chart — plain divs sized with CSS height
// percentages, no charting library needed. `items` is [{ key, label, value }],
// tallest bar is scaled to 100% and the rest scale relative to it.
const BarChart = ({ items, barClassName, formatValue }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="admin-bar-chart">
      {items.map((item) => (
        <div className="admin-bar-chart-col" key={item.key}>
          <div className="admin-bar-chart-track">
            <div
              className={`admin-bar ${barClassName}`}
              style={{ height: `${item.value > 0 ? Math.max(2, (item.value / max) * 100) : 0}%` }}
              title={`${item.label}: ${formatValue ? formatValue(item.value) : item.value}`}
            />
          </div>
          <span className="admin-bar-chart-value">{formatValue ? formatValue(item.value) : item.value}</span>
          <span className="admin-bar-chart-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

const AdminRevenue = () => {
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMonthlyRevenue();
      setMonths(data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load revenue right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Grand total per currency, across every month — shown above the table.
  const grandTotal = months.reduce((acc, row) => {
    Object.entries(row.totals || {}).forEach(([cur, amount]) => {
      acc[cur] = (acc[cur] || 0) + amount;
    });
    return acc;
  }, {});
  const grandTotalLabel =
    CURRENCY_CODES.filter((c) => grandTotal[c]).map((c) => formatMoney(grandTotal[c], c)).join(" · ") ||
    formatMoney(0, "INR");
  const totalCompletedOrders = months.reduce((sum, row) => sum + (row.orderCount || 0), 0);

  // `months` comes back newest-first (matches the table); charts read better
  // oldest → newest, and we cap at the most recent 12 so the bars stay
  // legible instead of squeezing years of history into one row.
  const chartMonths = [...months].slice(0, 12).reverse();
  const orderChartItems = chartMonths.map((m) => ({
    key: m.monthKey,
    label: formatShortMonthLabel(m.year, m.month),
    value: m.orderCount || 0,
  }));
  const activeCurrencies = CURRENCY_CODES.filter((c) => months.some((m) => m.totals && m.totals[c]));

  return (
    <div>
      <h1 className="admin-page-title">Revenue collected</h1>
      <p className="admin-page-sub">Completed (paid) orders and revenue, broken down month by month.</p>

      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <p className="admin-page-sub">Loading revenue…</p>
      ) : (
        <>
          <div className="admin-stat-grid">
            <div className="admin-stat-card">
              <span className="admin-stat-icon" aria-hidden="true">💰</span>
              <span className="admin-stat-value">{grandTotalLabel}</span>
              <span className="admin-stat-label">Total revenue collected</span>
            </div>
            <div className="admin-stat-card">
              <span className="admin-stat-icon" aria-hidden="true">✅</span>
              <span className="admin-stat-value">{totalCompletedOrders}</span>
              <span className="admin-stat-label">Total completed orders</span>
            </div>
          </div>

          <div className="admin-card">
            <h2 className="admin-card-title">Revenue by month</h2>
            {months.length === 0 ? (
              <p className="admin-page-sub">No paid orders yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Completed orders</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((row) => (
                      <tr key={row.monthKey}>
                        <td>{formatMonthLabel(row.year, row.month)}</td>
                        <td className="admin-table-mono">{row.orderCount || 0}</td>
                        <td className="admin-table-mono">
                          {CURRENCY_CODES.filter((c) => row.totals[c])
                            .map((c) => formatMoney(row.totals[c], c))
                            .join(" · ") || formatMoney(0, "INR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {chartMonths.length > 0 && (
            <>
              <div className="admin-card">
                <h2 className="admin-card-title">Completed orders — by month</h2>
                {months.length > 12 && (
                  <p className="admin-table-muted admin-chart-note">Showing the last 12 months.</p>
                )}
                <BarChart items={orderChartItems} barClassName="admin-bar-orders" />
              </div>

              {activeCurrencies.map((currency) => (
                <div className="admin-card" key={currency}>
                  <h2 className="admin-card-title">Revenue — by month ({currency})</h2>
                  {months.length > 12 && (
                    <p className="admin-table-muted admin-chart-note">Showing the last 12 months.</p>
                  )}
                  <BarChart
                    items={chartMonths.map((m) => ({
                      key: m.monthKey,
                      label: formatShortMonthLabel(m.year, m.month),
                      value: (m.totals && m.totals[currency]) || 0,
                    }))}
                    barClassName="admin-bar-revenue"
                    formatValue={(v) => formatMoney(v, currency)}
                  />
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AdminRevenue;
