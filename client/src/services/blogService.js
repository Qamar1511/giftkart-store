import apiClient from "./apiClient";

// Cover images can be either a full external URL (old posts, pasted links)
// or a relative path returned by the upload endpoint (/uploads/blog/…).
// This resolves the relative case against the backend's origin.
export const resolveImageUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  return `${apiBase.replace(/\/api\/?$/, "")}${url}`;
};

/* ---------- Public (used by the /blog pages) ---------- */

export const getBlogPosts = async () => {
  const { data } = await apiClient.get("/blog");
  return data.posts;
};

export const getBlogPostBySlug = async (slug) => {
  const { data } = await apiClient.get(`/blog/${slug}`);
  return data.post;
};

/* ---------- Admin (used by /admin/blog) ---------- */

export const getAdminBlogPosts = async () => {
  const { data } = await apiClient.get("/admin/blog");
  return data.posts;
};

export const getAdminBlogPost = async (id) => {
  const { data } = await apiClient.get(`/admin/blog/${id}`);
  return data.post;
};

export const createBlogPost = async (payload) => {
  const { data } = await apiClient.post("/admin/blog", payload);
  return data.post;
};

export const updateBlogPost = async (id, payload) => {
  const { data } = await apiClient.put(`/admin/blog/${id}`, payload);
  return data.post;
};

export const deleteBlogPost = async (id) => {
  await apiClient.delete(`/admin/blog/${id}`);
};

export const uploadBlogImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await apiClient.post("/admin/blog/upload-image", formData);
  return data.url;
};
