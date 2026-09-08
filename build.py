#!/usr/bin/env python3
"""Sestaví index.html ze zdrojového fragmentu + <head>.

src/matika.html neobsahuje <html>/<head>/<body> — v této podobě se publikuje
jako Artifact, kde obálku doplňuje hostitel. Tady ji dolepíme, aby stránka
fungovala i jako samostatný soubor.

    python3 build.py [src/matika.html]
"""

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
"""


def main():
    here = Path(__file__).parent
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else here / "src" / "matika.html"
    fragment = source.read_text(encoding="utf-8")
    split = fragment.index('<svg class="blk-defs"')   # konec <head> částí, začátek těla

    out = (HEAD.format(favicon=favicon_href())
           + fragment[:split]
           + "</head>\n<body>\n"
           + fragment[split:]
           + "</body>\n</html>\n")

    target = Path(__file__).with_name("index.html")
    target.write_text(out, encoding="utf-8")
    print("index.html: %d B" % len(out.encode("utf-8")))


if __name__ == "__main__":
    main()
