// server/middleware/checkAdmin.js
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const checkAdmin = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    const [scheme, token] = auth.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res
        .status(401)
        .json({ message: "Falta Authorization Bearer token" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Token inválido o vencido" });
    }

    const email = String(payload?.email || "")
      .trim()
      .toLowerCase();
    if (!email) return res.status(401).json({ message: "Token sin email" });

    // SUPERADMINS (bypass)
    const supers = (process.env.SUPERADMINS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (supers.includes(email)) {
      const user = await User.findOneAndUpdate(
        { email },
        {
          $setOnInsert: { nombre: email, rol: "admin", sector: "sin asignar" },
        },
        { new: true, upsert: true }
      );
      req.user = { id: user._id.toString(), email: user.email, rol: user.rol };
      return next();
    }

    // Validación normal (corroboramos rol actual en DB)
    const user = await User.findOne({ email });
    if (!user)
      return res.status(403).json({ message: "Usuario no registrado" });
    if (user.rol !== "admin") {
      return res.status(403).json({ message: "Acceso denegado (no admin)" });
    }

    req.user = { id: user._id.toString(), email: user.email, rol: user.rol };
    next();
  } catch (err) {
    return res.status(500).json({ message: "Error de autenticación" });
  }
};
