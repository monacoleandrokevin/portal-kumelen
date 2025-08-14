// server/middleware/checkAdmin.js
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const log = (...args) => {
  if (process.env.NODE_ENV !== "production")
    console.log("[checkAdmin]", ...args);
};

export const checkAdmin = async (req, res, next) => {
  try {
    // 1) Tomar y validar Bearer
    const auth = req.headers.authorization || "";
    const [scheme, token] = auth.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res
        .status(401)
        .json({ message: "Falta Authorization Bearer token" });
    }

    // 2) Verificar y decodificar tu JWT
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
      // payload esperado: { sub, email, rol, iat, exp }
    } catch (err) {
      const reason =
        err?.name === "TokenExpiredError"
          ? "Token vencido"
          : err?.name === "JsonWebTokenError"
          ? "Token inválido"
          : "No se pudo verificar el token";
      return res.status(401).json({ message: reason });
    }

    const email = String(payload?.email || "")
      .trim()
      .toLowerCase();
    const rol = String(payload?.rol || "");

    if (!email) {
      return res.status(401).json({ message: "Token sin email" });
    }

    // 3) SUPERADMINS (bypass de rol, útil para emergencia)
    const supers = (process.env.SUPERADMINS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (supers.includes(email)) {
      // upsert como admin si no existe
      const user = await User.findOneAndUpdate(
        { email },
        {
          $setOnInsert: { nombre: email, rol: "admin", sector: "sin asignar" },
        },
        { new: true, upsert: true }
      );
      log("SUPERADMIN passthrough:", email);
      req.user = { id: user._id.toString(), email: user.email, rol: user.rol };
      return next();
    }

    // 4) Validación normal de admin
    // (aunque el JWT trae rol, corroboramos en DB por si el rol cambió)
    const user = await User.findOne({ email });
    if (!user) {
      log("Usuario no registrado:", email);
      return res.status(403).json({ message: "Usuario no registrado" });
    }
    if (user.rol !== "admin") {
      log("Acceso denegado (no admin):", email, "rol:", user.rol);
      return res.status(403).json({ message: "Acceso denegado (no admin)" });
    }

    // 5) Adjunto user “ligero” al request
    req.user = { id: user._id.toString(), email: user.email, rol: user.rol };
    next();
  } catch (err) {
    log("Error en checkAdmin:", err?.message || err);
    return res
      .status(500)
      .json({
        message: "Error de autenticación",
        detail: err?.message || "unknown",
      });
  }
};
