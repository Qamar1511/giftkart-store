import axios from "axios";
import { getSession } from "./authService";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

export default apiClient;
