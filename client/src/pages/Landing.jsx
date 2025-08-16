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

  async function doLogin(accessToken) {
    try {
      setLoading(true);
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 30000);

      const { data } = await axios.post(
        `${API}/auth/google`,
        { access_token: accessToken },
        { signal: controller.signal, timeout: 30000 }
      );
      clearTimeout(t);

      const sessionToken = data.token || accessToken;
      authLogin({
        name: data.nombre || "",
        role: data.rol,
        token: sessionToken,
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
  }

  async function doLoginWithIdToken(idToken) {
    try {
      setLoading(true);
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 30000);

      const { data } = await axios.post(
        `${API}/auth/google`,
        { token: idToken }, // ← rama ID token en el backend
        { signal: controller.signal, timeout: 30000 }
      );
      clearTimeout(t);

      const sessionToken = data.token || idToken;
      authLogin({
        name: data.nombre || "",
        role: data.rol,
        token: sessionToken,
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
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (t) => {
      console.debug("OAuth payload:", t); // verificá qué llega
      const at = t?.access_token;
      if (at) return doLogin(at);

      // fallback para credenciales alternativas
      const idt = t?.credential || t?.id_token || t?.code;
      if (idt) return doLoginWithIdToken(idt);

      alert("No se obtuvo token de Google. Reintentá.");
    },
    onError: () => alert("Error en el login"),
    scope: "openid email profile",
    flow: "implicit", // token flow
    // ux_mode: "popup" // (default)
  });

  return (
    <main className="landing d-flex min-vh-100">
      <div className="container-fluid">
        <div className="row g-0">
          <div className="col-12 d-flex align-items-center justify-content-center p-4 p-md-5">
            <div className="login-card">
              <div className="brand mb-4 text-center">
                <div className="logo-circle">
                  <img
                    src="https://res.cloudinary.com/dzxsbydje/image/upload/v1754348808/logo_kumelen_centrado_-_fondo_transparente_uuc5wb.png"
                    alt="Escuela Kumelen"
                  />
                </div>
                <h1 className="h4 mt-3 mb-1">
                  Accedé con tu cuenta institucional
                </h1>
              </div>

              <button
                className="login-google-btn w-100 py-2"
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
        </div>
      </div>
    </main>
  );
}
