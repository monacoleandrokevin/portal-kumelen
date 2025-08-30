import mongoose from "mongoose";

const vinculoSchema = new mongoose.Schema(
  {
    edificio: { type: String, required: true },
    nivel: { type: [String], required: true }, // ej: ["inicial", "primario"]
    rol: { type: String, required: true }, // "docente" o "no docente"
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    nombre: String,
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    rol: { type: String, enum: ["admin", "empleado"], default: "empleado" },
    vinculos: { type: [vinculoSchema], default: [] },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model("User", userSchema);
