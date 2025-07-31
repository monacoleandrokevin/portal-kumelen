import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import { User } from "./models/User.js";

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

app.use(cors());
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

    // 👇 Lógica de guardado en MongoDB
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

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
