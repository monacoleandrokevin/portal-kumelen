// server/index.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import axios from "axios";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import mongoosePkg from "mongoose";
import { OAuth2Client } from "google-auth-library";

import { User } from "./models/User.js";
import { Autorizado } from "./models/Autorizado.js";
import { isAllowedByWorkspace } from "./lib/workspaceAccess.js";
import { listAllowedUsers } from "./lib/workspaceAccess.js";
import { checkAdmin } from "./middleware/checkAdmin.js";
import usersRoutes from "./routes/users.js";
import { google } from "googleapis";

dotenv.config();

// Requisitos mínimos de entorno
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

// Mongo
await mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => {
    console.error("❌ Error al conectar MongoDB:", err?.message || err);
    process.exit(1);
  });

const app = express();
const PORT = process.env.PORT || 4000;

// CORS (antes de helmet)
const allowedOrigins = [
  process.env.FRONTEND_URL, // ej: https://portal-kumelen.vercel.app
  "https://portal-kumelen.vercel.app",
  "http://localhost:5173",
].filter(Boolean);

const corsCfg = {
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
};

const { Types } = mongoosePkg;

app.use(cors(corsCfg));
app.options("*", cors(corsCfg));

// Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// Body parser
app.use(express.json({ limit: "1mb" }));

// Healthcheck
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// Rate-limit auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/auth", authLimiter);

// Rutas públicas/protegidas
app.use("/users", usersRoutes);

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Login con Google → emite JWT propio
app.post("/auth/google", async (req, res) => {
  const { token, access_token } = req.body || {};
  if (!token && !access_token) {
    return res
      .status(400)
      .json({ message: "Falta token de Google (token o access_token)" });
  }
  if (access_token && typeof access_token !== "string") {
    return res.status(400).json({ message: "access_token inválido" });
  }
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
      // Access token -> /userinfo
      const { data } = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${access_token}` },
          timeout: 8000, // opcional
        }
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
    if (!dominio || !emailNorm.endsWith(`@${dominio}`)) {
      return res
        .status(403)
        .json({ message: "Acceso denegado. Solo correos institucionales." });
    }

    // Política de acceso basada en Workspace (OU y/o Grupo)
    const allowed = await isAllowedByWorkspace(emailNorm);
    if (!allowed) {
      return res.status(403).json({
        message: "Tu cuenta no tiene acceso (política de Workspace).",
      });
    }

    let usuario = await User.findOne({ email: emailNorm });
    if (!usuario) {
      usuario = await User.create({
        nombre: name,
        email: emailNorm,
        rol: "empleado",
      });
    }

    const payload = {
      sub: usuario._id.toString(),
      email: usuario.email,
      rol: usuario.rol,
    };
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "2h",
    });

    return res.status(200).json({
      token: jwtToken,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    });
  } catch (error) {
    const msg = error?.response?.data || error?.message || "unknown";
    return res.status(401).json({ message: "Token inválido", error: msg });
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

// Actualizar vínculos
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

// CRUD Autorizados
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
    const lista = await listAllowedUsers(); // [{ email, name, orgUnitPath }]
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
        // actualizá nombre si querés mantener sincronizado
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

// 1) Self-test: valida que el SA puede emitir credenciales y pegarle a Admin SDK
app.get("/workspace/selftest", async (_req, res) => {
  try {
    const auth = _getJwt();
    await auth.authorize(); // si falla, tira detalle claro
    const admin = google.admin({ version: "directory_v1", auth });
    // pedimos el admin impersonado para verificar que hay token válido
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

// 2) Ver un usuario puntual (requiere que ya funcione selftest)
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

app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
