import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const authApi = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: { "Content-Type": "application/json" },
});

export const signupUser = async (payload) => {
  const { data } = await authApi.post("/signup", payload);
  return data;
};

export const verifyOtp = async (email, otp) => {
  const { data } = await authApi.post("/verify-otp", { email, otp });
  return data;
};

export const resendOtp = async (email) => {
  const { data } = await authApi.post("/resend-otp", { email });
  return data;
};

export const loginUser = async (payload) => {
  const { data } = await authApi.post("/login", payload);
  return data;
};

export const forgotPassword = async (email) => {
  const { data } = await authApi.post("/forgot-password", { email });
  return data;
};

export const resetPassword = async (token, password) => {
  const { data } = await authApi.post(`/reset-password/${token}`, { password });
  return data;
};

export const saveSession = ({ token, user }) => {
  localStorage.setItem("psc_token", token);
  localStorage.setItem("psc_user", JSON.stringify(user));
};

export const getSession = () => {
  const token = localStorage.getItem("psc_token");
  const user = localStorage.getItem("psc_user");
  return token && user ? { token, user: JSON.parse(user) } : null;
};

export const clearSession = () => {
  localStorage.removeItem("psc_token");
  localStorage.removeItem("psc_user");
};
