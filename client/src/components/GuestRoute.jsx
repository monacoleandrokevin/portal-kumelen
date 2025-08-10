import { Navigate } from "react-router-dom";
import { isLoggedIn } from "../utils/auth";

export default function GuestRoute({ children }) {
  if (isLoggedIn()) return <Navigate to="/inicio" replace />;
  return children;
}
