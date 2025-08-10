import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const token = localStorage.getItem("google_token");
  const [ok, setOk] = useState(!!token);
  const [checked, setChecked] = useState(!requireAdmin); // si no pide admin, no chequea

  useEffect(() => {
    if (!token) return;

    // Solo validamos rol admin cuando hace falta
    if (requireAdmin) {
      axios
        .get(`${import.meta.env.VITE_API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(() => setOk(true))
        .catch(() => setOk(false))
        .finally(() => setChecked(true));
    }
  }, [token, requireAdmin]);

  if (!token) return <Navigate to="/" replace />;
  if (!checked) return null; // o un spinner

  return ok ? children : <Navigate to="/" replace />;
}
