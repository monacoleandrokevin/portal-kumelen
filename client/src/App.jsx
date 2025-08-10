import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestRoute from "./components/GuestRoute";
import Landing from "./pages/Landing"; // /login
import Admin from "./pages/Admin";
import Inicio from "./pages/Inicio";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* Home real (dashboard) */}
        <Route
          path="/inicio"
          element={
            <ProtectedRoute>
              <Inicio />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* Login solo para invitados */}
        <Route
          path="/login"
          element={
            <GuestRoute>
              <Landing />
            </GuestRoute>
          }
        />

        {/* Redirección raíz */}
        <Route path="/" element={<Navigate to="/inicio" replace />} />

        {/* TODO: agregar /reservas, /mi-perfil, etc. */}
      </Routes>
    </BrowserRouter>
  );
}
