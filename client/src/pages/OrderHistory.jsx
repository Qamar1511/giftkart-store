import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getMyOrders, cancelOrder, downloadInvoice } from "../services/orderService";
import { getDisplayStatus } from "../utils/orderStatus";
import { reorderItems } from "../utils/reorderItems";
import { useCart } from "../context/CartContext";
import "../styles/Shop.css";

const OrderHistory = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [reorderNotice, setReorderNotice] = useState("");

  const loadOrders = async () => {
    try {
      const data = await getMyOrders();
      setOrders(data);
    } catch (err) {
      setError("Couldn't load your orders right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCancel = async (orderId) => {
    if (!window.confirm("Cancel this order? If it was already paid, a refund will be requested.")) {
      return;
    }
    setActioningId(orderId);
    try {
      await cancelOrder(orderId, "Cancelled by customer from order history");
      await loadOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't cancel this order.");
    } finally {
      setActioningId(null);
    }
  };

  const handleInvoice = async (orderId) => {
    setActioningId(orderId);
    try {
      await downloadInvoice(orderId);
    } catch (err) {
      setError("Couldn't download the invoice.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReorder = async (order) => {
    setActioningId(order._id);
    setReorderNotice("");
    try {
      const { addedAny, limitedItems } = await reorderItems(order, addToCart);
      if (limitedItems.length > 0) {
        const detail = limitedItems
          .map((li) =>
            li.available > 0
              ? `${li.brandName} ₹${li.denomination} (only ${li.available} available, added ${li.available})`
              : `${li.brandName} ₹${li.denomination} (out of stock, not added)`
          )
          .join("; ");
        setReorderNotice(`Some quantities were reduced to match current stock: ${detail}`);
      } else if (addedAny) {
        navigate("/cart");
      }
    } catch (err) {
      setReorderNotice("Couldn't check current stock. Please try again.");
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return (
      <div className="shop-page">
        <p className="shop-status">Loading your orders…</p>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <h1 className="section-heading">Order history</h1>

      {error && <p className="shop-status shop-status-error">{error}</p>}
      {reorderNotice && (
        <p className="shop-status shop-status-error">
          {reorderNotice} <Link to="/cart">Go to cart →</Link>
        </p>
      )}

      {orders.length === 0 ? (
        <div className="empty-orders">
          <p>You haven't placed any orders yet.</p>
          <button className="auth-submit" onClick={() => navigate("/")}>
            Browse gift cards
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const canCancel = order.orderStatus !== "cancelled" && order.orderStatus !== "delivered";
            const canDownloadInvoice = order.paymentStatus === "paid";
            const status = getDisplayStatus(order);
            const items = Array.isArray(order.items) ? order.items : [];
            const itemsSummary =
              items
                .filter((item) => item && item.denomination != null)
                .map((item) => `${item.brandName || "Gift Card"} ₹${item.denomination.toLocaleString("en-IN")} × ${item.quantity ?? 1}`)
                .join(", ") || "Order details unavailable";

            return (
              <div className="order-row-card" key={order._id}>
                <div className="order-row-main">
                  <div>
                    <p className="order-row-amount">{itemsSummary}</p>
                    <p className="order-row-meta">
                      {new Date(order.createdAt).toLocaleString("en-IN")} ·{" "}
                      {(order.paymentMethod || "").replace("_", " ").toUpperCase()} · #
                      {order.invoiceNumber || order._id.slice(-6)} · Total: {order.currency || "INR"}{" "}
                      {(order.totalAmount ?? 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <span className={`order-status-pill status-${status.key}`}>{status.label}</span>
                </div>

                {items.some((item) => item?.giftCardCodes?.length > 0) && (
                  <div className="order-row-code">
                    {items.map((item) =>
                      (item.giftCardCodes || []).map((code, i) => (
                        <div key={`${item.denomination}-${i}`}>
                          {item.brandName || "Gift Card"} ₹{item.denomination}: <code>{code}</code>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="order-row-actions">
                  <button
                    className="navbar-btn navbar-btn-ghost"
                    onClick={() => handleReorder(order)}
                    disabled={actioningId === order._id}
                  >
                    {actioningId === order._id ? "Checking stock…" : "Reorder"}
                  </button>
                  {canDownloadInvoice && (
                    <button
                      className="navbar-btn navbar-btn-ghost"
                      disabled={actioningId === order._id}
                      onClick={() => handleInvoice(order._id)}
                    >
                      Download invoice
                    </button>
                  )}
                  {canCancel && (
                    <button
                      className="navbar-btn navbar-btn-ghost order-cancel-btn"
                      disabled={actioningId === order._id}
                      onClick={() => handleCancel(order._id)}
                    >
                      Cancel & refund
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
