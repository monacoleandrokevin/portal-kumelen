import { useEffect, useState } from "react";
import axios from "axios";

const Admin = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [autorizados, setAutorizados] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("google_token");
    if (!token) {
      setError("No hay token. Iniciá sesión.");
      return;
    }

    // Cargar usuarios
    axios
      .get(`${import.meta.env.VITE_API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsuarios(res.data))
      .catch(() => console.error("Error al obtener autorizados"));

    // Cargar autorizados
    axios
      .get(`${import.meta.env.VITE_API_URL}/autorizados`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAutorizados(res.data))
      .catch((err) => console.error("Error al obtener autorizados", err));
  }, []);

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
              <td>{user.rol}</td>
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
          </tr>
        </thead>
        <tbody>
          {autorizados.map((item) => (
            <tr key={item._id}>
              <td>{item.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Admin;
