// client/src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { isLogged } = useAuth();
  if (!isLogged) return <Navigate to="/" replace />;
  return children;
}
