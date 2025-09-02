// server/src/modules/auth/auth.routes.js
import { Router } from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env.js";
import { User } from "../users/user.model.js";

// Nota: estos nombres y comportamiento reflejan lo que ya tenías en index.js:
// - aceptar { token } (ID token de Google) o { access_token } (OAuth access token)
// - validar dominio PERMITIDO_DOMINIO si está configurado
// - upsert de usuario y emisión de JWT propio

const router = Router();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

/**
 * POST /auth/google
 * Body:
 *  - token: ID token (opción 1)  ó
 *  - access_token: OAuth access token (opción 2)
 */
router.post("/google", async (req, res) => {
  const { token, access_token } = req.body || {};

  try {
    let email, name, picture;

    if (token) {
      // Flujo con ID Token (Google One Tap / Credential)
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload?.email;
      name = payload?.name || payload?.given_name || "";
      picture = payload?.picture || "";
    } else if (access_token) {
      // Flujo con access_token (intercambio via /userinfo)
      const { data } = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );
      email = data?.email;
      name = data?.name || data?.given_name || "";
      picture = data?.picture || "";
    } else {
      return res
        .status(400)
        .json({ message: "Falta token de Google (token o access_token)" });
    }

    if (!email) {
      return res
        .status(401)
        .json({ message: "No se pudo obtener el email de Google" });
    }

    // Validación de dominio institucional (si está configurado)
    if (env.PERMITIDO_DOMINIO) {
      const dominio = String(email).split("@")[1] || "";
      if (dominio !== env.PERMITIDO_DOMINIO) {
        return res.status(403).json({ message: "Dominio no autorizado" });
      }
    }

    // Upsert de usuario
    let usuario = await User.findOne({ email });

    if (!usuario) {
      const isFirst = (await User.countDocuments()) === 0;
      const initialRole = isFirst ? "admin" : "viewer";

      usuario = await User.create({
        email,
        name: name || email.split("@")[0],
        picture: picture || "",
        role: initialRole,
      });
    } else {
      // ⚠️ NO tocar role si ya existe
      const updates = {};
      if (name && name !== usuario.name) updates.name = name;
      if (picture && picture !== usuario.picture) updates.picture = picture;
      if (Object.keys(updates).length) {
        usuario = await User.findByIdAndUpdate(usuario._id, updates, {
          new: true,
        });
      }
    }

    // Emitir JWT propio
    const payload = {
      sub: usuario._id.toString(),
      email: usuario.email,
      role: usuario.role,
    };
    const jwtToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "2h",
    });

    return res.json({
      token: jwtToken,
      user: {
        id: usuario._id.toString(),
        email: usuario.email,
        // 👇 mandamos todas las variantes por compat con el client actual
        name: usuario.name,
        displayName: usuario.name,
        nombre: usuario.name,
        role: usuario.role,
        picture: usuario.picture,
      },
    });
  } catch (error) {
    const msg = error?.response?.data || error?.message || "unknown";
    return res.status(401).json({ message: "Token inválido", error: msg });
  }
});

/**
 * (Opcional) Endpoint de login dev para pruebas locales rápidas
 * POST /auth/login/dev
 * Body: { email, role?, name? }
 */
router.post("/login/dev", async (req, res) => {
  const {
    email,
    role = "viewer",
    name = "Dev User",
    picture = "",
  } = req.body || {};
  if (!email) return res.status(400).json({ message: "Falta email" });

  let usuario = await User.findOne({ email });
  if (!usuario) {
    usuario = await User.create({ email, name, role, picture });
  }

  const payload = {
    sub: usuario._id.toString(),
    email: usuario.email,
    role: usuario.role,
  };
  const jwtToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "2h",
  });

  return res.json({
    token: jwtToken,
    user: {
      id: usuario._id.toString(),
      email: usuario.email,
      // 👇 mandamos todas las variantes por compat con el client actual
      name: usuario.name,
      displayName: usuario.name,
      nombre: usuario.name,
      role: usuario.role,
      picture: usuario.picture,
    },
  });
});

export default router;
