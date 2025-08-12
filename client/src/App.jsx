// src/App.jsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Inicio from "./pages/Inicio";
import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import GuestOnly from "./components/GuestOnly";

export default function App() {
  const { pathname } = useLocation();
  const showNav = pathname !== "/"; // sin nav en landing
  return (
    <>
      {showNav && <Navbar />}
      <Routes>
        {/* Solo para NO logueados */}
        <Route
          path="/"
          element={
            <GuestOnly>
              <Landing />
            </GuestOnly>
          }
        />
        {/* Rutas protegidas */}
        <Route
          path="/inicio"
          element={
            <ProtectedRoute>
              <Inicio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <Admin />
            </ProtectedRoute>
          }
        />
        {/* 404 -> redirigir */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
