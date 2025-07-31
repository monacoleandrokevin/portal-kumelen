import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    rol: { type: String, default: "empleado" }, // Otros posibles: 'admin', 'coordinador', etc.
    sector: { type: String, default: "sin asignar" }, // Ej: Primaria, Secundaria, Administración
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
