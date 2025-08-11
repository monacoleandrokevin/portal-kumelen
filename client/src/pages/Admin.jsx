/* global bootstrap */
import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";

const nivelesDisponibles = ["Maternal", "Inicial", "Primario", "Secundario"];
const edificiosDisponibles = [
  "Parque de la Biodiversidad",
  "San Carlos - Inicial / Primario",
  "San Carlos - Secundario",
];

const Admin = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [autorizados, setAutorizados] = useState([]);
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [vinculosTemp, setVinculosTemp] = useState([]);
  const [nuevoEdificio, setNuevoEdificio] = useState("");
  const [nuevoNivel, setNuevoNivel] = useState([]);
  const [nuevoRol, setNuevoRol] = useState("");

  const cargarListas = useCallback(async () => {
    try {
      const [u, a] = await Promise.all([
        api.get("/users"),
        api.get("/autorizados"),
      ]);
      setUsuarios(u.data);
      setAutorizados(a.data);
    } catch (err) {
      if (err?.response?.status === 401) {
        setError("Sesión expirada o inválida. Volvé a iniciar sesión.");
      } else {
        setError("Error al cargar datos.");
      }
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("google_access_token");
    if (!token) {
      setError("No hay sesión. Iniciá sesión.");
      return;
    }
    cargarListas();
  }, [cargarListas]);

  const abrirModal = (user) => {
    setUsuarioActivo(user);
    setVinculosTemp(Array.isArray(user.vinculos) ? [...user.vinculos] : []);
    const modal = new bootstrap.Modal(document.getElementById("modalVinculos"));
    modal.show();
  };

  const eliminarAutorizado = async (id) => {
    try {
      await api.delete(`/autorizados/${id}`);
      setMensaje("Correo eliminado.");
      cargarListas();
    } catch {
      setMensaje("Error al eliminar correo.");
    }
  };

  const cambiarRol = async (id, rolActual) => {
    try {
      const nuevoRol = rolActual === "admin" ? "empleado" : "admin";
      await api.patch(`/users/${id}/rol`, { nuevoRol });
      setMensaje(`Rol cambiado a ${nuevoRol}.`);
      cargarListas();
    } catch {
      setMensaje("Error al cambiar rol.");
    }
  };

  const agregarAutorizado = async (e) => {
    e.preventDefault();
    try {
      await api.post("/autorizados", { email: nuevoEmail });
      setMensaje("Correo autorizado correctamente.");
      setNuevoEmail("");
      cargarListas();
    } catch (err) {
      setMensaje(err.response?.data?.message || "Error al autorizar correo");
    }
  };

  const guardarVinculos = async () => {
    if (!usuarioActivo) return;
    try {
      await api.patch(`/users/${usuarioActivo._id}/vinculos`, {
        vinculos: vinculosTemp,
      });
      setMensaje("Vínculos actualizados correctamente.");
      cargarListas();
      const modalEl = document.getElementById("modalVinculos");
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal.hide();
    } catch {
      setMensaje("Error al guardar los vínculos.");
    }
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
                <button
                  className="btn btn-sm btn-outline-primary mt-1 ms-2"
                  onClick={() => abrirModal(user)}
                >
                  Editar vínculos
                </button>
              </td>
              <td>
                {user.vinculos && user.vinculos.length > 0 ? (
                  <ul className="mb-0">
                    {user.vinculos.map((v, i) => (
                      <li key={i}>
                        <strong>{v.rol}</strong> en <em>{v.edificio}</em>
                        <br />
                        Nivel: {v.nivel.join(", ")}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-muted">Sin vínculos</span>
                )}
              </td>
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

      <div className="modal fade" id="modalVinculos" tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                Editar vínculos de {usuarioActivo?.nombre}
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body">
              {vinculosTemp.length === 0 && <p>Sin vínculos cargados.</p>}
              <ul>
                {vinculosTemp.map((v, i) => (
                  <li key={i}>
                    <strong>{v.rol}</strong> en <em>{v.edificio}</em>
                    <br />
                    Nivel: {v.nivel.join(", ")}
                  </li>
                ))}
              </ul>

              <hr />
              <h6 className="mt-3">Agregar nuevo vínculo</h6>

              <div className="mb-2">
                <label>Edificio</label>
                <select
                  className="form-select"
                  value={nuevoEdificio}
                  onChange={(e) => setNuevoEdificio(e.target.value)}
                >
                  <option value="">-- Seleccionar --</option>
                  {edificiosDisponibles.map((ed) => (
                    <option key={ed} value={ed}>
                      {ed}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-2">
                <label>Nivel</label>
                <br />
                {nivelesDisponibles.map((n) => (
                  <div className="form-check form-check-inline" key={n}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`nivel-${n}`}
                      value={n}
                      checked={nuevoNivel.includes(n)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setNuevoNivel((prev) =>
                          checked
                            ? [...prev, n]
                            : prev.filter((niv) => niv !== n)
                        );
                      }}
                    />
                    <label className="form-check-label" htmlFor={`nivel-${n}`}>
                      {n}
                    </label>
                  </div>
                ))}
              </div>

              <div className="mb-3">
                <label>Rol</label>
                <select
                  className="form-select"
                  value={nuevoRol}
                  onChange={(e) => setNuevoRol(e.target.value)}
                >
                  <option value="">-- Seleccionar --</option>
                  <option value="docente">Docente</option>
                  <option value="no docente">No docente</option>
                </select>
              </div>

              <button
                className="btn btn-success"
                disabled={
                  !nuevoEdificio || nuevoNivel.length === 0 || !nuevoRol
                }
                onClick={() => {
                  const nuevo = {
                    edificio: nuevoEdificio,
                    nivel: nuevoNivel,
                    rol: nuevoRol,
                  };
                  setVinculosTemp([...vinculosTemp, nuevo]);
                  setNuevoEdificio("");
                  setNuevoNivel([]);
                  setNuevoRol("");
                }}
              >
                Agregar vínculo
              </button>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cerrar
              </button>
              <button className="btn btn-primary" onClick={guardarVinculos}>
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
