import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("google_token");
    navigate("/");
  };

  const rol = localStorage.getItem("usuario_rol");

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-4">
      <Link className="navbar-brand" to="/">
        Portal Kumelen
      </Link>

      <div className="collapse navbar-collapse">
        <ul className="navbar-nav me-auto">
          <li className="nav-item">
            <Link className="nav-link" to="/">
              Inicio
            </Link>
          </li>
          {rol === "admin" && (
            <li className="nav-item">
              <a className="nav-link" href="/admin">
                Administración
              </a>
            </li>
          )}
        </ul>
        <button className="btn btn-outline-light" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
