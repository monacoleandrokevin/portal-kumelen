// server/src/app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error.js";
import { router } from "./routes/index.js";

export async function buildApp() {
  const app = express();

  const origins = env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",") : [];
  app.use(cors({ origin: origins.length ? origins : true, credentials: true }));
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

  app.get("/healthz", (_req, res) =>
    res.json({ ok: true, uptime: process.uptime() })
  );
  app.use("/api", router);

  try {
    const { default: swaggerDoc } = await import("./docs/swagger.js");
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  } catch {
    /* opcional: loggear aviso */
  }

  app.use(errorHandler);
  return app;
}
