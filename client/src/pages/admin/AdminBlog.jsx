import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAdminBlogPosts, deleteBlogPost, updateBlogPost } from "../../services/blogService";

const AdminBlog = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminBlogPosts();
      setPosts(data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load blog posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleTogglePublish = async (post) => {
    setBusyId(post._id);
    try {
      await updateBlogPost(post._id, { published: !post.published });
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Couldn't update this post.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (post) => {
    if (!window.confirm(`Delete "${post.title}"? This can't be undone.`)) return;
    setBusyId(post._id);
    try {
      await deleteBlogPost(post._id);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Couldn't delete this post.");
      setBusyId(null);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <h1 className="admin-page-title">Blog</h1>
        <button type="button" className="auth-submit" style={{ maxWidth: "10rem" }} onClick={() => navigate("/admin/blog/new")}>
          + New post
        </button>
      </div>

      {loading && <p className="shop-status">Loading…</p>}
      {error && <p className="shop-status shop-status-error">{error}</p>}

      {!loading && !error && (
        <div className="admin-table-wrap" style={{ marginTop: "1.5rem" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 && (
                <tr>
                  <td colSpan={4} className="admin-table-muted">No posts yet — click "New post" to write your first one.</td>
                </tr>
              )}
              {posts.map((post) => (
                <tr key={post._id}>
                  <td>{post.title}</td>
                  <td>
                    <span className={`admin-status-pill ${post.published ? "status-ok" : "status-low"}`}>
                      {post.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="admin-table-muted">{new Date(post.updatedAt).toLocaleDateString("en-IN")}</td>
                  <td style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="admin-btn-approve"
                      disabled={busyId === post._id}
                      onClick={() => handleTogglePublish(post)}
                    >
                      {post.published ? "Unpublish" : "Publish"}
                    </button>
                    <Link to={`/admin/blog/${post._id}/edit`} className="admin-btn-approve" style={{ textDecoration: "none" }}>
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="admin-btn-reject"
                      disabled={busyId === post._id}
                      onClick={() => handleDelete(post)}
                    >
                      Delete
                    </button>
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

export default AdminBlog;
