import apiClient from "./apiClient";

// payload: { fullName, email, phone, message, file } — file is an optional
// File object from an <input type="file">. Sent as multipart/form-data so
// the attachment reaches the backend.
export const submitContactForm = async (payload) => {
  const formData = new FormData();
  formData.append("fullName", payload.fullName);
  formData.append("email", payload.email);
  formData.append("phone", payload.phone || "");
  formData.append("message", payload.message);
  if (payload.file) {
    formData.append("attachment", payload.file);
  }

  const { data } = await apiClient.post("/contact", formData);
  return data;
};
