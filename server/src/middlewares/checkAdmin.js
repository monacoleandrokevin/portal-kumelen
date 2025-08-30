// server/middleware/checkAdmin.js
import jwt from "jsonwebtoken";
import { User } from "../modules/users/user.model.js";

export const checkAdmin = async (req, res, next) => {
  try {
    const bearer = req.headers.authorization || "";
    const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : null;
    if (!token) {
      return res
        .status(401)
        .json({ message: "Token faltante (Authorization Bearer)" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: "Token inválido" });
    }

    // payload: { sub, email, rol }
    const user = await User.findById(payload.sub).lean();
    if (!user)
      return res.status(403).json({ message: "Usuario no registrado" });
    if (user.rol !== "admin") {
      return res.status(403).json({ message: "Acceso denegado (no admin)" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error de autenticación", detail: err?.message });
  }
};
