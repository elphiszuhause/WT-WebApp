import {
  json,
  readJson,
  sameOrigin,
  supabaseRequest
} from "../../_shared/auth.js";

const SUCCESS_MESSAGE = "Wenn für diese E-Mail-Adresse ein Konto besteht, wurde ein Link zum Zurücksetzen des Passworts versendet.";

export async function onRequestPost(context) {
  if (!sameOrigin(context.request)) return json({ error: "Unzulässige Anfrage" }, 403);

  const body = await readJson(context.request);
  const email = body && typeof body.email === "string" ? body.email.trim() : "";
  if (!email || !email.includes("@")) return json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." }, 400);

  const redirectTo = new URL("/login", context.request.url).href;
  const result = await supabaseRequest(context.request, "recover", {
    method: "POST",
    body: JSON.stringify({ email, redirect_to: redirectTo })
  });

  if (!result.ok && result.status === 429) {
    return json({ error: "Es wurden zu viele E-Mails angefordert. Bitte warte einige Minuten und versuche es erneut." }, 429);
  }

  // Auch bei unbekannten Adressen neutral antworten, damit keine Konten abgefragt werden können.
  return json({ message: SUCCESS_MESSAGE });
}
