// src/components/GuestOnly.jsx
import { Navigate } from "react-router-dom";

export default function GuestOnly({ children }) {
  // si hay sesión, mandamos a /inicio (o a /admin si querés lógica extra)
  const accessToken = localStorage.getItem("google_access_token");
  if (accessToken) return <Navigate to="/inicio" replace />;

  // si NO hay sesión, mostramos el contenido (p.ej. la página de login)
  return children;
}
