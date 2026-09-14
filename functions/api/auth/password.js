import {
  appendSessionCookies,
  authenticatedSession,
  authError,
  json,
  publicUser,
  readJson,
  sameOrigin,
  supabaseRequest
} from "../../_shared/auth.js";

export async function onRequestPost(context) {
  if (!sameOrigin(context.request)) return json({ error: "Unzulässige Anfrage" }, 403);
  const body = await readJson(context.request);
  const password = body && typeof body.password === "string" ? body.password : "";
  if (password.length < 8) return json({ error: "Das Passwort muss mindestens 8 Zeichen lang sein." }, 400);

  const session = await authenticatedSession(context.request);
  if (!session) return json({ error: "Die Sitzung ist abgelaufen. Bitte fordere eine neue Einladung an." }, 401);

  const result = await supabaseRequest(context.request, "user", {
    method: "PUT",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ password })
  });
  if (!result.ok) return authError(result, "Das Passwort konnte nicht gespeichert werden.");

  const headers = new Headers();
  if (session.refreshed) appendSessionCookies(headers, session);
  return json({ user: publicUser(result.data) }, 200, headers);
}
