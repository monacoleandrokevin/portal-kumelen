import { Link, NavLink } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function Navbar() {
  const { isLogged, nombre, rol, logout } = useAuth();

  return (
    <nav className="navbar navbar-dark bg-dark navbar-expand-lg">
      <div className="container">
        <Link className="navbar-brand" to="/inicio">
          Portal Kumelen
        </Link>

        <button
          className="navbar-toggler"
          data-bs-toggle="collapse"
          data-bs-target="#nav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div id="nav" className="collapse navbar-collapse">
          <ul className="navbar-nav me-auto">
            {isLogged && (
              <>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/inicio">
                    Inicio
                  </NavLink>
                </li>
                {rol === "admin" && (
                  <li className="nav-item">
                    <NavLink className="nav-link" to="/admin">
                      Admin
                    </NavLink>
                  </li>
                )}
              </>
            )}
          </ul>

          <div className="d-flex align-items-center gap-3">
            {isLogged ? (
              <>
                <span className="text-light small">{nombre}</span>
                <button
                  className="btn btn-outline-light btn-sm"
                  onClick={logout}
                >
                  Salir
                </button>
              </>
            ) : (
              // si NO hay sesión, solo mostramos el acceso al login
              <NavLink className="btn btn-primary btn-sm" to="/">
                Acceder
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
