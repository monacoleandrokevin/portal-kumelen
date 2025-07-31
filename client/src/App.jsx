import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import Admin from "./pages/Admin";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

function Home() {
  const handleLogin = async (credentialResponse) => {
    try {
      const token = credentialResponse.credential;
      localStorage.setItem("google_token", token);

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/google`,
        {
          token,
        }
      );

      alert(`Bienvenido ${res.data.nombre}`);
    } catch (error) {
      alert(error.response?.data?.message || "Error al autenticar");
    }
  };

  return (
    <div style={{ marginTop: "5rem", textAlign: "center" }}>
      <h2>Iniciar sesión con cuenta institucional</h2>
      <GoogleLogin
        onSuccess={handleLogin}
        onError={() => alert("Error en el login")}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
