/* Basic offline shell caching for Compress It Small */
const CACHE = "cis-shell-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/assets/style.css",
  "/assets/retention.js",
  "/favicon_192x192.png",
  "/favicon_32x32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k === CACHE ? null : caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET") return;
  // Only same-origin caching
  if (url.origin !== location.origin) return;
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      // Cache successful GET responses for navigations and static assets
      if (res && res.ok && (req.destination === "document" || req.destination === "style" || req.destination === "script" || req.destination === "image")) {
        const copy = res.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
      }
      return res;
    }).catch(() => cached || caches.match("/index.html")))
  );
});