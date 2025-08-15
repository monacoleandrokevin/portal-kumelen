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
    const login = ({ name, role, token }) => {
      if (token) localStorage.setItem("session_token", token);
      if (name) localStorage.setItem("usuario_nombre", name);
      if (role) localStorage.setItem("usuario_rol", role);
      setUser({ name: name || "", role });
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
