const AUTH_ENVIRONMENTS = {
  production: {
    url: "https://lvtcxdiyixblbufvxghy.supabase.co",
    key: "sb_publishable_MHbZSrecBpTgBsrwgjATSQ_vdk0v3wJ"
  },
  test: {
    url: "https://nqymmrovbkkbrzhljymx.supabase.co",
    key: "sb_publishable_KdrzuuZGHanPAeLNpQnNUw_7Ath9LoZ"
  }
};

const ACCESS_COOKIE = "wt_access";
const REFRESH_COOKIE = "wt_refresh";
const REFRESH_COOKIE_AGE = 60 * 60 * 24 * 7;

export function authEnvironment(request) {
  const hostname = new URL(request.url).hostname.toLowerCase();
  const isProduction = hostname === "wt-webapp.pages.dev" || hostname === "elphiszuhause.github.io";
  return AUTH_ENVIRONMENTS[isProduction ? "production" : "test"];
}

export function json(data, status = 200, headers = new Headers()) {
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { status, headers });
}

export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch (_) {
    return null;
  }
}

function parseCookies(request) {
  const cookies = {};
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name) continue;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch (_) {
      cookies[name] = value;
    }
  }
  return cookies;
}

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function appendSessionCookies(headers, session) {
  const accessAge = Math.max(60, Number(session.expires_in) || 3600);
  headers.append("Set-Cookie", cookie(ACCESS_COOKIE, session.access_token, accessAge));
  headers.append("Set-Cookie", cookie(REFRESH_COOKIE, session.refresh_token, REFRESH_COOKIE_AGE));
}

export function appendClearedCookies(headers) {
  headers.append("Set-Cookie", cookie(ACCESS_COOKIE, "", 0));
  headers.append("Set-Cookie", cookie(REFRESH_COOKIE, "", 0));
}

export async function supabaseRequest(request, path, options = {}) {
  const environment = authEnvironment(request);
  const headers = new Headers(options.headers || {});
  headers.set("apikey", environment.key);
  if (options.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${environment.url}/auth/v1/${path}`, {
    ...options,
    headers
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function userForAccessToken(request, accessToken) {
  if (!accessToken) return null;
  const result = await supabaseRequest(request, "user", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return result.ok ? result.data : null;
}

export async function authenticatedSession(request) {
  const cookies = parseCookies(request);
  const accessToken = cookies[ACCESS_COOKIE];
  const refreshToken = cookies[REFRESH_COOKIE];

  const user = await userForAccessToken(request, accessToken);
  if (user) {
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
      refreshed: false
    };
  }

  if (!refreshToken) return null;
  const refreshed = await supabaseRequest(request, "token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!refreshed.ok || !refreshed.data.access_token || !refreshed.data.refresh_token) return null;

  const refreshedUser = refreshed.data.user || await userForAccessToken(request, refreshed.data.access_token);
  if (!refreshedUser) return null;
  return { ...refreshed.data, user: refreshedUser, refreshed: true };
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email || ""
  };
}

export function authError(result, fallback = "Anmeldung fehlgeschlagen") {
  const message = result && result.data && (
    result.data.msg || result.data.message || result.data.error_description || result.data.error
  );
  return json({ error: message || fallback }, result && result.status >= 400 ? result.status : 400);
}
