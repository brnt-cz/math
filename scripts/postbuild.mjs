/**
 * Po buildu dorovná to, co Vite neumí:
 *
 *   dist/index.html        doplní faviconu (dřevěná kostka z cube.mjs jako inline SVG)
 *   dist/sw.js             service worker s precache podle skutečných jmen assetů
 *   artifact/matika.html   jeden soubor s inlinovaným JS a CSS, bez obálky,
 *                          fonty z CDN → publikování jako Claude Artifact
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { faviconHref } from "./cube.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

/* ---------- service worker ---------- */

function serviceWorker(assets, stamp) {
  return `/* Vygenerováno scripts/postbuild.mjs — needituj tady. */
var CACHE = "matika-${stamp}";
var ASSETS = ${JSON.stringify(assets)};

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
`;
}

/* ---------- Artifact: jeden soubor bez obálky ---------- */

const GOOGLE_FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Lexend:wght@400;500;600&display=swap">';

async function artifact(css, js) {
  // fragment nemůže odkazovat na lokální soubory, takže lokální fonty ven a CDN dovnitř
  const withoutFontFaces = css.replace(/@font-face\{[^}]*\}/g, "");

  return `<title>Matika do dvaceti</title>
${GOOGLE_FONTS}
<style>
${withoutFontFaces}
</style>

<div id="app"></div>

<script type="module">
${js}
</script>
`;
}

/* ---------- běh ---------- */

const html = await readFile(join(dist, "index.html"), "utf8");
const files = await readdir(join(dist, "assets"));

const jsName = files.find((f) => f.endsWith(".js"));
const cssName = files.find((f) => f.endsWith(".css"));
if (!jsName || !cssName) throw new Error("v dist/assets chybí JS nebo CSS");

// 1) favicona do index.html
const withIcon = html.replace(
  /<link rel="manifest"/,
  `<link rel="icon" href="${faviconHref()}">\n<link rel="manifest"`,
);
await writeFile(join(dist, "index.html"), withIcon, "utf8");

// 2) service worker
const assets = [
  "./",
  "index.html",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  ...files.map((f) => `assets/${f}`),
];
/*
 * Jméno cache musí odpovídat **obsahu** všech předcachovaných souborů, ne jen jejich
 * jmen. Assety mají hash v názvu, ale ikony a manifest ne — když se změnila jen ikona,
 * jméno cache zůstalo stejné, service worker se nepřeinstaloval a lidem by zůstala
 * stará ikona v cache.
 */
const bytes = await Promise.all(
  assets.filter((a) => a !== "./").map((a) => readFile(join(dist, a))),
);
const digest = createHash("sha1");
digest.update(withIcon);
for (const b of bytes) digest.update(b);
const stamp = digest.digest("hex").slice(0, 10);
await writeFile(join(dist, "sw.js"), serviceWorker(assets, stamp), "utf8");

// 3) Artifact
const css = await readFile(join(dist, "assets", cssName), "utf8");
const js = await readFile(join(dist, "assets", jsName), "utf8");
await mkdir(join(root, "artifact"), { recursive: true });
await writeFile(join(root, "artifact", "matika.html"), await artifact(css, js), "utf8");

const kb = (s) => `${(Buffer.byteLength(s) / 1024).toFixed(1)} kB`;
console.log(`dist/index.html   ${kb(withIcon)}`);
console.log(`dist/sw.js        precache ${assets.length} položek, cache matika-${stamp}`);
console.log(`artifact/matika.html  ${kb(await readFile(join(root, "artifact", "matika.html"), "utf8"))}`);
