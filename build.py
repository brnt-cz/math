#!/usr/bin/env python3
"""Sestaví index.html ze zdrojového fragmentu + <head>.

src/matika.html neobsahuje <html>/<head>/<body> — v této podobě se publikuje
jako Artifact, kde obálku doplňuje hostitel. Tady ji dolepíme, aby stránka
fungovala i jako samostatný soubor.

    python3 build.py [src/matika.html]
"""

import hashlib
import json
import re
import subprocess
import sys
import urllib.parse
from pathlib import Path

TOP = "matrix(1,.5,-1,.5,16,0)"
LEFT = "matrix(1,.5,0,1,0,8)"
RIGHT = "matrix(1,-.5,0,1,16,16)"


def face(mat, base, pixels):
    out = ['<g transform="%s">' % mat, '<rect width="16" height="16" fill="%s"/>' % base]
    for color, cells in pixels:
        for u, v in cells:
            out.append('<rect x="%d" y="%d" width="4" height="4" fill="%s"/>' % (u, v, color))
    out.append("</g>")
    return "".join(out)


def favicon_href():
    """Dřevěná kostka — stejná prkna jako kostky ve zdi."""
    plank = (
        face(TOP, "#B08B54", [("#9E7A45", [(0, 4), (4, 4), (8, 4), (12, 4),
                                           (0, 12), (4, 12), (8, 12), (12, 12)])])
        + face(LEFT, "#9A7748", [("#89673B", [(0, 4), (4, 4), (8, 4), (12, 4)]),
                                 ("#A58453", [(8, 0), (0, 8), (12, 12)])])
        + face(RIGHT, "#7E5C31", [("#6E4F29", [(0, 4), (4, 4), (8, 4), (12, 4)]),
                                  ("#8B6839", [(4, 0), (12, 8), (0, 12)])])
    )
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" '
           'shape-rendering="crispEdges">%s</svg>') % plank
    return "data:image/svg+xml," + urllib.parse.quote(svg, safe="/:=")


HEAD = """<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="description" content="Trénink počítání do 10 a do 20 – sčítání, odčítání, násobení a dělení s více čísly.">
<meta name="theme-color" content="#EEF2F8">
<link rel="icon" href="{favicon}">
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icon-192.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Matika">
"""

# Fonty si hostujeme sami — appka pak funguje offline i bez Google Fonts.
# Verze pro Artifact (src/matika.html) si nechává odkaz na CDN.
GF_LINKS = re.compile(
    r'<link rel="preconnect"[^>]*>\s*'
    r'<link rel="preconnect"[^>]*>\s*'
    r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^"]*">'
)

SW_REGISTER = """
<script>
if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
  addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () { /* nevadí */ });
  });
}
</script>
"""


def font_faces(here):
    """@font-face bloky na lokální woff2 (variabilní fonty, celý rozsah tuku)."""
    meta = json.loads((here / "fonts" / "fonts.json").read_text(encoding="utf-8"))
    out = ["<style>"]
    for f in meta:
        out.append(
            '@font-face{font-family:"%s";font-style:normal;font-weight:100 900;'
            'font-display:swap;src:url(fonts/%s) format("woff2");unicode-range:%s}'
            % (f["family"], f["file"], f["range"])
        )
    out.append("</style>")
    return "\n".join(out)


def icon_svg(pad):
    """Ikona: dřevěná kostka na světlém podkladu. pad = okraj pro maskable ikonu."""
    plank = (
        face(TOP, "#B08B54", [("#9E7A45", [(0, 4), (4, 4), (8, 4), (12, 4),
                                           (0, 12), (4, 12), (8, 12), (12, 12)])])
        + face(LEFT, "#9A7748", [("#89673B", [(0, 4), (4, 4), (8, 4), (12, 4)]),
                                 ("#A58453", [(8, 0), (0, 8), (12, 12)])])
        + face(RIGHT, "#7E5C31", [("#6E4F29", [(0, 4), (4, 4), (8, 4), (12, 4)]),
                                  ("#8B6839", [(4, 0), (12, 8), (0, 12)])])
    )
    edges = ('<g fill="none" stroke="#3A2A12" stroke-width="1" stroke-linejoin="miter">'
             '<path d="M16 0L32 8V24L16 32L0 24V8Z"/><path d="M0 8L16 16L32 8"/>'
             '<path d="M16 16V32"/></g>')
    scale = (32 - 2 * pad) / 32.0
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" '
            'shape-rendering="crispEdges">'
            '<rect width="32" height="32" fill="#EEF2F8"/>'
            '<g transform="translate(%s,%s) scale(%s)">%s%s</g>'
            '</svg>') % (pad, pad + 0.5 * pad, round(scale, 4), plank, edges)


def write_icons(here):
    """Vyžaduje rsvg-convert; ikony jsou v repu, takže tohle se pouští jen při změně."""
    jobs = [("icon-192.png", 192, 1), ("icon-512.png", 512, 1),
            ("icon-maskable-512.png", 512, 6)]
    tmp = here / "_icon.svg"
    for name, size, pad in jobs:
        tmp.write_text(icon_svg(pad), encoding="utf-8")
        subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size),
                        "-o", str(here / name), str(tmp)], check=True)
        print("%s: %d B" % (name, (here / name).stat().st_size))
    tmp.unlink()


def write_service_worker(here, assets, stamp):
    """Precache celé appky; jméno cache se mění s obsahem, takže se sama obnoví."""
    sw = """/* Vygenerováno build.py — needituj tady. */
var CACHE = "matika-%s";
var ASSETS = %s;

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
""" % (stamp, json.dumps(assets, ensure_ascii=False))
    (here / "sw.js").write_text(sw, encoding="utf-8")


def main():
    here = Path(__file__).parent

    if "--icons" in sys.argv:
        write_icons(here)
        return

    source = Path(sys.argv[1]) if len(sys.argv) > 1 else here / "src" / "matika.html"
    fragment = source.read_text(encoding="utf-8")
    split = fragment.index('<svg class="blk-defs"')   # konec <head> částí, začátek těla

    out = (HEAD.format(favicon=favicon_href())
           + fragment[:split]
           + "</head>\n<body>\n"
           + fragment[split:]
           + "</body>\n</html>\n")

    out = GF_LINKS.sub(font_faces(here), out, count=1)
    out = out.replace("</body>", SW_REGISTER + "</body>", 1)

    target = here / "index.html"
    target.write_text(out, encoding="utf-8")

    assets = ["./", "index.html", "manifest.json",
              "icon-192.png", "icon-512.png", "icon-maskable-512.png"]
    assets += ["fonts/" + f["file"] for f in
               json.loads((here / "fonts" / "fonts.json").read_text(encoding="utf-8"))]
    stamp = hashlib.sha1(out.encode("utf-8")).hexdigest()[:10]
    write_service_worker(here, assets, stamp)

    print("index.html: %d B, sw.js cache matika-%s" % (len(out.encode("utf-8")), stamp))


if __name__ == "__main__":
    main()
