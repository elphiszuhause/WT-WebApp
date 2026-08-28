const CACHE = "wt-formulare-v2.5";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/styles.css",
  "./assets/app.js",
  "./assets/WBS_Logo_WT.png",
  "./assets/WT_Logo_ohne_Slogan.png",
  "./assets/app-icon.svg",
  "./Bereiche/Abnahmen/bauherreneinweisung.html",
  "./Bereiche/Abnahmen/heizung-uebergabe.html",
  "./Bereiche/Personal/urlaubsantrag.html",
  "./Bereiche/Baustellenabwicklung/Regiearbeiten/anmeldung-regiearbeiten.html",
  "./Bereiche/Baustellenabwicklung/Druckproben/Gas/gas-druckprobe-trgi.html",
  "./Bereiche/Baustellenabwicklung/Druckproben/Heizung/heizung-dichtheit-wasser.html",
  "./Bereiche/Baustellenabwicklung/Druckproben/Heizung/heizung-dichtheit-luft-WT.html",
  "./Bereiche/Baustellenabwicklung/Druckproben/Sanitär/sanitaer-dichtheit-luft.html",
  "./Bereiche/Baustellenabwicklung/Einregulierung/Lüftung/lueftung-einregulierung.html",
  "./Bereiche/Wartungsanweisungen/Gas-Heizung/gastherme-wartung.html",
  "./Bereiche/Wartungsanweisungen/Gas-Heizung/Gastherme_Wartungsprotokoll.pdf",
  "./Bereiche/Wartungsanweisungen/Gas-Heizung/Gastherme_Wartungsprotokoll.docx"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
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
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
        return response;
      });
      return cached || network.catch(() => caches.match("./index.html"));
    })
  );
});
