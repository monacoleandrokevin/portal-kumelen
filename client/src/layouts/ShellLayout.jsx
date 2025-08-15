// client/src/layouts/ShellLayout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function ShellLayout() {
  const { name, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      <nav className="navbar navbar-dark bg-dark px-3">
        <span className="navbar-brand">Portal Kumelen</span>

        <ul className="navbar-nav flex-row gap-3 ms-auto align-items-center">
          <li className="nav-item">
            <NavLink to="/inicio" className="nav-link">
              Inicio
            </NavLink>
          </li>
          {role === "admin" && (
            <li className="nav-item">
              <NavLink to="/admin" className="nav-link">
                Admin
              </NavLink>
            </li>
          )}
          <li className="nav-item text-white-50 small">{name || "Usuario"}</li>
          <li className="nav-item">
            <button
              className="btn btn-sm btn-outline-light"
              onClick={handleLogout}
            >
              Salir
            </button>
          </li>
        </ul>
      </nav>

      <main className="container py-4">
        <Outlet />
      </main>
    </>
  );
}
