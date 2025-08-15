// client/src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("session_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // sesión inválida/expirada: limpiar y dirigir al login
      localStorage.removeItem("session_token");
      localStorage.removeItem("usuario_nombre");
      localStorage.removeItem("usuario_rol");
      if (location.pathname !== "/") location.replace("/");
    }
    return Promise.reject(err);
  }
);

export default api;
