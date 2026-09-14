import {
  appendClearedCookies,
  authenticatedSession,
  json,
  sameOrigin,
  supabaseRequest
} from "../../_shared/auth.js";

export async function onRequestPost(context) {
  if (!sameOrigin(context.request)) return json({ error: "Unzulässige Anfrage" }, 403);
  const session = await authenticatedSession(context.request);
  if (session) {
    await supabaseRequest(context.request, "logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
  }

  const headers = new Headers();
  appendClearedCookies(headers);
  return json({ success: true }, 200, headers);
}
