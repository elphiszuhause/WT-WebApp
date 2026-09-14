const CACHE = "wt-public-shell-v4.0";

const CORE = [
  "./login",
  "./manifest.webmanifest",
  "./assets/styles.css",
  "./assets/auth.js",
  "./assets/WT_Logo_ohne_Slogan.png",
  "./assets/app-icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) return;
  const publicUrls = new Set(CORE.map(path => new URL(path, self.registration.scope).href));
  if (!publicUrls.has(event.request.url)) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
