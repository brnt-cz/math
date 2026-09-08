/* Vygenerováno build.py — needituj tady. */
var CACHE = "matika-3c05e03e1a";
var ASSETS = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "fonts/baloo-2-latin-ext.woff2", "fonts/baloo-2-latin.woff2", "fonts/lexend-latin-ext.woff2", "fonts/lexend-latin.woff2"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      return k === CACHE ? null : caches.delete(k);
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  // navigace: offline vrátíme uloženou stránku
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(function () {
      return caches.match("index.html").then(function (r) { return r || caches.match("./"); });
    }));
    return;
  }

  e.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    });
  }));
});
