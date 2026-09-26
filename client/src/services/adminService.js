import apiClient from "./apiClient";

export const getAdminOrders = async (status) => {
  const { data } = await apiClient.get("/admin/orders", { params: status ? { status } : {} });
  return data.orders;
};

// Aggregated server-side across ALL paid orders (not capped like getAdminOrders),
// so month totals stay accurate even once a store has more than 200 orders.
export const getMonthlyRevenue = async () => {
  const { data } = await apiClient.get("/admin/orders/revenue-by-month");
  return data.months;
};

export const verifyUpiOrder = async (orderId) => {
  const { data } = await apiClient.post(`/admin/orders/${orderId}/verify-upi`);
  return data;
};

export const rejectUpiOrder = async (orderId, reason) => {
  const { data } = await apiClient.post(`/admin/orders/${orderId}/reject-upi`, { reason });
  return data;
};

export const approveCancelRequest = async (orderId) => {
  const { data } = await apiClient.post(`/admin/orders/${orderId}/approve-cancel`);
  return data;
};

export const rejectCancelRequest = async (orderId, reason) => {
  const { data } = await apiClient.post(`/admin/orders/${orderId}/reject-cancel`, { reason });
  return data;
};

// range: "month" | "6months" | "year" | "custom"
// For "custom", also pass { from: "YYYY-MM-DD", to: "YYYY-MM-DD" }.
export const exportDeliveredOrders = async (format, range, { from, to } = {}) => {
  const params = { format, range };
  if (range === "custom") {
    params.from = from;
    params.to = to;
  }
  const response = await apiClient.get("/admin/orders/export", {
    params,
    responseType: "blob",
  });

  // Filename comes from the server's Content-Disposition header — fall back
  // to a generic name if that's ever missing for some reason.
  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : `delivered-orders.${format}`;

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const getStockSummary = async () => {
  const { data } = await apiClient.get("/admin/stock");
  return data.summary;
};

export const getStockCodes = async (brand, denomination) => {
  const { data } = await apiClient.get(`/admin/stock/${brand}/${denomination}`);
  return data.codes;
};

export const addStockCodes = async (brand, denomination, codes) => {
  const { data } = await apiClient.post("/admin/stock", { brand, denomination, codes });
  return data;
};

/* ---------- Users ---------- */

export const getAdminUsers = async () => {
  const { data } = await apiClient.get("/admin/users");
  return data.users;
};

export const getAdminUserDetail = async (userId) => {
  const { data } = await apiClient.get(`/admin/users/${userId}`);
  return data;
};

export const downloadUserInvoice = async (userId, orderId) => {
  const response = await apiClient.get(`/admin/users/${userId}/orders/${orderId}/invoice`, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `invoice-${orderId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const deleteStockCode = async (codeId) => {
  const { data } = await apiClient.delete(`/admin/stock/${codeId}`);
  return data;
};

export const deleteAllStockCodes = async (brand, denomination) => {
  const { data } = await apiClient.delete(`/admin/stock/${brand}/${denomination}/all`);
  return data;
};

/* ------------------------------ Pricing --------------------------------
   Store-wide price multipliers: every card's price = denomination × rate
   for the shopper's currency, so one number reprices the whole catalog.
   Payload: { rates, defaults, currencies, preview, updatedAt, updatedBy }
----------------------------------------------------------------------- */
export const getPricing = async () => {
  const { data } = await apiClient.get("/admin/pricing");
  return data;
};

// rates: { INR: 1.1, USDT: 0.011 }
export const updatePricing = async (rates) => {
  const { data } = await apiClient.put("/admin/pricing", { rates });
  return data;
};

// Restore the hardcoded defaults (INR 1.1 / USDT 0.011).
export const resetPricing = async () => {
  const { data } = await apiClient.put("/admin/pricing", { reset: true });
  return data;
};

export const getContactQueries = async () => {
  const { data } = await apiClient.get("/contact");
  return data.submissions;
};

export const updateQueryStatus = async (id, status) => {
  const { data } = await apiClient.patch(`/contact/${id}`, { status });
  return data.submission;
};
