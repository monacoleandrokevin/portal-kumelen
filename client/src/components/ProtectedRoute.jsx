import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function ProtectedRoute({ children, requiredRole }) {
  const { isLogged, role } = useAuth();

  if (!isLogged) return <Navigate to="/" replace />;

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/inicio" replace />;
  }

  return children;
}
