import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getAdminUsers, setUserBlocked } from "../../services/adminService";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleBlock = async (u) => {
    const blocking = !u.isBlocked;
    const question = blocking
      ? `Block ${u.fullName}? They won't be able to log in or place orders until you unblock them.`
      : `Unblock ${u.fullName}? They'll be able to log in and order again.`;
    if (!window.confirm(question)) return;

    setActioningId(u._id);
    setNotice("");
    setError("");
    try {
      const data = await setUserBlocked(u._id, blocking);
      // Update just this row instead of reloading the whole list.
      setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, isBlocked: data.isBlocked } : x)));
      setNotice(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update this user.");
    } finally {
      setActioningId(null);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q)
    );
  });

  return (
    <div>
      <h1 className="admin-page-title">Users</h1>

      <input
        type="text"
        placeholder="Search by name, email, or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="admin-search-input"
        style={{ marginBottom: "1rem" }}
      />

      {notice && <div className="admin-notice">{notice}</div>}
      {loading && <p className="shop-status">Loading…</p>}
      {error && <p className="shop-status shop-status-error">{error}</p>}

      {!loading && !error && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Currency</th>
                <th>Total orders</th>
                <th>Joined</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="admin-table-muted">No users found.</td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u._id}>
                  <td>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>{u.phone}</td>
                  <td>{u.currency}</td>
                  <td>{u.totalOrders}</td>
                  <td className="admin-table-muted">{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                  <td>
                    <span className={`admin-status-pill ${u.isBlocked ? "status-empty" : "status-ok"}`}>
                      {u.isBlocked ? "Blocked" : "Active"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <Link to={`/admin/users/${u._id}`} className="admin-btn-approve" style={{ textDecoration: "none" }}>
                        View
                      </Link>
                      {u.role !== "admin" && (
                        <button
                          type="button"
                          className={u.isBlocked ? "admin-btn admin-btn-approve" : "admin-btn admin-btn-reject"}
                          disabled={actioningId === u._id}
                          onClick={() => handleToggleBlock(u)}
                        >
                          {actioningId === u._id ? "Working…" : u.isBlocked ? "Unblock" : "Block"}
                        </button>
                      )}
                    </div>
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

export default AdminUsers;
