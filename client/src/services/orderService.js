import apiClient from "./apiClient";

export const createOrder = async (payload) => {
  const { data } = await apiClient.post("/orders", payload);
  return data.order;
};

export const getMyOrders = async () => {
  const { data } = await apiClient.get("/orders");
  return data.orders;
};

export const getOrderById = async (orderId) => {
  const { data } = await apiClient.get(`/orders/${orderId}`);
  return data.order;
};

export const cancelOrder = async (orderId, reason) => {
  const { data } = await apiClient.post(`/orders/${orderId}/cancel`, { reason });
  return data.order;
};

export const submitUtr = async (orderId, utrNumber) => {
  const { data } = await apiClient.post(`/orders/${orderId}/submit-utr`, { utrNumber });
  return data.order;
};

export const submitUsdtTx = async (orderId, txId) => {
  const { data } = await apiClient.post(`/orders/${orderId}/submit-usdt-tx`, { txId });
  return data.order;
};

export const submitInternalTransferUid = async (orderId, uid) => {
  const { data } = await apiClient.post(`/orders/${orderId}/submit-internal-transfer-uid`, { uid });
  return data.order;
};

export const getInvoiceDownloadUrl = (orderId) => {
  // Invoice route streams a PDF; the browser needs the token, so we open
  // it via a signed fetch + blob instead of a plain <a href>.
  return `/orders/${orderId}/invoice`;
};

export const downloadInvoice = async (orderId) => {
  const response = await apiClient.get(`/orders/${orderId}/invoice`, {
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
