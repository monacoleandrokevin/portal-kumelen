import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import { User } from "./models/User.js";
import { checkAdmin } from "./middleware/checkAdmin.js";
import { Autorizado } from "./models/Autorizado.js";
import usersRoutes from "./routes/users.js";

dotenv.config();

import mongoose from "mongoose";

console.log("URI leída desde .env:", process.env.MONGO_URI);

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error al conectar MongoDB:", err));

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use("/users", usersRoutes);

app.use(
  cors({
    origin: ["https://portal-kumelen.vercel.app"],
    credentials: true,
  })
);

app.use(express.json());

app.post("/auth/google", async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;

    // Validar dominio permitido
    if (!email.endsWith(`@${process.env.PERMITIDO_DOMINIO}`)) {
      return res
        .status(403)
        .json({ message: "Acceso denegado. Solo correos institucionales." });
    }

    // Validar que esté en la lista blanca (autorizados)
    const autorizado = await Autorizado.findOne({ email });
    if (!autorizado) {
      return res
        .status(403)
        .json({ message: "Este correo no está habilitado para ingresar." });
    }

    // Buscar o crear el usuario
    let usuario = await User.findOne({ email });

    if (!usuario) {
      usuario = await User.create({
        nombre: name,
        email,
        rol: "empleado",
        sector: "sin asignar",
      });
    }

    return res.status(200).json({
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      sector: usuario.sector,
    });
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Token inválido", error: error.message });
  }
});

app.get("/users", checkAdmin, async (req, res) => {
  try {
    const usuarios = await User.find({}, "-__v -createdAt -updatedAt");
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
});

app.patch("/users/:id/rol", checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevoRol } = req.body;

    if (!["admin", "empleado"].includes(nuevoRol)) {
      return res.status(400).json({ message: "Rol inválido" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { rol: nuevoRol },
      { new: true }
    );
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ message: "Rol actualizado", usuario: user });
  } catch (err) {
    res.status(500).json({ message: "Error al actualizar rol" });
  }
});

app.patch("/users/:id/vinculos", checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevosVinculos } = req.body;

    if (!Array.isArray(nuevosVinculos)) {
      return res
        .status(400)
        .json({ message: "El formato de vínculos es inválido" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        vinculos: nuevosVinculos,
      },
      { new: true }
    );

    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ message: "Vínculos actualizados", usuario: user });
  } catch (err) {
    res.status(500).json({ message: "Error al actualizar vínculos" });
  }
});

app.post("/autorizados", checkAdmin, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.endsWith(`@${process.env.PERMITIDO_DOMINIO}`)) {
      return res
        .status(400)
        .json({ message: "Email inválido o fuera de dominio" });
    }

    const yaExiste = await Autorizado.findOne({ email });
    if (yaExiste) {
      return res.status(409).json({ message: "Este email ya está autorizado" });
    }

    const nuevo = await Autorizado.create({ email });
    res.status(201).json({ message: "Autorizado creado", autorizado: nuevo });
  } catch (err) {
    res.status(500).json({ message: "Error al crear autorizado" });
  }
});

app.delete("/autorizados/:id", checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await Autorizado.findByIdAndDelete(id);
    if (!eliminado) return res.status(404).json({ message: "No encontrado" });

    res.json({ message: "Autorizado eliminado", eliminado });
  } catch (err) {
    res.status(500).json({ message: "Error al eliminar autorizado" });
  }
});

app.get("/autorizados", checkAdmin, async (req, res) => {
  try {
    const lista = await Autorizado.find({}, "-__v");
    res.json(lista);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener autorizados" });
  }
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
