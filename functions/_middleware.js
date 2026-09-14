import {
  appendClearedCookies,
  appendSessionCookies,
  authenticatedSession
} from "./_shared/auth.js";

const PUBLIC_PATHS = new Set([
  "/login",
  "/login.html",
  "/manifest.webmanifest",
  "/sw.js",
  "/favicon.ico"
]);

function isPublicPath(pathname) {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/assets/") || pathname.startsWith("/api/auth/");
}

function withSecurityHeaders(response, cacheControl) {
  const secured = new Response(response.body, response);
  secured.headers.set("Cache-Control", cacheControl);
  secured.headers.set("Referrer-Policy", "same-origin");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");
  return secured;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (isPublicPath(url.pathname)) {
    const response = await context.next();
    const noStore = url.pathname === "/login" || url.pathname === "/login.html" || url.pathname.startsWith("/api/auth/");
    return withSecurityHeaders(response, noStore ? "no-store" : "public, max-age=300");
  }

  const session = await authenticatedSession(context.request);
  if (!session) {
    if (context.request.method === "GET" || context.request.method === "HEAD") {
      const login = new URL("/login", url.origin);
      login.searchParams.set("return", `${url.pathname}${url.search}`);
      const headers = new Headers({ Location: login.toString(), "Cache-Control": "no-store" });
      appendClearedCookies(headers);
      return new Response(null, { status: 302, headers });
    }
    return new Response("Nicht angemeldet", { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const response = withSecurityHeaders(await context.next(), "private, no-store");
  if (session.refreshed) appendSessionCookies(response.headers, session);
  return response;
}
