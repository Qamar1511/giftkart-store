import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getAdminUsers } from "../../services/adminService";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="admin-table-muted">No users found.</td>
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
                    <Link to={`/admin/users/${u._id}`} className="admin-btn-approve" style={{ textDecoration: "none" }}>
                      View
                    </Link>
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
