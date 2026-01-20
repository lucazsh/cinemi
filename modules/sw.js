const CACHE_NAME = "pwa-cache-v1";
const URLS_TO_CACHE = [
  "/cinemi/index.html",
  "/cinemi/icons/icon-192.png",
  "/cinemi/icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .catch(err => console.error("Cache error", err))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
