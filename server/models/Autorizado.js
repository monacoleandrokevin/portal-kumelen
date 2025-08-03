import mongoose from "mongoose";

const autorizadoSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
});

export const Autorizado = mongoose.model("Autorizado", autorizadoSchema);
