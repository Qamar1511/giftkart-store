import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAdminOrders, verifyUpiOrder, rejectUpiOrder } from "../../services/adminService";
import { getDisplayStatus } from "../../utils/orderStatus";
import { formatMoney } from "../../data/catalog";

const FILTERS = [
  { key: "", label: "All orders" },
  { key: "upi_pending", label: "Manual — needs verification" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];
const VALID_FILTER_KEYS = FILTERS.map((f) => f.key);

const AdminOrders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");
  // No param at all (e.g. clicked "Orders" in the sidebar) → default to the
  // daily working queue. Explicit ?status=all → show everything. Any other
  // valid tab key → use it as-is.
  let initialFilter;
  if (urlStatus === null) {
    initialFilter = "upi_pending";
  } else if (urlStatus === "all" || urlStatus === "") {
    initialFilter = "";
  } else if (VALID_FILTER_KEYS.includes(urlStatus)) {
    initialFilter = urlStatus;
  } else {
    initialFilter = "upi_pending";
  }

  const [filter, setFilterState] = useState(initialFilter);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [notice, setNotice] = useState("");

  // Keep the URL in sync so the tab you land on is also the tab in the
  // address bar (bookmarkable, and matches whatever the dashboard linked to).
  const setFilter = (key) => {
    setFilterState(key);
    setSearchParams(key ? { status: key } : {});
  };

  const load = async (status) => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminOrders(status);
      setOrders(data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load orders right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleVerify = async (orderId) => {
    setActioningId(orderId);
    setNotice("");
    setError("");
    try {
      const data = await verifyUpiOrder(orderId);
      setNotice(data.message);
      load(filter);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't verify this payment.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (orderId) => {
    if (!window.confirm("Mark this payment as rejected? The customer's order will be marked failed.")) {
      return;
    }
    setActioningId(orderId);
    setNotice("");
    setError("");
    try {
      const data = await rejectUpiOrder(orderId);
      setNotice(data.message);
      load(filter);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't reject this payment.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Orders</h1>
      <p className="admin-page-sub">
        Every order — manual UPI, USDT, and Razorpay — needs a quick check before it delivers.
        For UPI/USDT, check the UTR / transaction ID shown below against your bank/UPI app or
        block explorer. For Razorpay, check the payment in your Razorpay dashboard.
      </p>

      <div className="admin-filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`admin-filter-tab ${filter === f.key ? "is-active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {notice && <div className="admin-notice">{notice}</div>}
      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <p className="admin-page-sub">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="admin-page-sub">No orders in this view.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>UTR / TX ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const status = getDisplayStatus(order);
                const isUpiPending =
                  ["upi_manual", "usdt", "razorpay"].includes(order.paymentMethod) &&
                  order.verificationStatus === "submitted";
                const items = Array.isArray(order.items) ? order.items : [];
                return (
                  <tr key={order._id}>
                    <td>
                      <span className="admin-table-mono">#{order.invoiceNumber || order._id.slice(-6)}</span>
                      <br />
                      <span className="admin-table-muted">
                        {new Date(order.createdAt).toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td>
                      {order.user?.fullName || "—"}
                      <br />
                      <span className="admin-table-muted">{order.user?.email}</span>
                    </td>
                    <td>
                      {items.length > 0
                        ? items.map((item, i) => (
                            <div key={i} className="admin-table-muted">
                              {item.brandName || "Gift Card"} ₹{item.denomination ?? "—"} ×{" "}
                              {item.quantity ?? 1}
                            </div>
                          ))
                        : <span className="admin-table-muted">—</span>}
                    </td>
                    <td>
                      {formatMoney(order.totalAmount ?? 0, order.currency || "INR")}
                    </td>
                    <td>{(order.paymentMethod || "—").replace("_", " ").toUpperCase()}</td>
                    <td>
                      <span className={`admin-status-pill status-${isUpiPending ? "refund_pending" : status.key}`}>
                        {isUpiPending ? "Verification pending" : status.label}
                      </span>
                    </td>
                    <td className="admin-table-mono">{order.utrNumber || order.usdtTxId || "—"}</td>
                    <td>
                      {isUpiPending && (
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-approve"
                            disabled={actioningId === order._id}
                            onClick={() => handleVerify(order._id)}
                          >
                            {actioningId === order._id ? "Working…" : "Verify & deliver"}
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-reject"
                            disabled={actioningId === order._id}
                            onClick={() => handleReject(order._id)}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
