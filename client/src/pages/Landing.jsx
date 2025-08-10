import "../styles/landing.scss";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";

function Landing() {
  const doLogin = async (accessToken) => {
    try {
      // guardo el token *por si* quisieras usar APIs de Google desde el front
      localStorage.setItem("google_access_token", accessToken);

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/google`,
        { access_token: accessToken } // 👈 ahora mandamos access_token
      );

      localStorage.setItem("google_token", "ok"); // marcador de sesión
      localStorage.setItem("usuario_nombre", res.data.nombre);
      localStorage.setItem("usuario_rol", res.data.rol);

      window.location.href = res.data.rol === "admin" ? "/admin" : "/inicio";
    } catch (err) {
      alert(err.response?.data?.message || "Error al autenticar");
    }
  };

  const login = useGoogleLogin({
    // popup sin redirección
    onSuccess: (t) => doLogin(t.access_token),
    onError: () => alert("Error en el login"),
    scope: "openid email profile", // nos garantiza email/nombre en userinfo
    flow: "implicit", // popup
  });

  return (
    <main className="landing d-flex min-vh-100">
      <div className="container-fluid">
        <div className="row g-0 min-vh-100">
          {/* Columna Login */}
          <div className="col-12 col-md-6 d-flex align-items-center justify-content-center p-4 p-md-5">
            <div className="login-card w-100" style={{ maxWidth: 420 }}>
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

              {/* Botón custom, 100% control de estilo */}
              <button
                className="btn btn-dark w-100 py-2 login-google-btn"
                onClick={() => login()}
              >
                <span className="me-2">🔒</span> Iniciar sesión con Google
              </button>

              <p className="text-muted small mt-4 mb-0 text-center">
                © {new Date().getFullYear()} Escuela Kumelen
              </p>
            </div>
          </div>

          {/* Columna Imagen (oculta en mobile) */}
          <div className="col-md-6 d-none d-md-block">
            <div
              className="landing-image h-100 w-100"
              role="img"
              aria-label="Imagen institucional"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default Landing;
