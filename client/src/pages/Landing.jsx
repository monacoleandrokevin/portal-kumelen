import "../styles/landing.scss";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const API = import.meta.env.VITE_API_URL;

export default function Landing() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  // Ping para despertar el server (Render) antes del login
  async function warmup() {
    try {
      await axios.get(`${API}/health`, { timeout: 4000 });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.debug(
          "Warmup falló (normal si server está dormido):",
          err?.message
        );
      }
      // no-op
    }
  }

  const doLogin = async (accessToken) => {
    try {
      setLoading(true);
      await warmup();

      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 30000); // 30s primer hit

      const { data } = await axios.post(
        `${API}/auth/google`,
        { access_token: accessToken },
        { signal: controller.signal, timeout: 30000 }
      );
      clearTimeout(t);

      // Backend devuelve { nombre, email, rol, token? }
      // Usá tu JWT si viene; si no, caé al access_token de Google (fallback temporal).
      const sessionToken = data.token || accessToken;

      authLogin({
        name: data.nombre || "",
        role: data.rol, // backend usa 'rol'
        token: sessionToken, // se guarda como session_token
      });

      navigate("/inicio", { replace: true });
    } catch (err) {
      const isAbort =
        err.name === "CanceledError" || err.code === "ECONNABORTED";
      if (isAbort) {
        alert("El servidor está iniciando… Reintentá en unos segundos.");
        return;
      }
      const msg = err.response?.data?.message || "Error al autenticar";
      const det = err.response?.data?.error
        ? `\nDetalle: ${JSON.stringify(err.response.data.error)}`
        : "";
      alert(msg + det);
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: (t) => doLogin(t.access_token),
    onError: () => alert("Error en el login"),
    scope: "openid email profile",
    flow: "implicit",
  });

  return (
    <main className="landing">
      <div className="landing__wrap">
        <div className="login-card w-100" style={{ maxWidth: 420 }}>
          <div className="brand mb-4 text-center">
            <div className="logo-circle">
              <img
                src="https://res.cloudinary.com/dzxsbydje/image/upload/v1754348808/logo_kumelen_centrado_-_fondo_transparente_uuc5wb.png"
                alt="Escuela Kumelen"
              />
            </div>
            <h1 className="h4 mt-3 mb-1">Accedé con tu cuenta institucional</h1>
          </div>

          <button
            className="w-100 py-2 login-google-btn"
            onClick={() => googleLogin()}
            disabled={loading}
          >
            {loading ? (
              "Iniciando..."
            ) : (
              <>
                <span className="me-2">🔒</span> Iniciar sesión con Google
              </>
            )}
          </button>

          <p className="text-muted small mt-4 mb-0 text-center">
            © {new Date().getFullYear()} Escuela Kumelen
          </p>
        </div>
      </div>
    </main>
  );
}
