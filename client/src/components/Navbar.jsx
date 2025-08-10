import { Link, useLocation } from "react-router-dom";
import { isLoggedIn, getUser, logout } from "../utils/auth";

export default function Navbar() {
  const logged = isLoggedIn();
  const { rol } = getUser();
  const { pathname } = useLocation();

  return (
    <nav className="navbar navbar-dark bg-dark navbar-expand-md">
      <div className="container">
        <Link className="navbar-brand" to={logged ? "/inicio" : "/login"}>
          Portal Kumelen
        </Link>

        {logged ? (
          <>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#nav"
            >
              <span className="navbar-toggler-icon"></span>
            </button>

            <div className="collapse navbar-collapse" id="nav">
              <ul className="navbar-nav me-auto">
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      pathname === "/inicio" ? "active" : ""
                    }`}
                    to="/inicio"
                  >
                    Inicio
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      pathname === "/reservas" ? "active" : ""
                    }`}
                    to="/reservas"
                  >
                    Reservas
                  </Link>
                </li>
                {rol === "admin" && (
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${
                        pathname === "/admin" ? "active" : ""
                      }`}
                      to="/admin"
                    >
                      Admin
                    </Link>
                  </li>
                )}
              </ul>

              <button className="btn btn-outline-light btn-sm" onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          </>
        ) : (
          // Sin sesión: navbar minimal (solo marca). Si querés un botón:
          <div className="d-none d-md-block">
            <Link to="/login" className="btn btn-outline-light btn-sm">
              Acceder
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
