// client/src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Adjunta tu JWT en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("session_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;
  return config;
});

// Si expira o es inválido, limpiamos sesión y mandamos a login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("session_token");
      localStorage.removeItem("usuario_nombre");
      localStorage.removeItem("usuario_rol");
      if (location.pathname !== "/") location.replace("/");
    }
    return Promise.reject(err);
  }
);

export default api;
