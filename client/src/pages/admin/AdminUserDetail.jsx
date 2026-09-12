import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getAdminUserDetail, downloadUserInvoice } from "../../services/adminService";
import { formatMoney } from "../../data/catalog";

const AdminUserDetail = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    getAdminUserDetail(id)
      .then((data) => {
        setUser(data.user);
        setOrders(data.orders);
      })
      .catch((err) => setError(err.response?.data?.message || "Couldn't load this user."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async (orderId) => {
    setDownloadingId(orderId);
    try {
      await downloadUserInvoice(id, orderId);
    } catch (err) {
      alert(err.response?.data?.message || "Couldn't download this invoice.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <p className="shop-status">Loading…</p>;
  if (error) return <p className="shop-status shop-status-error">{error}</p>;
  if (!user) return null;

  return (
    <div>
      <Link to="/admin/users" className="admin-table-muted" style={{ textDecoration: "none" }}>
        ← Back to users
      </Link>
      <h1 className="admin-page-title" style={{ marginTop: "0.5rem" }}>{user.fullName}</h1>

      <div className="admin-user-profile-grid">
        <div className="admin-user-profile-item">
          <p className="admin-user-profile-label">User ID</p>
          <p className="admin-user-profile-value" style={{ fontSize: "0.8rem", wordBreak: "break-all" }}>{user._id}</p>
        </div>
        <div className="admin-user-profile-item">
          <p className="admin-user-profile-label">Email</p>
          <p className="admin-user-profile-value">{user.email}</p>
        </div>
        <div className="admin-user-profile-item">
          <p className="admin-user-profile-label">Phone</p>
          <p className="admin-user-profile-value">{user.phone}</p>
        </div>
        <div className="admin-user-profile-item">
          <p className="admin-user-profile-label">Total orders</p>
          <p className="admin-user-profile-value">{orders.length}</p>
        </div>
        <div className="admin-user-profile-item">
          <p className="admin-user-profile-label">Preferred currency</p>
          <p className="admin-user-profile-value">{user.currency}</p>
        </div>
        <div className="admin-user-profile-item">
          <p className="admin-user-profile-label">Joined</p>
          <p className="admin-user-profile-value">{new Date(user.createdAt).toLocaleDateString("en-IN")}</p>
        </div>
      </div>

      <p className="shop-status" style={{ marginBottom: "1rem" }}>
        Password isn't shown here — it's stored as a one-way hash (like on every properly built site) and can't be
        recovered or displayed, even by an admin.
      </p>

      <h2 className="admin-card-title">Orders &amp; invoices</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="admin-table-muted">No orders yet.</td>
              </tr>
            )}
            {orders.map((order) => (
              <tr key={order._id}>
                <td className="admin-table-muted">{new Date(order.createdAt).toLocaleDateString("en-IN")}</td>
                <td>
                  {order.items?.map((item, i) => (
                    <div key={i}>{item.brand} × {item.quantity}</div>
                  ))}
                </td>
                <td>{formatMoney(order.totalAmount ?? 0, order.currency || "INR")}</td>
                <td className="admin-table-muted">{order.paymentMethod}</td>
                <td>{order.orderStatus}</td>
                <td>
                  {order.paymentStatus === "paid" ? (
                    <button
                      type="button"
                      className="admin-btn-approve"
                      disabled={downloadingId === order._id}
                      onClick={() => handleDownload(order._id)}
                    >
                      {downloadingId === order._id ? "…" : "Invoice"}
                    </button>
                  ) : (
                    <span className="admin-table-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUserDetail;
