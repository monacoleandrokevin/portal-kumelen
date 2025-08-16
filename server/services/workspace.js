// server/services/workspace.js
import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.directory.group.member.readonly",
];

function getJWT() {
  const key = (process.env.GWS_SA_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return new google.auth.JWT(
    process.env.GWS_SA_CLIENT_EMAIL,
    undefined,
    key,
    SCOPES,
    process.env.GWS_IMPERSONATE // email de un admin de tu dominio
  );
}

/**
 * Devuelve true si el usuario cumple política de OU y/o grupos.
 * - OU: match por prefijo (incluye sub-OUs)
 * - Grupos: basta con pertenecer a cualquiera de los listados
 */
export async function isAllowedByWorkspace(email) {
  const auth = getJWT();
  const admin = google.admin({ version: "directory_v1", auth });

  // 1) OU del usuario (users.get expone orgUnitPath)
  const { data: user } = await admin.users.get({
    userKey: email,
    projection: "basic",
  });
  const orgUnitPath = (user.orgUnitPath || "/").toLowerCase();

  const allowedOUs = (process.env.GWS_ALLOWED_OUS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const allowedGroups = (process.env.GWS_ALLOWED_GROUPS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // OU: si hay lista, debe hacer prefijo
  if (allowedOUs.length) {
    const okOU = allowedOUs.some((base) => orgUnitPath.startsWith(base));
    if (!okOU) return false;
  }

  // Grupos: si hay lista, debe pertenecer a alguno
  if (allowedGroups.length) {
    const { data } = await admin.groups.list({
      userKey: email,
      fields: "groups(email)",
    });
    const userGroups = (data.groups || []).map((g) => g.email.toLowerCase());
    const okGroup = allowedGroups.some((g) => userGroups.includes(g));
    if (!okGroup) return false;
  }

  return true;
}
