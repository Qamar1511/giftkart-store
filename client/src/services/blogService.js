import apiClient from "./apiClient";

// Cover images come from three places, and they resolve differently:
//   1. a full external URL (old posts, pasted links)          → used as-is
//   2. /uploads/… returned by the admin upload endpoint        → lives on the
//      BACKEND's disk, so it needs the API origin prefixed
//   3. /images/… committed under client/public/images/         → served by the
//      frontend itself, so it must be left alone
// Case 3 used to get the API origin prefixed too, which sent it to
// api.giftkartstore.in/images/… and 404'd — that's why seeded posts had to
// spell out the whole https://giftkartstore.in/… URL. Both styles now work.
//
// Prefer case 3 for anything that must not disappear: files under /uploads are
// written to the running backend's own filesystem, so a redeploy or restart of
// the API host wipes any cover that wasn't committed to git, leaving the post
// with an empty image box.
export const resolveImageUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (!/^\/uploads\//i.test(url)) return url;
  const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  return `${apiBase.replace(/\/api\/?$/, "")}${url}`;
};

/* ---------- Public (used by the /blog pages) ---------- */

/* Blog content changes rarely — a post is written once and then read many
   times — but every visit to /blog and every back-navigation was refetching
   the list, so the page showed a loading line again each time. These caches
   make repeat views render from memory instantly. Admin edits go through
   /api/admin/blog, a separate path, so the editor never reads these.

   Cleared on a full page reload, which is the escape hatch if something looks
   stale. */
const BLOG_TTL_MS = 5 * 60 * 1000;
let listCache = null; // { data, ts }
let listInflight = null; // de-dupes concurrent calls (e.g. StrictMode double-mount)
const postCache = new Map(); // slug -> { data, ts }

const isFresh = (entry) => entry && Date.now() - entry.ts < BLOG_TTL_MS;

// Synchronous peek used by the pages to decide whether they need a loading
// state at all. Returns null when there's nothing usable cached.
export const getCachedBlogPosts = () => (isFresh(listCache) ? listCache.data : null);
export const getCachedBlogPost = (slug) => {
  const entry = postCache.get(slug);
  return isFresh(entry) ? entry.data : null;
};

export const getBlogPosts = async () => {
  if (isFresh(listCache)) return listCache.data;
  if (listInflight) return listInflight;

  listInflight = apiClient
    .get("/blog")
    .then(({ data }) => {
      listCache = { data: data.posts, ts: Date.now() };
      listInflight = null;
      return data.posts;
    })
    .catch((err) => {
      listInflight = null; // let the next attempt retry
      throw err;
    });

  return listInflight;
};

export const getBlogPostBySlug = async (slug) => {
  const cached = getCachedBlogPost(slug);
  if (cached) return cached;

  const { data } = await apiClient.get(`/blog/${slug}`);
  postCache.set(slug, { data: data.post, ts: Date.now() });
  return data.post;
};

/* ---------- Admin (used by /admin/blog) ---------- */

// The public caches above would otherwise keep serving the pre-edit version to
// this same browser tab after an admin publishes or deletes something, which
// looks like the save silently failed. Called by every mutation below.
const invalidateBlogCache = () => {
  listCache = null;
  listInflight = null;
  postCache.clear();
};

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
  invalidateBlogCache();
  return data.post;
};

export const updateBlogPost = async (id, payload) => {
  const { data } = await apiClient.put(`/admin/blog/${id}`, payload);
  invalidateBlogCache();
  return data.post;
};

export const deleteBlogPost = async (id) => {
  await apiClient.delete(`/admin/blog/${id}`);
  invalidateBlogCache();
};

export const uploadBlogImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);
  const { data } = await apiClient.post("/admin/blog/upload-image", formData);
  return data.url;
};
