import axios from "axios";

// Default to explicit local backend for development if env not provided.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  // Do not send cookies by default; tokens are attached via Authorization header.
  withCredentials: false,
});

// Attach token from localStorage as fallback (cookies may not survive cross-origin in preview)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ecosphere_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
