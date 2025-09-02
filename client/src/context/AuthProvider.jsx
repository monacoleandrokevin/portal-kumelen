import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth-context";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Cargar sesión al iniciar (y limpiar claves viejas)
  useEffect(() => {
    // limpia restos del flujo viejo
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("google_token");

    const token = localStorage.getItem("session_token");
    const role = localStorage.getItem("usuario_rol");
    const name = localStorage.getItem("usuario_nombre");
    if (token && role) setUser({ name: name || "", role });
  }, []);

  const value = useMemo(() => {
    // dentro de AuthProvider.jsx
    const login = ({ token, user }) => {
      const nombre =
        user?.displayName || user?.nombre || user?.name || user?.email || "";

      localStorage.setItem("session_token", token);
      localStorage.setItem("usuario_rol", user?.role || "viewer");
      localStorage.setItem("usuario_nombre", nombre);

      setUser({ name: nombre, role: user?.role || "viewer" });
    };

    const logout = () => {
      localStorage.removeItem("session_token");
      localStorage.removeItem("usuario_nombre");
      localStorage.removeItem("usuario_rol");
      setUser(null);
    };

    return {
      isLogged: !!user,
      role: user?.role ?? null,
      name: user?.name ?? null,
      login,
      logout,
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
