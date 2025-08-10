// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem("google_access_token");
  if (!token) return <Navigate to="/" replace />;

  const userRole = localStorage.getItem("usuario_rol");
  if (role && role !== userRole) return <Navigate to="/inicio" replace />;

  return children;
}
