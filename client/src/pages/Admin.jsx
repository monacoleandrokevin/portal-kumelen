import { useEffect, useState } from "react";
import axios from "axios";

const Admin = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("google_token");

    if (!storedToken) {
      setError("No hay token. Iniciá sesión.");
      return;
    }

    axios
      .get(`${import.meta.env.VITE_API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      })
      .then((res) => setUsuarios(res.data))
      .catch((err) => {
        console.error(err);
        setError("Acceso denegado o error en la carga.");
      });
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
    </div>
  );
};

export default Admin;
