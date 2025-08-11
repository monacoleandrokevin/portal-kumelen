import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth-context";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const at = localStorage.getItem("google_access_token");
    const role = localStorage.getItem("usuario_rol");
    const name = localStorage.getItem("usuario_nombre");
    if (at && role) setUser({ name: name || "", role });
  }, []);

  const value = useMemo(
    () => ({
      isLogged: !!user,
      role: user?.role ?? null,
      name: user?.name ?? null,
      login: ({ name, role, accessToken }) => {
        if (accessToken)
          localStorage.setItem("google_access_token", accessToken);
        if (name) localStorage.setItem("usuario_nombre", name);
        if (role) localStorage.setItem("usuario_rol", role);
        setUser({ name: name || "", role: role || "empleado" });
      },
      logout: () => {
        localStorage.removeItem("google_access_token");
        localStorage.removeItem("usuario_nombre");
        localStorage.removeItem("usuario_rol");
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
