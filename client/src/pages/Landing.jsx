import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/landing.scss";
import { GoogleLogin } from "@react-oauth/google";

function Landing() {
  const handleLogin = (credentialResponse) => {
    // Lógica de login
    console.log(credentialResponse);
  };

  return (
    <div className="landing-page text-center d-flex flex-column min-vh-100">
      <nav className="navbar navbar-expand-lg bg-light border-bottom">
        <div className="container">
          <a className="navbar-brand d-flex align-items-center" href="/">
            <img
              src="https://res.cloudinary.com/dzxsbydje/image/upload/v1754348808/logo_kumelen_centrado_-_fondo_transparente_uuc5wb.png"
              alt="Kumelen"
              height="50"
              className="me-2"
            />
            <span className="fw-bold text-primary">Portal Kumelen</span>
          </a>
        </div>
      </nav>

      <header className="flex-grow-1 d-flex flex-column justify-content-center align-items-center">
        <h1 className="titulo">Bienvenido al Portal Institucional</h1>
        <p className="subtitulo text-muted mb-4">
          Accedé con tu cuenta institucional
        </p>
        <div className="login-container">
          <GoogleLogin
            onSuccess={handleLogin}
            onError={() => alert("Error en el login")}
            useOneTap
          />
        </div>
      </header>

      <footer className="text-muted small py-3 border-top">
        &copy; {new Date().getFullYear()} Escuela Kumelen
      </footer>
    </div>
  );
}

export default Landing;
