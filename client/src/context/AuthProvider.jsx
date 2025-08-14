// client/src/context/AuthProvider.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import { AuthContext } from "./auth-context";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const bcRef = useRef(null);

  // Cargar sesión al iniciar
  useEffect(() => {
    const token = localStorage.getItem("session_token");
    const role = localStorage.getItem("usuario_rol");
    const name = localStorage.getItem("usuario_nombre");
    if (token && role) setUser({ name: name || "", role });
  }, []);

  // Inicializar BroadcastChannel (si disponible)
  useEffect(() => {
    if ("BroadcastChannel" in window) {
      bcRef.current = new BroadcastChannel("portal_kumelen_auth");
      bcRef.current.onmessage = (ev) => {
        if (ev?.data?.type === "LOGOUT") {
          // Cierre remoto
          setUser(null);
        }
        if (ev?.data?.type === "LOGIN_SYNC") {
          // Opcional: sincronizar login
          const { name, role } = ev.data.payload || {};
          setUser(role ? { name: name || "", role } : null);
        }
      };
    }
    return () => {
      if (bcRef.current) bcRef.current.close();
    };
  }, []);

  // Escuchar cambios de localStorage en otras pestañas
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "session_token" && e.storageArea === localStorage) {
        if (!e.newValue) {
          // token borrado en otra pestaña → logout aquí
          setUser(null);
        } else {
          // token escrito en otra pestaña → opcional: refrescar usuario
          const role = localStorage.getItem("usuario_rol");
          const name = localStorage.getItem("usuario_nombre");
          if (role) setUser({ name: name || "", role });
        }
      }
      if (e.key === "usuario_rol" && e.storageArea === localStorage) {
        const token = localStorage.getItem("session_token");
        const role = localStorage.getItem("usuario_rol");
        const name = localStorage.getItem("usuario_nombre");
        if (token && role) setUser({ name: name || "", role });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(() => {
    const login = ({ name, role, token }) => {
      if (token) localStorage.setItem("session_token", token);
      if (name) localStorage.setItem("usuario_nombre", name);
      if (role) localStorage.setItem("usuario_rol", role);
      setUser({ name: name || "", role });

      // Notificar a otras pestañas (BroadcastChannel)
      if (bcRef.current) {
        bcRef.current.postMessage({
          type: "LOGIN_SYNC",
          payload: { name, role },
        });
      }
    };

    const logout = () => {
      localStorage.removeItem("session_token");
      localStorage.removeItem("usuario_nombre");
      localStorage.removeItem("usuario_rol");
      setUser(null);

      // Notificar a otras pestañas
      if (bcRef.current) {
        bcRef.current.postMessage({ type: "LOGOUT" });
      }
      // Trigger para pestañas que solo escuchan storage
      // (remover y volver a setear una clave dummy)
      localStorage.setItem("logout_broadcast_ts", String(Date.now()));
      localStorage.removeItem("logout_broadcast_ts");
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
