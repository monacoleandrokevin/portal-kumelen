// server/index.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import axios from "axios";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";

import { User } from "./models/User.js";
import { Autorizado } from "./models/Autorizado.js";
import { checkAdmin } from "./middleware/checkAdmin.js";
import usersRoutes from "./routes/users.js";

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
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${access_token}` } }
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

    const autorizado = await Autorizado.findOne({ email: emailNorm });
    if (!autorizado) {
      return res
        .status(403)
        .json({ message: "Este correo no está habilitado para ingresar." });
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

// Cambiar rol
import mongoosePkg from "mongoose";
const { Types } = mongoosePkg;

app.patch("/autorizados/:id", checkAdmin, async (req, res) => {
  return res
    .status(405)
    .json({
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

app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
