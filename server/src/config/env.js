// server/src/config/env.js
import { cleanEnv, str, port } from "envalid";

export const env = cleanEnv(process.env, {
  PORT: port({ default: 8080 }),
  MONGO_URI: str({ default: "mongodb://localhost:27017/portal" }),
  JWT_SECRET: str({ default: "changeme" }),
  GOOGLE_CLIENT_ID: str({ default: "" }),
  GOOGLE_CLIENT_SECRET: str({ default: "" }),
  PERMITIDO_DOMINIO: str({ default: "" }),
  CORS_ORIGIN: str({ default: "http://localhost:5173" }),
});
