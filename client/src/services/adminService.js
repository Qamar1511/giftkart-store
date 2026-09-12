import apiClient from "./apiClient";

export const getAdminOrders = async (status) => {
  const { data } = await apiClient.get("/admin/orders", { params: status ? { status } : {} });
  return data.orders;
};

export const verifyUpiOrder = async (orderId) => {
  const { data } = await apiClient.post(`/admin/orders/${orderId}/verify-upi`);
  return data;
};

export const rejectUpiOrder = async (orderId, reason) => {
  const { data } = await apiClient.post(`/admin/orders/${orderId}/reject-upi`, { reason });
  return data;
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
