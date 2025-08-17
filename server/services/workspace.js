// server/services/workspace.js
import { google } from "googleapis";

/** Scopes delegados en Admin Console (DWD) */
const SCOPES = [
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.directory.orgunit.readonly",
  // opcional si más adelante validás por grupos
  // "https://www.googleapis.com/auth/admin.directory.group.readonly",
];

/** Normaliza y valida credenciales del Service Account */
function getJWT() {
  const email = process.env.GWS_SA_CLIENT_EMAIL;
  const subject = process.env.GWS_IMPERSONATE; // admin del dominio
  const rawKey = process.env.GWS_SA_PRIVATE_KEY || "";
  const key = rawKey.replace(/\\n/g, "\n"); // Render/Heroku pegan la key en una línea

  if (!email || !subject || !rawKey) {
    const miss = [];
    if (!email) miss.push("GWS_SA_CLIENT_EMAIL");
    if (!subject) miss.push("GWS_IMPERSONATE");
    if (!rawKey) miss.push("GWS_SA_PRIVATE_KEY");
    throw new Error(
      `Faltan variables de entorno para Workspace: ${miss.join(", ")}`
    );
  }

  return new google.auth.JWT(email, undefined, key, SCOPES, subject);
}

/** Lee OUs permitidas (acepta ALLOWED_OU o GWS_ALLOWED_OUS) */
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

  try {
    const { data: user } = await admin.users.get({
      userKey: email,
      projection: "full",
    });

    const orgUnitPath = (user.orgUnitPath || "/").toLowerCase();
    const allowedOUs = getAllowedOUs().map((s) => s.toLowerCase());

    // Si no configuraste OUs, no bloqueamos por OU
    if (allowedOUs.length === 0) return true;

    // Acepta sub-OUs por prefijo (ej: "/Kumelen/Personal/Docentes" matchea "/Kumelen/Personal")
    const ok = allowedOUs.some((base) => orgUnitPath.startsWith(base));
    return ok;
  } catch (err) {
    // Agregamos contexto útil si la API devuelve UNAUTHENTICATED / PERMISSION_DENIED
    const code = err?.code || err?.response?.status || "unknown";
    const status =
      err?.errors?.[0]?.reason || err?.response?.data?.error?.status;
    const msg = err?.message || err?.response?.data || String(err);
    // Importante: re-lanzar para que /auth/google pueda responder 401/403 con claridad
    throw new Error(
      `Workspace Directory error (${code}${status ? `/${status}` : ""}): ${msg}`
    );
  }
}

/**
 * (Opcional) Quick selftest para habilitar temporalmente en una ruta
 * Confirma que el SA + DWD funcionan y que podemos leer al IMPERSONATE.
 */
export async function workspaceSelfTest() {
  const auth = getJWT();
  const admin = google.admin({ version: "directory_v1", auth });
  const { data } = await admin.users.get({
    userKey: process.env.GWS_IMPERSONATE,
    projection: "basic",
  });
  return {
    impersonating: process.env.GWS_IMPERSONATE,
    sampleUser: data?.primaryEmail || null,
    orgUnitPath: data?.orgUnitPath || null,
  };
}
