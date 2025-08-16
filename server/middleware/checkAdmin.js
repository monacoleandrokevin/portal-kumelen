// server/middleware/checkAdmin.js
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import { User } from "../models/User.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const checkAdmin = async (req, res, next) => {
  try {
    const bearer = req.headers.authorization || "";
    const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : null;
    if (!token) {
      return res
        .status(401)
        .json({ message: "Token faltante (Authorization Bearer)" });
    }

    // 1) Intentar JWT propio
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findOne({ email: payload.email });
      if (!user)
        return res.status(403).json({ message: "Usuario no registrado" });
      if (user.rol !== "admin")
        return res.status(403).json({ message: "Acceso denegado (no admin)" });
      req.user = user;
      return next();
    } catch {
      /* continúa con verificación Google */
    }

    // 2) Token de Google (ID token)
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const email = ticket.getPayload()?.email;
      const user = await User.findOne({ email });
      if (!user)
        return res.status(403).json({ message: "Usuario no registrado" });
      if (user.rol !== "admin")
        return res.status(403).json({ message: "Acceso denegado (no admin)" });
      req.user = user;
      return next();
    } catch {
      // 3) Access token de Google → OIDC userinfo
      try {
        const { data } = await axios.get(
          "https://openidconnect.googleapis.com/v1/userinfo",
          { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }
        );
        const email = data?.email;
        const user = await User.findOne({ email });
        if (!user)
          return res.status(403).json({ message: "Usuario no registrado" });
        if (user.rol !== "admin")
          return res
            .status(403)
            .json({ message: "Acceso denegado (no admin)" });
        req.user = user;
        return next();
      } catch {
        return res.status(401).json({
          message:
            "Token inválido (ni JWT propio, ni ID token, ni access_token)",
        });
      }
    }
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Error de autenticación", detail: err?.message });
  }
};
