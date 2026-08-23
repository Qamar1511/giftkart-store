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

export const deleteStockCode = async (codeId) => {
  const { data } = await apiClient.delete(`/admin/stock/${codeId}`);
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
