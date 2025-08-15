// client/src/App.jsx
import { Routes, Route } from "react-router-dom";
import AuthProvider from "./context/AuthProvider";

import Landing from "./pages/Landing";
import Inicio from "./pages/Inicio";
import Admin from "./pages/Admin";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import ShellLayout from "./layouts/ShellLayout";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Login: sin navbar */}
        <Route path="/" element={<Landing />} />

        {/* Todo lo demás: con navbar */}
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
        </Route>

        <Route path="*" element={<Landing />} />
      </Routes>
    </AuthProvider>
  );
}
