import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import { User } from "../models/User.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const log = (...args) => {
  if (process.env.NODE_ENV !== "production")
    console.log("[checkAdmin]", ...args);
};

export const checkAdmin = async (req, res, next) => {
  try {
    const bearer = req.headers.authorization || "";
    const token = bearer.startsWith("Bearer ") ? bearer.split(" ")[1] : null;

    if (!token) {
      return res
        .status(401)
        .json({ message: "Token faltante (Authorization Bearer)" });
    }

    let email = null;

    // 1) Probar como ID token
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload?.email || null;
      log("ID token OK:", email);
    } catch {
      // 2) Probar como access_token -> /userinfo
      try {
        const { data } = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        email = data?.email || null;
        log("access_token OK:", email);
      } catch {
        return res
          .status(401)
          .json({ message: "Token inválido (no es ID token ni access_token)" });
      }
    }

    if (!email) {
      return res
        .status(401)
        .json({ message: "No se pudo obtener el email desde el token" });
    }

    // SUPERADMINS
    const supers = (process.env.SUPERADMINS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (supers.includes(email.toLowerCase())) {
      const user = await User.findOneAndUpdate(
        { email },
        {
          $setOnInsert: { nombre: email, rol: "admin", sector: "sin asignar" },
        },
        { upsert: true, new: true }
      );
      log("SUPERADMIN passthrough:", email);
      req.user = user;
      return next();
    }

    // Validación normal
    const user = await User.findOne({ email });
    if (!user) {
      log("Usuario no registrado:", email);
      return res.status(403).json({ message: "Usuario no registrado" });
    }
    if (user.rol !== "admin") {
      log("Acceso denegado (no admin):", email, "rol:", user.rol);
      return res.status(403).json({ message: "Acceso denegado (no admin)" });
    }

    req.user = user;
    next();
  } catch (err) {
    log("Error en checkAdmin:", err?.message);
    return res
      .status(500)
      .json({ message: "Error de autenticación", detail: err?.message });
  }
};
