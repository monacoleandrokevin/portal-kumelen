// client/src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("session_token"); // <- CLAVE CORRECTA
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
