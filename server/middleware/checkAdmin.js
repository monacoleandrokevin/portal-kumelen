import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import { User } from "../models/User.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const checkAdmin = async (req, res, next) => {
  try {
    const bearer = req.headers.authorization || "";
    const token = bearer.startsWith("Bearer ") ? bearer.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ message: "Token faltante" });
    }

    let email = null;

    // 1) Intento como ID token (credential)
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload?.email || null;
      // console.log("[checkAdmin] token verificado como ID token:", email);
    } catch {
      // 2) Si no es ID token, intento como access_token (userinfo)
      try {
        const { data } = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        email = data?.email || null;
        // console.log("[checkAdmin] token aceptado como access_token:", email);
      } catch (e2) {
        // console.error("[checkAdmin] No es ID token ni access_token válido:", e2?.response?.data || e2?.message);
        return res.status(401).json({ message: "Token inválido" });
      }
    }

    if (!email) {
      return res.status(401).json({ message: "No se pudo obtener el email" });
    }

    // Buscar usuario y validar rol
    const user = await User.findOne({ email });
    if (!user || user.rol !== "admin") {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    req.user = user; // por si lo necesitás más adelante
    next();
  } catch (err) {
    // console.error("[checkAdmin] Error inesperado:", err?.message || err);
    return res.status(500).json({ message: "Error de autenticación" });
  }
};
