import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { authEnvironment } from "../functions/_shared/auth.js";
import { onRequest as middleware } from "../functions/_middleware.js";
import { onRequestPost as login } from "../functions/api/auth/login.js";
import { onRequestPost as establishSession } from "../functions/api/auth/session.js";
import { onRequestPost as changePassword } from "../functions/api/auth/password.js";
import { onRequestPost as logout } from "../functions/api/auth/logout.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("production and preview hosts use separate Supabase projects", () => {
  assert.equal(authEnvironment(new Request("https://wt-webapp.pages.dev/")).url, "https://lvtcxdiyixblbufvxghy.supabase.co");
  assert.equal(authEnvironment(new Request("https://upgrade-professionalisierung.wt-webapp.pages.dev/")).url, "https://nqymmrovbkkbrzhljymx.supabase.co");
});

test("unauthenticated protected requests are redirected to login", async () => {
  const response = await middleware({
    request: new Request("https://upgrade-professionalisierung.wt-webapp.pages.dev/Bereiche/Personal/urlaubsantrag"),
    next: () => assert.fail("protected content must not be served")
  });

  assert.equal(response.status, 302);
  const location = new URL(response.headers.get("Location"));
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("return"), "/Bereiche/Personal/urlaubsantrag");
  assert.match(response.headers.get("Set-Cookie"), /wt_access=/);
});

test("login page remains public and is not cached", async () => {
  const response = await middleware({
    request: new Request("https://upgrade-professionalisierung.wt-webapp.pages.dev/login"),
    next: () => new Response("Anmelden", { status: 200 })
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Anmelden");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("valid Supabase session allows protected content", async () => {
  globalThis.fetch = async request => {
    assert.match(String(request), /\/auth\/v1\/user$/);
    return jsonResponse({ id: "user-1", email: "mitarbeiter@example.com" });
  };

  const response = await middleware({
    request: new Request("https://upgrade-professionalisierung.wt-webapp.pages.dev/", {
      headers: { Cookie: "wt_access=valid-token; wt_refresh=refresh-token" }
    }),
    next: () => new Response("Geschützt", { status: 200 })
  });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "Geschützt");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
});

test("password login creates HttpOnly session cookies", async () => {
  globalThis.fetch = async () => jsonResponse({
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    user: { id: "user-1", email: "mitarbeiter@example.com" }
  });

  const request = new Request("https://upgrade-professionalisierung.wt-webapp.pages.dev/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://upgrade-professionalisierung.wt-webapp.pages.dev" },
    body: JSON.stringify({ email: "mitarbeiter@example.com", password: "geheim123" })
  });
  const response = await login({ request });

  assert.equal(response.status, 200);
  assert.match(response.headers.get("Set-Cookie"), /wt_access=/);
  assert.match(response.headers.get("Set-Cookie"), /HttpOnly/);
  assert.match(response.headers.get("Set-Cookie"), /SameSite=Lax/);
});

test("invitation tokens are verified before a cookie session is created", async () => {
  globalThis.fetch = async () => jsonResponse({ id: "user-2", email: "neu@example.com" });
  const request = new Request("https://upgrade-professionalisierung.wt-webapp.pages.dev/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://upgrade-professionalisierung.wt-webapp.pages.dev" },
    body: JSON.stringify({ access_token: "invite-access", refresh_token: "invite-refresh", expires_in: 3600 })
  });
  const response = await establishSession({ request });

  assert.equal(response.status, 200);
  assert.match(response.headers.get("Set-Cookie"), /wt_access=/);
});

test("cross-origin login requests are rejected", async () => {
  const request = new Request("https://upgrade-professionalisierung.wt-webapp.pages.dev/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://example.com" },
    body: JSON.stringify({ email: "mitarbeiter@example.com", password: "geheim123" })
  });
  const response = await login({ request });
  assert.equal(response.status, 403);
});

test("password changes require a valid cookie session", async () => {
  let calls = 0;
  globalThis.fetch = async (_request, options) => {
    calls += 1;
    if (options.method === "GET") return jsonResponse({ id: "user-1", email: "mitarbeiter@example.com" });
    assert.equal(options.method, "PUT");
    assert.deepEqual(JSON.parse(options.body), { password: "neuesPasswort123" });
    return jsonResponse({ id: "user-1", email: "mitarbeiter@example.com" });
  };
  const request = new Request("https://upgrade-professionalisierung.wt-webapp.pages.dev/api/auth/password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://upgrade-professionalisierung.wt-webapp.pages.dev",
      Cookie: "wt_access=valid-token; wt_refresh=refresh-token"
    },
    body: JSON.stringify({ password: "neuesPasswort123" })
  });
  const response = await changePassword({ request });
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test("logout clears both session cookies", async () => {
  globalThis.fetch = async (_request, options) => {
    if (options.method === "GET") return jsonResponse({ id: "user-1", email: "mitarbeiter@example.com" });
    return new Response(null, { status: 204 });
  };
  const request = new Request("https://upgrade-professionalisierung.wt-webapp.pages.dev/api/auth/logout", {
    method: "POST",
    headers: {
      Origin: "https://upgrade-professionalisierung.wt-webapp.pages.dev",
      Cookie: "wt_access=valid-token; wt_refresh=refresh-token"
    }
  });
  const response = await logout({ request });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Set-Cookie"), /wt_access=/);
  assert.match(response.headers.get("Set-Cookie"), /wt_refresh=/);
  assert.match(response.headers.get("Set-Cookie"), /Max-Age=0/);
});
