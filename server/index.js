import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import axios from "axios";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";

import { User } from "./models/User.js";
import { Autorizado } from "./models/Autorizado.js";
import { isAllowedByWorkspace } from "./services/workspace.js";
import { listAllowedUsers } from "./lib/workspaceAccess.js";
import { checkAdmin } from "./middleware/checkAdmin.js";
import usersRoutes from "./routes/users.js";
import { google } from "googleapis";
import { Types } from "mongoose";

dotenv.config();

const REQUIRED = [
  "MONGO_URI",
  "GOOGLE_CLIENT_ID",
  "JWT_SECRET",
  "PERMITIDO_DOMINIO",
];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Faltan variables de entorno:", missing.join(", "));
  process.exit(1);
}

await mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => {
    console.error("❌ Error al conectar MongoDB:", err?.message || err);
    process.exit(1);
  });

const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 4000;

// --- CORS explícito + logger ---
const ALLOWLIST = [
  (process.env.FRONTEND_URL || "").trim().replace(/\/$/, "").toLowerCase(),
  "http://localhost:5173",
  "https://portal-kumelen.vercel.app",
].filter(Boolean);

// Permitir previews de Vercel (si no querés previews, comentá esta línea).
const VERCEL_PREVIEW = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

function isAllowedOrigin(origin) {
  if (!origin) return true; // curl/health checks
  const o = String(origin).trim().replace(/\/$/, "").toLowerCase();
  return ALLOWLIST.includes(o) || VERCEL_PREVIEW.test(o);
}

// LOG de decisión de CORS (quitá esto cuando termine el debug)
app.use((req, res, next) => {
  const origin = req.headers.origin || "";
  const decision = isAllowedOrigin(origin) ? "ALLOW" : "BLOCK";
  console.log(
    `[CORS] ${req.method} ${req.path} | Origin=${origin || "-"} | ${decision}`
  );
  next();
});

// Middleware CORS explícito (SIEMPRE antes de cualquier ruta)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = isAllowedOrigin(origin);

  // Para caches/CDN
  res.setHeader("Vary", "Origin");

  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    // Si no usás cookies cross-site, NO habilites credentials.
    // res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(allowed ? 204 : 403);
  }
  if (!allowed) {
    return res
      .status(403)
      .json({ message: `CORS: origin no permitido → ${origin || "-"}` });
  }
  next();
});

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/auth", authLimiter);

app.use("/users", usersRoutes);

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post("/auth/google", async (req, res) => {
  const { token, access_token } = req.body || {};
  try {
    let email, name;

    if (token) {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload?.email;
      name = payload?.name || "";
    } else if (access_token) {
      const { data } = await axios.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        { headers: { Authorization: `Bearer ${access_token}` }, timeout: 8000 }
      );
      email = data?.email;
      name = data?.name || data?.given_name || "";
    } else {
      return res
        .status(400)
        .json({ message: "Falta token de Google (token o access_token)" });
    }

    if (!email) {
      return res
        .status(401)
        .json({ message: "No se pudo obtener el email desde Google" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const dominio = String(process.env.PERMITIDO_DOMINIO || "")
      .trim()
      .toLowerCase();
    if (dominio && !emailNorm.endsWith(`@${dominio}`)) {
      return res
        .status(403)
        .json({ message: "Acceso denegado. Solo correos institucionales." });
    }

    const okPolicy = await isAllowedByWorkspace(emailNorm);
    if (!okPolicy) {
      return res.status(403).json({
        message: "Tu cuenta no tiene acceso (política de Workspace).",
      });
    }

    let usuario = await User.findOne({ email: emailNorm });
    if (!usuario) {
      const ya = await Autorizado.findOne({ email: emailNorm });
      if (!ya) {
        return res
          .status(403)
          .json({ message: "Este correo no está habilitado para ingresar." });
      }
      usuario = await User.create({
        nombre: name,
        email: emailNorm,
        rol: "empleado",
      });
    }

    const sessionToken = jwt.sign(
      { sub: String(usuario._id), email: usuario.email, role: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: "8h", issuer: "portal-kumelen" }
    );

    return res.status(200).json({
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      token: sessionToken,
    });
  } catch (err) {
    const src =
      err?.config?.url ??
      err?.response?.config?.url ??
      err?.response?.request?.res?.responseUrl ??
      err?.response?.request?.socket?.servername ??
      "";

    const srcStr = String(src); // <- fuerza string

    if (srcStr.includes("openidconnect.googleapis.com")) {
      // mensaje específico, por ejemplo:
      return res.status(503).json({
        message: "Falla consultando OpenID userinfo",
        error: "Servicio de Google momentáneamente no disponible",
      });
    }

    // fallback genérico
    return res.status(401).json({
      message: "Token inválido",
      error: err?.response?.data || err?.message || "unknown",
    });
  }
});

app.patch("/autorizados/:id", checkAdmin, async (req, res) => {
  return res.status(405).json({
    message: "Usá POST /autorizados para crear o DELETE para eliminar.",
  });
});

app.patch("/users/:id/rol", checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevoRol } = req.body || {};
    if (!Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "id inválido" });
    if (!["admin", "empleado"].includes(nuevoRol))
      return res.status(422).json({ message: "rol inválido" });

    const user = await User.findByIdAndUpdate(
      id,
      { rol: nuevoRol },
      { new: true }
    );
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ message: "Rol actualizado", usuario: user });
  } catch {
    res.status(500).json({ message: "Error al actualizar rol" });
  }
});

app.patch("/users/:id/vinculos", checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevosVinculos } = req.body || {};

    if (!Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "id inválido" });
    if (!Array.isArray(nuevosVinculos))
      return res
        .status(422)
        .json({ message: "El formato de vínculos es inválido" });

    const user = await User.findByIdAndUpdate(
      id,
      { vinculos: nuevosVinculos },
      { new: true }
    );
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ message: "Vínculos actualizados", usuario: user });
  } catch {
    res.status(500).json({ message: "Error al actualizar vínculos" });
  }
});

app.get("/autorizados", checkAdmin, async (_req, res) => {
  try {
    const lista = await Autorizado.find({}, "-__v");
    res.json(lista);
  } catch {
    res.status(500).json({ message: "Error al obtener autorizados" });
  }
});

app.get("/workspace/usuarios", checkAdmin, async (_req, res) => {
  try {
    const lista = await listAllowedUsers();
    res.json(lista);
  } catch (e) {
    res.status(500).json({ message: "Error al listar usuarios de Workspace" });
  }
});

app.post("/autorizados", checkAdmin, async (req, res) => {
  try {
    const emailNorm = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    const dominio = String(process.env.PERMITIDO_DOMINIO || "")
      .trim()
      .toLowerCase();

    if (!emailNorm || !emailNorm.endsWith(`@${dominio}`)) {
      return res
        .status(400)
        .json({ message: "Email inválido o fuera de dominio" });
    }

    const yaExiste = await Autorizado.findOne({ email: emailNorm });
    if (yaExiste)
      return res.status(409).json({ message: "Este email ya está autorizado" });

    const nuevo = await Autorizado.create({ email: emailNorm });
    res.status(201).json({ message: "Autorizado creado", autorizado: nuevo });
  } catch {
    res.status(500).json({ message: "Error al crear autorizado" });
  }
});

app.delete("/autorizados/:id", checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "id inválido" });

    const eliminado = await Autorizado.findByIdAndDelete(id);
    if (!eliminado) return res.status(404).json({ message: "No encontrado" });

    res.json({ message: "Autorizado eliminado", eliminado });
  } catch {
    res.status(500).json({ message: "Error al eliminar autorizado" });
  }
});

app.post("/workspace/sync", checkAdmin, async (_req, res) => {
  try {
    const lista = await listAllowedUsers();
    let created = 0,
      updated = 0;

    for (const u of lista) {
      const email = u.email.toLowerCase().trim();
      const nombre = u.name || email;
      const found = await User.findOne({ email });
      if (!found) {
        await User.create({ nombre, email, rol: "empleado" });
        created++;
      } else {
        if (found.nombre !== nombre) {
          found.nombre = nombre;
          await found.save();
          updated++;
        }
      }
    }

    res.json({ message: "Sync OK", created, updated, total: lista.length });
  } catch (e) {
    res.status(500).json({ message: "Error al sincronizar usuarios" });
  }
});

app.patch("/users/:id/metadata", checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { edificios, niveles } = req.body || {};

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "id inválido" });
    }
    if (edificios && !Array.isArray(edificios)) {
      return res.status(422).json({ message: "edificios debe ser array" });
    }
    if (niveles && !Array.isArray(niveles)) {
      return res.status(422).json({ message: "niveles debe ser array" });
    }

    const update = {};
    if (edificios) update.edificios = edificios.map(String);
    if (niveles) update.niveles = niveles.map(String);

    const user = await User.findByIdAndUpdate(id, update, { new: true });
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ message: "Metadatos actualizados", usuario: user });
  } catch {
    res.status(500).json({ message: "Error al actualizar metadatos" });
  }
});

function _getJwt() {
  const key = (process.env.GWS_SA_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return new google.auth.JWT(
    process.env.GWS_SA_CLIENT_EMAIL,
    undefined,
    key,
    [
      "https://www.googleapis.com/auth/admin.directory.user.readonly",
      "https://www.googleapis.com/auth/admin.directory.group.member.readonly",
    ],
    process.env.GWS_IMPERSONATE
  );
}

app.get("/workspace/selftest", async (_req, res) => {
  try {
    const auth = _getJwt();
    await auth.authorize();
    const admin = google.admin({ version: "directory_v1", auth });
    const { data } = await admin.users.get({
      userKey: process.env.GWS_IMPERSONATE,
      projection: "basic",
    });
    res.json({
      ok: true,
      impersonating: process.env.GWS_IMPERSONATE,
      sampleUser: data?.primaryEmail || null,
      orgUnitPath: data?.orgUnitPath || null,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      message: "Falla autenticación contra Admin SDK",
      detail: e?.message || String(e),
    });
  }
});

app.get("/workspace/echo/:email", async (req, res) => {
  try {
    const auth = _getJwt();
    await auth.authorize();
    const admin = google.admin({ version: "directory_v1", auth });
    const { data } = await admin.users.get({
      userKey: String(req.params.email || "")
        .trim()
        .toLowerCase(),
      projection: "basic",
    });
    res.json({
      email: data?.primaryEmail,
      orgUnitPath: data?.orgUnitPath,
      name: data?.name?.fullName,
    });
  } catch (e) {
    res.status(500).json({
      message: "No se pudo obtener el usuario",
      detail: e?.message || String(e),
    });
  }
});

app.post("/debug/userinfo", async (req, res) => {
  try {
    const at = req.body?.access_token;
    if (!at) return res.status(400).json({ message: "Falta access_token" });

    const { data } = await axios.get(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${at}` }, timeout: 8000 }
    );
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({
      ok: false,
      detail: e?.response?.data || e?.message || String(e),
    });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
