import {
  appendClearedCookies,
  appendSessionCookies,
  authenticatedSession,
  json,
  publicUser,
  readJson,
  sameOrigin,
  supabaseRequest
} from "../../_shared/auth.js";

export async function onRequestGet(context) {
  const session = await authenticatedSession(context.request);
  if (!session) {
    const headers = new Headers();
    appendClearedCookies(headers);
    return json({ authenticated: false }, 401, headers);
  }

  const headers = new Headers();
  if (session.refreshed) appendSessionCookies(headers, session);
  return json({ authenticated: true, user: publicUser(session.user) }, 200, headers);
}

export async function onRequestPost(context) {
  if (!sameOrigin(context.request)) return json({ error: "Unzulässige Anfrage" }, 403);
  const body = await readJson(context.request);
  const accessToken = body && typeof body.access_token === "string" ? body.access_token : "";
  const refreshToken = body && typeof body.refresh_token === "string" ? body.refresh_token : "";
  if (!accessToken || !refreshToken) return json({ error: "Ungültige Anmeldedaten" }, 400);

  const verification = await supabaseRequest(context.request, "user", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!verification.ok) return json({ error: "Der Einladungslink ist ungültig oder abgelaufen." }, 401);

  const headers = new Headers();
  appendSessionCookies(headers, {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: Number(body.expires_in) || 3600
  });
  return json({ authenticated: true, user: publicUser(verification.data) }, 200, headers);
}
