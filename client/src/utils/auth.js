export const getToken = () => localStorage.getItem("google_token");

export const getUser = () => ({
  nombre: localStorage.getItem("usuario_nombre") || "",
  rol: localStorage.getItem("usuario_rol") || "empleado",
});

export const isLoggedIn = () => !!getToken();

export const logout = () => {
  localStorage.removeItem("google_token");
  localStorage.removeItem("usuario_nombre");
  localStorage.removeItem("usuario_rol");
  window.location.href = "/";
};
export function getAuthHeaders() {
  const t = localStorage.getItem("google_access_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}
