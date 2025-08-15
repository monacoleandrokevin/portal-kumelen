// client/src/components/AdminRoute.jsx
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function AdminRoute({ children }) {
  const { isLogged, role } = useAuth();
  if (!isLogged) return <Navigate to="/" replace />;
  if (role !== "admin") return <Navigate to="/inicio" replace />;
  return children;
}
