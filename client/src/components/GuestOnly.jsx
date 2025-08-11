import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function GuestOnly({ children }) {
  const { isLogged, role } = useAuth();
  if (isLogged)
    return <Navigate to={role === "admin" ? "/admin" : "/inicio"} replace />;
  return children;
}
