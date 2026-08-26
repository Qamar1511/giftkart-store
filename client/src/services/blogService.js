import apiClient from "./apiClient";

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
