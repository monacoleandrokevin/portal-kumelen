import { Routes, Route } from "react-router-dom";
import AuthProvider from "./context/AuthProvider";

import Landing from "./pages/Landing";
import Inicio from "./pages/Inicio";
import Admin from "./pages/Admin";
import ComingSoon from "./pages/ComingSoon";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import ShellLayout from "./layouts/ShellLayout";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Landing />} />

        {/* Todo lo demás con navbar y sesión */}
        <Route
          element={
            <ProtectedRoute>
              <ShellLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/inicio" element={<Inicio />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />

          {/* PLACEHOLDERS (no tiran al login) */}
          <Route path="/reservas" element={<ComingSoon title="Reservas" />} />
          <Route
            path="/biblioteca"
            element={<ComingSoon title="Biblioteca" />}
          />
          <Route path="/reportes" element={<ComingSoon title="Reportes" />} />

          {/* 404 protegido (opcional): muestra “Próximamente” en rutas desconocidas */}
          <Route
            path="*"
            element={<ComingSoon title="Sección no disponible" />}
          />
        </Route>

        {/* Fallback final para no logueados */}
        <Route path="*" element={<Landing />} />
      </Routes>
    </AuthProvider>
  );
}
