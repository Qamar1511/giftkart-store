import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAllReviewsAdmin, approveReviewAdmin, rejectReviewAdmin } from "../../services/reviewService";

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

const AdminReviews = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");
  const initialFilter = FILTERS.some((f) => f.key === urlStatus) ? urlStatus : "pending";

  const [filter, setFilterState] = useState(initialFilter);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [notice, setNotice] = useState("");

  const setFilter = (key) => {
    setFilterState(key);
    setSearchParams(key === "pending" ? {} : { status: key });
  };

  const load = async (status) => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllReviewsAdmin(status);
      setReviews(data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load reviews right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleApprove = async (reviewId) => {
    setActioningId(reviewId);
    setNotice("");
    setError("");
    try {
      await approveReviewAdmin(reviewId);
      setNotice("Review approved — it's now live on the brand page.");
      load(filter);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't approve this review.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (reviewId) => {
    if (!window.confirm("Reject this review? It will not be shown on the site.")) return;
    setActioningId(reviewId);
    setNotice("");
    setError("");
    try {
      await rejectReviewAdmin(reviewId);
      setNotice("Review rejected.");
      load(filter);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't reject this review.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Reviews</h1>
      <p className="admin-page-sub">
        Only reviews from customers whose order was actually delivered can be submitted. Approve
        the ones worth publishing — they'll show up on that brand's product page immediately.
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
        <p className="admin-page-sub">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="admin-page-sub">No reviews in this view.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reviewer</th>
                <th>Brand</th>
                <th>Rating</th>
                <th>Comment</th>
                <th>Submitted</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review._id}>
                  <td>{review.reviewerName}</td>
                  <td>{review.brandName}</td>
                  <td>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</td>
                  <td style={{ maxWidth: "20rem" }}>{review.comment || <span className="admin-table-muted">—</span>}</td>
                  <td className="admin-table-muted">{new Date(review.createdAt).toLocaleString("en-IN")}</td>
                  <td>
                    <span className={`admin-status-pill status-${review.status}`}>{review.status}</span>
                  </td>
                  <td>
                    {review.status === "pending" && (
                      <div className="admin-table-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-approve"
                          disabled={actioningId === review._id}
                          onClick={() => handleApprove(review._id)}
                        >
                          {actioningId === review._id ? "Working…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-reject"
                          disabled={actioningId === review._id}
                          onClick={() => handleReject(review._id)}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
