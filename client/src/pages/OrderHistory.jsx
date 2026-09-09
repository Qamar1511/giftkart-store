import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getMyOrders, cancelOrder, downloadInvoice } from "../services/orderService";
import { getMyReviews, createReview } from "../services/reviewService";
import { getDisplayStatus } from "../utils/orderStatus";
import { reorderItems } from "../utils/reorderItems";
import { useCart } from "../context/CartContext";
import { formatMoney } from "../data/catalog";
import Seo from "../components/Seo";
import "../styles/Shop.css";

const STAR_LABELS = ["Poor", "Okay", "Good", "Great", "Excellent"];

const OrderHistory = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [reorderNotice, setReorderNotice] = useState("");

  // Every review this user has ever left, any status — keyed "orderId:brand"
  // so each order card knows, per brand, whether to show "Write a review",
  // "Pending approval" or "Published".
  const [myReviews, setMyReviews] = useState([]);
  // Which order+brand's review form is currently open, e.g. "64f...:psn".
  const [reviewFormKey, setReviewFormKey] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

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

  const loadReviews = async () => {
    try {
      const data = await getMyReviews();
      setMyReviews(data);
    } catch (err) {
      // Non-fatal — order history still works, "Write a review" just won't
      // know about past submissions until the next successful load.
    }
  };

  useEffect(() => {
    loadOrders();
    loadReviews();
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

  // Every distinct brand actually in this order — a multi-brand cart can
  // produce one review per brand, since each is its own verified purchase.
  const brandsInOrder = (order) => {
    const seen = new Map();
    for (const item of order.items || []) {
      if (item?.brand && !seen.has(item.brand)) seen.set(item.brand, item.brandName || item.brand);
    }
    return Array.from(seen, ([brand, brandName]) => ({ brand, brandName }));
  };

  const reviewFor = (orderId, brand) =>
    myReviews.find((r) => r.order === orderId && r.brand === brand);

  const openReviewForm = (orderId, brand) => {
    setReviewFormKey(`${orderId}:${brand}`);
    setReviewRating(5);
    setReviewComment("");
    setReviewError("");
  };

  const closeReviewForm = () => {
    setReviewFormKey(null);
    setReviewError("");
  };

  const handleSubmitReview = async (orderId, brand) => {
    setReviewSubmitting(true);
    setReviewError("");
    try {
      await createReview({ orderId, brand, rating: reviewRating, comment: reviewComment.trim() });
      await loadReviews();
      setReviewFormKey(null);
    } catch (err) {
      setReviewError(err.response?.data?.message || "Couldn't submit your review. Please try again.");
    } finally {
      setReviewSubmitting(false);
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
      <Seo title="Order History — GIFTKART" path="/orders" noindex />
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
                      {order.invoiceNumber || order._id.slice(-6)} · Total:{" "}
                      {formatMoney(order.totalAmount ?? 0, order.currency || "INR")}
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

                {order.orderStatus === "delivered" && (
                  <div className="order-review-block">
                    {brandsInOrder(order).map(({ brand, brandName }) => {
                      const existingReview = reviewFor(order._id, brand);
                      const key = `${order._id}:${brand}`;
                      const formOpen = reviewFormKey === key;

                      if (existingReview) {
                        return (
                          <p className="order-review-status" key={brand}>
                            {brandName}:{" "}
                            {existingReview.status === "approved"
                              ? "✅ Your review is published"
                              : existingReview.status === "rejected"
                              ? "Your review wasn't approved"
                              : "⏳ Your review is awaiting approval"}
                          </p>
                        );
                      }

                      return (
                        <div key={brand} className="order-review-row">
                          {!formOpen ? (
                            <button
                              type="button"
                              className="navbar-btn navbar-btn-ghost"
                              onClick={() => openReviewForm(order._id, brand)}
                            >
                              Write a review for {brandName}
                            </button>
                          ) : (
                            <div className="order-review-form">
                              {reviewError && (
                                <p className="shop-status shop-status-error">{reviewError}</p>
                              )}
                              <div className="order-review-stars">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    type="button"
                                    key={star}
                                    className={`order-review-star ${star <= reviewRating ? "is-filled" : ""}`}
                                    onClick={() => setReviewRating(star)}
                                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                                  >
                                    ★
                                  </button>
                                ))}
                                <span className="order-review-star-label">
                                  {STAR_LABELS[reviewRating - 1]}
                                </span>
                              </div>
                              <textarea
                                className="order-review-textarea"
                                placeholder={`How was your ${brandName} gift card experience? (optional)`}
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value.slice(0, 1000))}
                                rows={3}
                              />
                              <div className="order-review-form-actions">
                                <button
                                  type="button"
                                  className="auth-submit"
                                  disabled={reviewSubmitting}
                                  onClick={() => handleSubmitReview(order._id, brand)}
                                >
                                  {reviewSubmitting ? "Submitting…" : "Submit review"}
                                </button>
                                <button
                                  type="button"
                                  className="navbar-btn navbar-btn-ghost"
                                  onClick={closeReviewForm}
                                  disabled={reviewSubmitting}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
