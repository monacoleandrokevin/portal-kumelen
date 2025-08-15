import mongoose from "mongoose";

const autorizadoSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
});
autorizadoSchema.index({ email: 1 }, { unique: true });

export const Autorizado = mongoose.model("Autorizado", autorizadoSchema);
