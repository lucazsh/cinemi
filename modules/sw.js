const CACHE_NAME = "cinemi";
const URLS_TO_CACHE = [
  "/cinemi/index.html",
  "/cinemi/icons/icon-192.png",
  "/cinemi/icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of URLS_TO_CACHE) {
      try {
        const res = await fetch(url, {cache: "no-store"});
        console.log("SW install fetch", url, res.status);
        if (res.ok) {
          await cache.put(url, res.clone());
        } else {
          console.warn("SW install: non-OK response, skipping", url, res.status);
        }
      } catch (err) {
        console.error("SW install: fetch failed for", url, err);
      }
    }
  })());
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
