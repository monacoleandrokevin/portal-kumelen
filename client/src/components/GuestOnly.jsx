import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function GuestOnly({ children }) {
  const { isLogged } = useAuth();
  if (isLogged) if (isLogged) return <Navigate to="/inicio" replace />;

  return children;
}
