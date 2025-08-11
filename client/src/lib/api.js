import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // "https://portal-kumelen-api.onrender.com"
});

// Adjunta el Authorization automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("google_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

export default api;
