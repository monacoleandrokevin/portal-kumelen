import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // "https://portal-kumelen-api.onrender.com"
});

// Adjunta el JWT propio si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("session_token"); // NUEVO nombre
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
