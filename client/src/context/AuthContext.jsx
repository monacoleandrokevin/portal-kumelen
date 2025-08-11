import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [nombre, setNombre] = useState(null);
  const [rol, setRol] = useState(null);

  // Cargar desde localStorage al iniciar
  useEffect(() => {
    const t = localStorage.getItem("google_access_token");
    const n = localStorage.getItem("usuario_nombre");
    const r = localStorage.getItem("usuario_rol");
    if (t) setToken(t);
    if (n) setNombre(n);
    if (r) setRol(r);
  }, []);

  // API pública del contexto
  const login = ({ access_token, nombre, rol }) => {
    localStorage.setItem("google_access_token", access_token);
    localStorage.setItem("usuario_nombre", nombre);
    localStorage.setItem("usuario_rol", rol);
    setToken(access_token);
    setNombre(nombre);
    setRol(rol);
  };

  const logout = () => {
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("usuario_nombre");
    localStorage.removeItem("usuario_rol");
    setToken(null);
    setNombre(null);
    setRol(null);
  };

  const value = useMemo(
    () => ({ token, nombre, rol, isLogged: !!token, login, logout }),
    [token, nombre, rol]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
