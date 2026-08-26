import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAdminBlogPost,
  createBlogPost,
  updateBlogPost,
} from "../../services/blogService";

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  metaTitle: "",
  metaDescription: "",
  author: "GIFTKART Team",
  published: false,
};

const AdminBlogEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditing) return;
    getAdminBlogPost(id)
      .then((post) => {
        setForm({ ...emptyForm, ...post });
        setSlugTouched(true);
      })
      .catch(() => setError("Couldn't load this post."))
      .finally(() => setLoading(false));
  }, [id, isEditing]);

  const handleChange = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "title" && !slugTouched) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleSlugChange = (e) => {
    setSlugTouched(true);
    setForm((prev) => ({ ...prev, slug: e.target.value }));
  };

  const handleSubmit = (publishNow) => async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) {
      setError("Title, excerpt, and content are required.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = { ...form, published: publishNow };
    try {
      if (isEditing) {
        await updateBlogPost(id, payload);
      } else {
        await createBlogPost(payload);
      }
      navigate("/admin/blog");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this post.");
      setSaving(false);
    }
  };

  if (loading) return <p className="shop-status">Loading…</p>;

  return (
    <div>
      <h1 className="admin-page-title">{isEditing ? "Edit post" : "New post"}</h1>

      <form className="admin-card" style={{ maxWidth: "40rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <p className="shop-status shop-status-error">{error}</p>}

        <label className="auth-field">
          <span>Title</span>
          <input value={form.title} onChange={handleChange("title")} placeholder="e.g. Best PlayStation Gift Card Deals in India" />
        </label>

        <label className="auth-field">
          <span>Slug (URL) — giftkartstore.in/blog/…</span>
          <input value={form.slug} onChange={handleSlugChange} placeholder="best-playstation-gift-card-deals" />
        </label>

        <label className="auth-field">
          <span>Excerpt (short summary shown on the blog list)</span>
          <textarea value={form.excerpt} onChange={handleChange("excerpt")} rows={2} />
        </label>

        <label className="auth-field">
          <span>Cover image URL (optional)</span>
          <input value={form.coverImage} onChange={handleChange("coverImage")} placeholder="https://…" />
        </label>

        <label className="auth-field">
          <span>Content (HTML — use &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;&lt;li&gt;, &lt;strong&gt;, &lt;a href=""&gt; etc.)</span>
          <textarea value={form.content} onChange={handleChange("content")} rows={14} style={{ fontFamily: "monospace", fontSize: "0.85rem" }} />
        </label>

        <fieldset style={{ border: `1px solid var(--card-border)`, borderRadius: "0.5rem", padding: "0.75rem 1rem" }}>
          <legend style={{ padding: "0 0.4rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>SEO (optional — falls back to title/excerpt if left blank)</legend>
          <label className="auth-field">
            <span>Meta title</span>
            <input value={form.metaTitle} onChange={handleChange("metaTitle")} />
          </label>
          <label className="auth-field" style={{ marginTop: "0.75rem" }}>
            <span>Meta description</span>
            <textarea value={form.metaDescription} onChange={handleChange("metaDescription")} rows={2} />
          </label>
        </fieldset>

        <label className="auth-field">
          <span>Author</span>
          <input value={form.author} onChange={handleChange("author")} />
        </label>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
          <button type="button" className="admin-btn-reject" disabled={saving} onClick={handleSubmit(false)} style={{ flex: 1 }}>
            Save as draft
          </button>
          <button type="button" className="admin-btn-approve" disabled={saving} onClick={handleSubmit(true)} style={{ flex: 1 }}>
            {saving ? "Saving…" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminBlogEditor;
