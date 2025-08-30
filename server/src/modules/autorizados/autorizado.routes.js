// server/src/modules/autorizados/autorizado.routes.js
import { Router } from "express";
import mongoose from "mongoose";
import { Autorizado } from "./autorizado.model.js";
import { checkAdmin } from "../../middlewares/checkAdmin.js";

// Nota: este archivo replica el CRUD que tenías en index.js:
// - GET /autorizados
// - POST /autorizados
// - DELETE /autorizados/:id
// Si en tu index.js había un PATCH que devolvía 405, lo mantenemos igual.

const router = Router();
const { Types } = mongoose;

// GET /autorizados  (listar todos; si luego querés filtros, los agregamos)
router.get("/", checkAdmin, async (_req, res) => {
  try {
    const lista = await Autorizado.find().lean();
    return res.json({ data: lista });
  } catch {
    return res.status(500).json({ message: "Error al listar autorizados" });
  }
});

// POST /autorizados  (crear uno nuevo)
router.post("/", checkAdmin, async (req, res) => {
  try {
    // Ajustá validaciones según tu esquema
    const payload = req.body || {};
    const creado = await Autorizado.create(payload);
    return res.status(201).json({ message: "Autorizado creado", data: creado });
  } catch {
    return res.status(500).json({ message: "Error al crear autorizado" });
  }
});

// DELETE /autorizados/:id  (eliminar)
router.delete("/:id", checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "id inválido" });
    }
    const eliminado = await Autorizado.findByIdAndDelete(id);
    if (!eliminado) {
      return res.status(404).json({ message: "No encontrado" });
    }
    return res.json({ message: "Autorizado eliminado", eliminado });
  } catch {
    return res.status(500).json({ message: "Error al eliminar autorizado" });
  }
});

// PATCH /autorizados/:id  (mantener el 405 si así lo tenías)
router.patch("/:id", checkAdmin, async (_req, res) => {
  return res.status(405).json({
    message:
      "Usá POST /autorizados para crear o DELETE /autorizados/:id para eliminar",
  });
});

export default router;
