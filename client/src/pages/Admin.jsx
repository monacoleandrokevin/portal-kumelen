import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const Admin = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [autorizados, setAutorizados] = useState([]);
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const token = localStorage.getItem("google_token");

  const cargarListas = useCallback(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsuarios(res.data));

    axios
      .get(`${import.meta.env.VITE_API_URL}/autorizados`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAutorizados(res.data));
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError("No hay token. Iniciá sesión.");
      return;
    }
    cargarListas();
  }, [token, cargarListas]);

  const eliminarAutorizado = (id) => {
    axios
      .delete(`${import.meta.env.VITE_API_URL}/autorizados/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        setMensaje("Correo eliminado.");
        cargarListas();
      })
      .catch(() => {
        setMensaje("Error al eliminar correo.");
      });
  };

  const cambiarRol = (id, rolActual) => {
    const nuevoRol = rolActual === "admin" ? "empleado" : "admin";

    axios
      .patch(
        `${import.meta.env.VITE_API_URL}/users/${id}/rol`,
        {
          nuevoRol,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(() => {
        setMensaje(`Rol cambiado a ${nuevoRol}.`);
        cargarListas();
      })
      .catch(() => {
        setMensaje("Error al cambiar rol.");
      });
  };

  const agregarAutorizado = (e) => {
    e.preventDefault();
    setMensaje(null);

    axios
      .post(
        `${import.meta.env.VITE_API_URL}/autorizados`,
        { email: nuevoEmail },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(() => {
        setMensaje("Correo autorizado correctamente.");
        setNuevoEmail("");
        cargarListas();
      })
      .catch((err) => {
        setMensaje(err.response?.data?.message || "Error al autorizar correo");
      });
  };

  if (error)
    return (
      <div className="container mt-5">
        <h3>{error}</h3>
      </div>
    );

  return (
    <div className="container mt-5">
      <h2>Usuarios registrados</h2>
      <table className="table table-striped mt-4">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Sector</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((user) => (
            <tr key={user._id}>
              <td>{user.nombre}</td>
              <td>{user.email}</td>
              <td>
                {user.rol}
                <br />
                <button
                  className="btn btn-sm btn-outline-secondary mt-1"
                  onClick={() => cambiarRol(user._id, user.rol)}
                >
                  Cambiar a {user.rol === "admin" ? "empleado" : "admin"}
                </button>
              </td>
              <td>{user.sector}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-5">Correos autorizados</h3>
      <table className="table table-bordered mt-3">
        <thead>
          <tr>
            <th>Email</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {autorizados.map((item) => (
            <tr key={item._id}>
              <td>{item.email}</td>
              <td>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => eliminarAutorizado(item._id)}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={agregarAutorizado} className="mt-4">
        <div className="input-group">
          <input
            type="email"
            required
            className="form-control"
            value={nuevoEmail}
            onChange={(e) => setNuevoEmail(e.target.value)}
            placeholder="correo@kumelenescuela.edu.ar"
          />
          <button className="btn btn-primary" type="submit">
            Autorizar
          </button>
        </div>
        {mensaje && <div className="mt-2 alert alert-info">{mensaje}</div>}
      </form>
    </div>
  );
};

export default Admin;
