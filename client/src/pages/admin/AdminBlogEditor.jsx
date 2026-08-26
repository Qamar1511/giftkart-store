import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAdminBlogPost,
  createBlogPost,
  updateBlogPost,
  uploadBlogImage,
  resolveImageUrl,
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
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const url = await uploadBlogImage(file);
      setForm((prev) => ({ ...prev, coverImage: url }));
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't upload that image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, coverImage: "" }));
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

  const coverImageUrl = resolveImageUrl(form.coverImage);

  return (
    <div className="admin-form-wrap">
      <h1 className="admin-page-title">{isEditing ? "Edit post" : "New post"}</h1>

      <form className="admin-card">
        {error && <p className="shop-status shop-status-error">{error}</p>}

        <div className="admin-form-section">
          <h2 className="admin-form-section-title">Post details</h2>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-full">
              <span>Title</span>
              <input
                value={form.title}
                onChange={handleChange("title")}
                placeholder="e.g. Best PlayStation Gift Card Deals in India"
              />
            </label>

            <label className="admin-field admin-field-full">
              <span>Slug (URL) — giftkartstore.in/blog/…</span>
              <input
                value={form.slug}
                onChange={handleSlugChange}
                placeholder="best-playstation-gift-card-deals"
              />
            </label>
          </div>
        </div>

        <div className="admin-form-section">
          <h2 className="admin-form-section-title">SEO</h2>
          <p className="admin-form-section-hint">Optional — falls back to the title/excerpt if left blank.</p>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-full">
              <span>Meta title</span>
              <input value={form.metaTitle} onChange={handleChange("metaTitle")} />
            </label>
            <label className="admin-field admin-field-full">
              <span>Meta description</span>
              <textarea value={form.metaDescription} onChange={handleChange("metaDescription")} rows={2} />
            </label>
          </div>
        </div>

        <div className="admin-form-section">
          <h2 className="admin-form-section-title">Cover image</h2>
          {coverImageUrl ? (
            <div className="admin-image-preview-wrap">
              <img src={coverImageUrl} alt="Cover" className="admin-image-preview" />
              <button
                type="button"
                className="admin-image-preview-remove"
                onClick={handleRemoveImage}
                aria-label="Remove cover image"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="admin-image-upload" onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
              />
              <div className="admin-image-upload-label">📷 Click to upload a cover image</div>
              <div className="admin-image-upload-hint">JPG, PNG or WEBP — up to 5MB</div>
            </div>
          )}
          {uploading && <p className="admin-image-uploading">Uploading…</p>}
        </div>

        <div className="admin-form-section">
          <h2 className="admin-form-section-title">Content</h2>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-full">
              <span>Excerpt (short summary shown on the blog list)</span>
              <textarea value={form.excerpt} onChange={handleChange("excerpt")} rows={2} />
            </label>

            <label className="admin-field admin-field-full">
              <span>Content — HTML tags like &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;&lt;li&gt;, &lt;strong&gt;, &lt;a href=""&gt; are supported</span>
              <textarea
                className="admin-field-mono"
                value={form.content}
                onChange={handleChange("content")}
                rows={14}
              />
            </label>

            <label className="admin-field admin-field-full">
              <span>Author</span>
              <input value={form.author} onChange={handleChange("author")} />
            </label>
          </div>
        </div>

        <div className="admin-form-actions">
          <button type="button" className="admin-btn-reject" disabled={saving} onClick={handleSubmit(false)}>
            Save as draft
          </button>
          <button type="button" className="admin-btn-approve" disabled={saving} onClick={handleSubmit(true)}>
            {saving ? "Saving…" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminBlogEditor;
