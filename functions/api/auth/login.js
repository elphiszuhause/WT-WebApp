import {
  appendSessionCookies,
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
  const email = body && typeof body.email === "string" ? body.email.trim() : "";
  const password = body && typeof body.password === "string" ? body.password : "";
  if (!email || !password) return json({ error: "E-Mail-Adresse und Passwort werden benötigt." }, 400);

  const result = await supabaseRequest(context.request, "token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  if (!result.ok) return authError(result);

  const headers = new Headers();
  appendSessionCookies(headers, result.data);
  return json({ user: publicUser(result.data.user || {}) }, 200, headers);
}
