import "../styles/landing.scss";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

function Landing() {
  const handleLogin = async (credentialResponse) => {
    try {
      const token = credentialResponse.credential;
      localStorage.setItem("google_token", token);

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/google`,
        { token }
      );

      localStorage.setItem("usuario_nombre", res.data.nombre);
      localStorage.setItem("usuario_rol", res.data.rol);

      window.location.href = res.data.rol === "admin" ? "/admin" : "/inicio";
    } catch (err) {
      alert(err.response?.data?.message || "Error al autenticar");
    }
  };

  return (
    <main className="landing d-flex min-vh-100">
      <div className="container-fluid">
        <div className="row g-0 min-vh-100">
          {/* Columna Login */}
          <div className="col-12 col-md-6 d-flex align-items-center justify-content-center p-4 p-md-5">
            <div className="login-card w-100" style={{ maxWidth: 420 }}>
              <div className="brand mb-4 text-center">
                <img
                  src="https://res.cloudinary.com/dzxsbydje/image/upload/v1754348808/logo_kumelen_centrado_-_fondo_transparente_uuc5wb.png"
                  alt="Escuela Kumelen"
                />
                <h1 className="h4 mt-3 mb-1">
                  Accedé con tu cuenta institucional
                </h1>
              </div>

              <div className="d-flex justify-content-center">
                <GoogleLogin
                  onSuccess={handleLogin}
                  onError={() => alert("Error en el login")}
                  theme="filled_black" // 👈 lo oscurecemos acá
                  size="large"
                  shape="pill"
                />
              </div>

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
