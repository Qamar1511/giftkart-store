import React, { useEffect, useState, useCallback } from "react";
import { getContactQueries, updateQueryStatus } from "../../services/adminService";

const FILTERS = [
  { key: "", label: "All" },
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "resolved", label: "Resolved" },
];

const STATUS_CLASS = {
  new: "status-low",
  read: "status-ok",
  resolved: "status-ok",
};

const AdminQueries = () => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getContactQueries();
      setQueries(data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load queries.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleExpand = async (query) => {
    const isOpening = expandedId !== query._id;
    setExpandedId(isOpening ? query._id : null);

    // Reading a "new" query marks it read automatically, like an inbox.
    if (isOpening && query.status === "new") {
      handleStatusChange(query._id, "read", true);
    }
  };

  const handleStatusChange = async (id, status, silent) => {
    setUpdatingId(id);
    try {
      const updated = await updateQueryStatus(id, status);
      setQueries((prev) => prev.map((q) => (q._id === id ? updated : q)));
    } catch (err) {
      if (!silent) alert(err.response?.data?.message || "Couldn't update this query.");
    } finally {
      setUpdatingId(null);
    }
  };

  const visibleQueries = filter ? queries.filter((q) => q.status === filter) : queries;

  return (
    <div>
      <h1 className="admin-page-title">Contact queries</h1>
      <p className="admin-page-sub">
        Everything submitted through the Contact Us form — saved here even if email delivery
        isn't set up.
      </p>

      <div className="admin-filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`admin-filter-tab ${filter === f.key ? "is-active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === "new" && (
              <span style={{ marginLeft: "0.35rem" }}>
                ({queries.filter((q) => q.status === "new").length})
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <p className="admin-page-sub">Loading…</p>
      ) : visibleQueries.length === 0 ? (
        <p className="admin-page-sub">No queries here.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>From</th>
                <th>Message</th>
                <th>Status</th>
                <th>Received</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleQueries.map((q) => (
                <React.Fragment key={q._id}>
                  <tr>
                    <td>
                      <div>{q.fullName}</div>
                      <div className="admin-table-muted">{q.email}</div>
                      {q.phone && <div className="admin-table-muted">{q.phone}</div>}
                    </td>
                    <td className="admin-table-muted" style={{ maxWidth: "22rem" }}>
                      {q.message.length > 80 ? `${q.message.slice(0, 80)}…` : q.message}
                    </td>
                    <td>
                      <span className={`admin-status-pill ${STATUS_CLASS[q.status]}`}>{q.status}</span>
                    </td>
                    <td className="admin-table-muted">
                      {new Date(q.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td>
                      <button type="button" className="admin-link-btn" onClick={() => handleExpand(q)}>
                        {expandedId === q._id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === q._id && (
                    <tr>
                      <td colSpan={5} className="admin-stock-expand">
                        <p style={{ margin: "0 0 0.75rem", whiteSpace: "pre-wrap" }}>{q.message}</p>
                        {q.attachmentUrl && (
                          <p className="admin-table-muted" style={{ marginBottom: "0.75rem" }}>
                            📎{" "}
                            <a
                              href={`${(process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace(
                                "/api",
                                ""
                              )}${q.attachmentUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-link-btn"
                            >
                              {q.attachmentName || "Open attachment"}
                            </a>
                          </p>
                        )}
                        <div className="admin-table-actions">
                          {q.status !== "resolved" && (
                            <button
                              type="button"
                              className="admin-btn admin-btn-approve"
                              disabled={updatingId === q._id}
                              onClick={() => handleStatusChange(q._id, "resolved")}
                            >
                              Mark resolved
                            </button>
                          )}
                          {q.status === "resolved" && (
                            <button
                              type="button"
                              className="admin-btn"
                              disabled={updatingId === q._id}
                              onClick={() => handleStatusChange(q._id, "read")}
                            >
                              Reopen
                            </button>
                          )}
                          <a href={`mailto:${q.email}`} className="admin-btn">
                            Reply by email
                          </a>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminQueries;
