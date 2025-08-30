import { Router } from "express";
import usersRouter from "../modules/users/user.routes.js";
import autorizadosRouter from "../modules/autorizados/autorizado.routes.js";
import authRouter from "../modules/auth/auth.routes.js";

export const router = Router();

// Límite de rate para /auth si lo tenías antes, acá se puede re-ubicar
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/autorizados", autorizadosRouter);
