// server/src/routes/index.js
import { Router } from "express";
import usersRouter from "../modules/users/user.routes.js";
import autorizadosRouter from "../modules/autorizados/autorizado.routes.js";
import authRouter from "../modules/auth/auth.routes.js";

export const router = Router();

// ✅ Alias de salud para el front (evita 404 en /api/health)
router.get("/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/autorizados", autorizadosRouter);
