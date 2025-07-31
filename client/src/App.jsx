import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

function App() {
  const handleLogin = async (credentialResponse) => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/google`,
        {
          token: credentialResponse.credential,
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

export default App;
