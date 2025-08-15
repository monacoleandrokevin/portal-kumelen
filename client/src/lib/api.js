import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Adjunta tu JWT (session_token) a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("session_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;
  return config;
});

// Manejo automático de 401: limpiar sesión y redirigir al login
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
