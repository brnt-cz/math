/* Vygenerováno scripts/postbuild.mjs — needituj tady. */
var CACHE = "matika-344881adba";
var ASSETS = ["./","index.html","manifest.json","icon-192.png","icon-512.png","icon-maskable-512.png","assets/baloo-2-latin-B_TVFhwJ.woff2","assets/baloo-2-latin-ext-Dz43yst_.woff2","assets/index-DNRZZyLa.js","assets/lexend-latin-ci0D1wrL.woff2","assets/lexend-latin-ext-B6JQhE1e.woff2","assets/style-DJ24IWdR.css"];

self.addEventListener("install", function (e) {
  // cache: "reload" obchází HTTP cache prohlížeče, aby se nepředcachovala stará verze
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(ASSETS.map(function (u) {
      return fetch(new Request(u, { cache: "reload" })).then(function (r) {
        return r && r.ok ? c.put(u, r) : null;
      });
    }));
  }).then(function () { return self.skipWaiting(); }));
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
