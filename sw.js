const CACHE = "wt-formulare-v3.2";

const CORE = [
  "./",
  "./kategorien/druckpruefungen",
  "./kategorien/einregulierung",
  "./kategorien/abnahmen",
  "./kategorien/weitere-formulare",
  "./kategorien/wartungsanweisungen",
  "./manifest.webmanifest",
  "./assets/styles.css",
  "./assets/app.js",
  "./assets/WBS_Logo_WT.png",
  "./assets/WT_Logo_ohne_Slogan.png",
  "./assets/app-icon.svg",
  "./Bereiche/Abnahmen/bauherreneinweisung",
  "./Bereiche/Abnahmen/heizung-uebergabe",
  "./Bereiche/Personal/urlaubsantrag",
  "./Bereiche/Baustellenabwicklung/Regiearbeiten/anmeldung-regiearbeiten",
  "./Bereiche/Baustellenabwicklung/Druckproben/Gas/gas-druckprobe-trgi",
  "./Bereiche/Baustellenabwicklung/Druckproben/Heizung/heizung-dichtheit-wasser",
  "./Bereiche/Baustellenabwicklung/Druckproben/Heizung/heizung-dichtheit-luft-WT",
  "./Bereiche/Baustellenabwicklung/Druckproben/Sanitaer/sanitaer-dichtheit-luft",
  "./Bereiche/Baustellenabwicklung/Einregulierung/Lueftung/lueftung-einregulierung",
  "./Bereiche/Wartungsanweisungen/Gas-Heizung/gastherme-wartung"
];

function canonicalNavigationUrl(input) {
  const url = new URL(input);
  if (url.pathname.endsWith("/index.html")) {
    url.pathname = url.pathname.slice(0, -"index.html".length);
  } else if (url.pathname.endsWith(".html")) {
    url.pathname = url.pathname.slice(0, -".html".length);
  }
  return url;
}

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

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const canonical = canonicalNavigationUrl(event.request.url);
        return (await caches.match(canonical.toString())) || caches.match("./");
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
        return response;
      });
      return cached || network;
    })
  );
});
