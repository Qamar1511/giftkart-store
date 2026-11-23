import apiClient from "./apiClient";

export const createReview = async ({ orderId, brand, rating, comment }) => {
  const { data } = await apiClient.post("/reviews", { orderId, brand, rating, comment });
  return data.review;
};

export const getMyReviews = async () => {
  const { data } = await apiClient.get("/reviews/mine");
  return data.reviews;
};

export const getBrandReviews = async (slug) => {
  const { data } = await apiClient.get(`/reviews/brand/${slug}`);
  return data; // { reviews, average, count }
};

// ---- Admin ----

export const getAllReviewsAdmin = async (status = "pending") => {
  const { data } = await apiClient.get("/admin/reviews", { params: { status } });
  return data.reviews;
};

export const approveReviewAdmin = async (reviewId) => {
  const { data } = await apiClient.post(`/admin/reviews/${reviewId}/approve`);
  return data.review;
};

export const rejectReviewAdmin = async (reviewId) => {
  const { data } = await apiClient.post(`/admin/reviews/${reviewId}/reject`);
  return data.review;
};
