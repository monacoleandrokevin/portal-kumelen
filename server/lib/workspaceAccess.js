// server/lib/workspaceAccess.js
import { google } from "googleapis";

function getJwt() {
  const key = (process.env.GWS_SA_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  return new google.auth.JWT(
    process.env.GWS_SA_CLIENT_EMAIL,
    undefined,
    key,
    [
      "https://www.googleapis.com/auth/admin.directory.user.readonly",
      "https://www.googleapis.com/auth/admin.directory.group.member.readonly",
    ],
    process.env.GWS_IMPERSONATE
  );
}

export async function userOrgUnitPath(email) {
  const auth = getJwt();
  const admin = google.admin({ version: "directory_v1", auth });
  const { data } = await admin.users.get({
    userKey: email,
    projection: "basic",
  });
  return data.orgUnitPath || "/";
}

export async function isMemberOfGroup(email, groupKey) {
  if (!groupKey) return false;
  const auth = getJwt();
  const admin = google.admin({ version: "directory_v1", auth });
  try {
    const { data } = await admin.members.get({ groupKey, memberKey: email });
    return data.status === "ACTIVE";
  } catch {
    return false;
  }
}

export async function isAllowedByWorkspace(email) {
  const ouConf = (process.env.GWS_ALLOWED_OUS || "").trim();
  const groupConf = (process.env.ACCESS_GROUP || "").trim();

  // OU
  let okByOu = false;
  if (ouConf) {
    const allowed = ouConf
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const path = (await userOrgUnitPath(email)) || "/";
    okByOu = allowed.some(
      (ou) => path === ou || path.startsWith(ou.endsWith("/") ? ou : ou + "/")
    );
  }

  // Grupo
  let okByGroup = false;
  if (groupConf) {
    okByGroup = await isMemberOfGroup(email, groupConf);
  }

  return okByOu || okByGroup;
}

// Listar TODOS los usuarios habilitados según OU y/o Grupo
export async function listAllowedUsers() {
  const auth = getJwt();
  const admin = google.admin({ version: "directory_v1", auth });

  const ouConf = (process.env.GWS_ALLOWED_OUS || "").trim();
  const groupConf = (process.env.ACCESS_GROUP || "").trim();

  const out = new Map(); // email -> { email, name, orgUnitPath }

  // A) Usuarios por OU
  if (ouConf) {
    const allowed = ouConf
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const ou of allowed) {
      let pageToken;
      do {
        const { data } = await admin.users.list({
          customer: "my_customer",
          orgUnitPath: ou, // filtra por la OU
          maxResults: 200,
          pageToken,
          projection: "basic",
          orderBy: "email",
        });
        (data.users || []).forEach((u) => {
          const email = (u.primaryEmail || "").toLowerCase();
          if (!email) return;
          out.set(email, {
            email,
            name: u.name?.fullName || "",
            orgUnitPath: u.orgUnitPath || "/",
          });
        });
        pageToken = data.nextPageToken;
      } while (pageToken);
    }
  }

  // B) Usuarios por Grupo (opcional)
  if (groupConf) {
    let pageToken;
    do {
      const { data } = await admin.members.list({
        groupKey: groupConf,
        maxResults: 200,
        pageToken,
      });
      const members = data.members || [];
      for (const m of members) {
        if (m.type !== "USER" || m.status !== "ACTIVE") continue;
        const email = (m.email || "").toLowerCase();
        if (!email) continue;
        // traer orgUnitPath del usuario
        const path = await userOrgUnitPath(email);
        if (!out.has(email)) {
          out.set(email, { email, name: "", orgUnitPath: path });
        }
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  }

  return Array.from(out.values());
}
