// server/services/workspace.js
import { google } from "googleapis";

// Scopes delegados en Admin Console (DWD)
const SCOPES = [
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.directory.orgunit.readonly",
  // opcional si más adelante validás por grupos
  "https://www.googleapis.com/auth/admin.directory.group.readonly",
];

// Crea un JWT del Service Account con impersonación
function getJWT() {
  const key = (process.env.GWS_SA_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const email = process.env.GWS_SA_CLIENT_EMAIL;
  const subject = process.env.GWS_IMPERSONATE; // admin del dominio

  if (!email || !key || !subject) {
    throw new Error(
      "Faltan GWS_SA_CLIENT_EMAIL / GWS_SA_PRIVATE_KEY / GWS_IMPERSONATE"
    );
  }

  return new google.auth.JWT(email, undefined, key, SCOPES, subject);
}

// Lee allowed OUs desde env (acepta ALLOWED_OU o GWS_ALLOWED_OUS)
function getAllowedOUs() {
  const raw = process.env.ALLOWED_OU || process.env.GWS_ALLOWED_OUS || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Verifica si el usuario pertenece a una OU permitida (incluye sub-OUs).
 * Devuelve boolean: true si pasa la política, false si no.
 */
export async function isAllowedByWorkspace(email) {
  const auth = getJWT();
  const admin = google.admin({ version: "directory_v1", auth });

  // Trae el usuario y su OU
  const { data: user } = await admin.users.get({
    userKey: email,
    projection: "full",
  });

  const orgUnitPath = (user.orgUnitPath || "/").toLowerCase();
  const allowedOUs = getAllowedOUs().map((s) => s.toLowerCase());

  // Si no configuraste OUs, no bloqueamos por OU
  if (allowedOUs.length === 0) return true;

  // Acepta sub-OUs por prefijo
  const ok = allowedOUs.some((base) => orgUnitPath.startsWith(base));
  return ok;
}
