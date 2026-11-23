import axios from "axios";
import { getSession, clearSession } from "./authService";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

// If an admin blocks this account while the customer is still logged in, the
// server starts answering every request with 403 + `blocked: true`. Log them
// out and send them to the login page, which explains why, rather than
// leaving a normal-looking logged-in session where every action just errors.
// (Login itself uses its own axios instance in authService.js, so a blocked
// person trying to sign in gets the message inline and never reaches this.)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 403 &&
      error.response.data?.blocked &&
      window.location.pathname !== "/login"
    ) {
      clearSession();
      window.location.assign("/login?blocked=1");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
