import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../modules/users/user.model.js";

export async function checkAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Auth required" });

    const payload = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(payload.sub).lean();
    if (!user) return res.status(401).json({ message: "User not found" });
    if (user.role !== "admin")
      return res.status(403).json({ message: "Admin only" });

    req.user = user; // queda para el controlador
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
