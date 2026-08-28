const CACHE_NAME = "harusallim-app-v1";
const scopedUrl = (path) => new URL(path, self.registration.scope).toString();
const APP_SHELL = [
  scopedUrl("./"),
  scopedUrl("./manifest.webmanifest"),
  scopedUrl("./icons/icon-192.png"),
  scopedUrl("./icons/icon-512.png"),
  scopedUrl("./icons/icon-maskable-512.png"),
  scopedUrl("./icons/apple-touch-icon.png"),
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(scopedUrl("./"), copy));
          return response;
        })
        .catch(() => caches.match(scopedUrl("./"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.type === "basic") {
        const copy = response.clone();
        void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
