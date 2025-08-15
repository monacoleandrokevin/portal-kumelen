// Config global de Axios — afecta a TODAS las importaciones de axios
import axios from "axios";

// API base del backend
axios.defaults.baseURL = import.meta.env.VITE_API_URL;

// Agrega el JWT propio a cada request
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("session_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
});

// Si el token no sirve/expiró → limpiamos y mandamos a login
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      localStorage.removeItem("session_token");
      localStorage.removeItem("usuario_nombre");
      localStorage.removeItem("usuario_rol");
      if (location.pathname !== "/") location.replace("/");
    }
    return Promise.reject(err);
  }
);
