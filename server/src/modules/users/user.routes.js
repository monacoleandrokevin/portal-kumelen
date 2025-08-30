import express from "express";
import { User } from "./user.model.js";
import { checkAdmin } from "../../middlewares/checkAdmin.js";

const router = express.Router();

// GET /users → Lista todos los usuarios
router.get("/", checkAdmin, async (req, res) => {
  try {
    const usuarios = await User.find();
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
});

// PATCH /users/:id/rol → Cambia el rol (admin/empleado)
router.patch("/:id/rol", checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { nuevoRol } = req.body;

  try {
    const usuario = await User.findByIdAndUpdate(
      id,
      { rol: nuevoRol },
      { new: true }
    );

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ message: "Rol actualizado", usuario });
  } catch (err) {
    res.status(500).json({ message: "Error al actualizar rol" });
  }
});

// PATCH /users/:id/vinculos → Actualiza los vínculos laborales
router.patch("/:id/vinculos", checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { vinculos } = req.body;

  try {
    const usuario = await User.findByIdAndUpdate(
      id,
      { vinculos },
      { new: true }
    );

    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({ message: "Vínculos actualizados", usuario });
  } catch (err) {
    res.status(500).json({ message: "Error al actualizar vínculos" });
  }
});

export default router;
