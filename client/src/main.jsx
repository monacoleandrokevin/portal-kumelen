import "./setupAxios"; // <- importantísimo: antes de cualquier otra import
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AuthProvider from "./context/AuthProvider";
import App from "./App";

import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!clientId) {
  // opcional: ayuda a detectar si te olvidaste la env var
  console.warn("⚠️ VITE_GOOGLE_CLIENT_ID no está definido");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
