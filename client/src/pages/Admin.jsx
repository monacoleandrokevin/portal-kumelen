// client/src/pages/Admin.jsx
import { useEffect, useState } from "react";
import api from "../lib/api";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const { name } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [autorizados, setAutorizados] = useState([]);
  const [users, setUsers] = useState([]);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // Trae ambas colecciones en paralelo (usa tu backend actual)
        const [aRes, uRes] = await Promise.all([
          api.get("/autorizados"),
          api.get("/users"),
        ]);
        if (!mounted) return;
        setAutorizados(aRes.data || []);
        setUsers(uRes.data || []);
        setErrMsg("");
      } catch (err) {
        const st = err?.response?.status;
        const msg = err?.response?.data?.message;
        // 401 -> sin sesión (interceptor ya redirige a login)
        if (st === 403) {
          // Logueado, pero sin permisos
          alert("No tenés permisos de admin.");
          navigate("/inicio", { replace: true });
          return;
        }
        setErrMsg(msg || "Error al cargar panel");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (loading) return <div className="container py-4">Cargando…</div>;
  if (errMsg) return <div className="container py-4 text-danger">{errMsg}</div>;

  return (
    <div className="container py-4">
      <h1 className="h4 mb-3">Panel de administración</h1>
      <p className="text-muted mb-4">Bienvenido{name ? `, ${name}` : ""}.</p>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h6">Autorizados ({autorizados.length})</h2>
              <ul className="small mb-0">
                {autorizados.map((a) => (
                  <li key={a._id}>{a.email}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h6">Usuarios ({users.length})</h2>
              <ul className="small mb-0">
                {users.map((u) => (
                  <li key={u._id}>
                    {u.email} <span className="text-muted">({u.rol})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
