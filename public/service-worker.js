/* ==========================================================================
   MealMate – service worker
   Caches static assets for offline/static use. Fails safe: if caching or
   fetch interception errors for any reason, requests just fall through to
   the network/browser instead of crashing the page.
   ========================================================================== */

var CACHE_NAME = "mealmate-cache-v2";
var ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(function () {
        // Caching failure should not block installation.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
        );
      })
      .catch(function () {})
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  // Network-first: always try to get the freshest HTML/CSS/JS when online,
  // and only fall back to the cached copy when the network fails (offline).
  // This avoids ever getting "stuck" showing an old cached version of the
  // app after a new deploy, which a plain cache-first strategy cannot
  // recover from until the cache name itself changes.
  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        if (response && response.status === 200 && response.type === "basic") {
          var responseClone = response.clone();
          caches
            .open(CACHE_NAME)
            .then(function (cache) {
              cache.put(event.request, responseClone);
            })
            .catch(function () {});
        }
        return response;
      })
      .catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || Promise.reject("no-cache-match");
        });
      })
  );
});
