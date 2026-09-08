# Matika do dvaceti

Trénink počítání pro prvňáka/druháka. Jedna statická stránka bez buildovacího řetězce
a bez závislostí (jediné externí zdroje jsou Google Fonts).

Živě: **https://brnt.cz/matika**

## Co to umí

- Rozsah **do 10** nebo **do 20**, 2–4 čísla v příkladu
- Znaménka jako zaškrtávátka: `+`, `−`, `×`, `÷` (libovolná kombinace)
- Priorita operací — `× ÷` se počítá před `+ −`, takže zápis je matematicky správný.
  Příklad se skládá z bloků (blok = jedno číslo nebo řetězec `× ÷`), které se pak sčítají
  a odčítají; přednost je tím zaručená konstrukcí, ne dodatečným parsováním.
- Mezivýsledky vždy celé číslo v rozsahu 1..max — žádné minus, žádné přetečení,
  dělení beze zbytku
- Po chybě příklad **zůstává**, dokud ho dítě nedopočítá; po třech omylech napoví
- Série 10 příkladů, hvězdičky, nejdelší řada napoprvé

## Gamifikace

- Správný výsledek přidá minecraftovou kostku do zdi, chyba jednu sundá
- Zeď roste odspodu; když sloupec dosáhne vrcholu stránky, začne nový vedle.
  Když je zeď plná, kostky se skokem zmenší — žádná nikdy nezmizí.
- Šest druhů kostek s váženou vzácností (drn 27 %, kámen 24, prkna 20, písek 15,
  netherrack 9, obsidián 5). Druh se počítá hashem z indexu kostky, takže je
  rozházený, ale po každém překreslení stejný.
- Každých 50 kostek se zeď uloží do truhly (co je v truhle, chyba už nesundá).
  Od stovky je z ní velká truhla. Další truhla se přistaví teprve když je předchozí
  úplně plná — 54 políček, tj. 3250 kostek.
- Kliknutí na truhlu otevře její inventář: mřížka 3 × 9 nebo 6 × 9, kostky stackované
  po druzích, max 64 na políčko
- Vše (nastavení, nejdelší série, zeď, truhly) drží v `localStorage`

Na displejích pod 480 px má hra celou šířku a zeď s truhlami se přesunou do pásu pod
klávesnici s menšími kostkami — příklady mají prioritu, gamifikace je vedlejší.

## PWA a offline

Appka jde přidat na plochu telefonu/tabletu a funguje **bez sítě**:

- `manifest.json` — standalone režim, ikony 192/512 + maskable
- `sw.js` — service worker, který si při první návštěvě uloží celou appku
  (stránku, ikony, fonty). Jméno cache obsahuje hash `index.html`, takže
  se po nasazení nové verze sama obnoví a stará cache se smaže.
- Fonty jsou **hostované u nás** (`fonts/*.woff2`, variabilní, podmnožiny
  latin + latin-ext kvůli diakritice) — offline tedy nechybí a nejde
  ani žádný požadavek na cizí server.

Verze pro Claude Artifact (`src/matika.html`) si naopak nechává odkaz na Google Fonts,
protože fragment nemůže odkazovat na lokální soubory.

## Struktura

    src/matika.html   zdroj — fragment bez <html>/<head>/<body>
    build.py          sestaví index.html: dolepí <head> (favicona jako inline SVG),
                      nahradí odkaz na Google Fonts lokálním @font-face,
                      přidá registraci service workeru a vygeneruje sw.js
    index.html        vygenerovaný výsledek, tohle se nasazuje
    sw.js             vygenerovaný service worker (needitovat ručně)
    manifest.json     PWA manifest
    fonts/            woff2 + fonts.json (rozsahy znaků pro @font-face)
    icon-*.png        ikony appky (generuje `build.py --icons`, potřebuje rsvg-convert)
    tasks/todo.md     průběh práce a ověření

## Sestavení a nasazení

```bash
python3 build.py            # src/matika.html → index.html + sw.js
python3 build.py --icons    # jen když se mění ikona

rsync -az index.html manifest.json sw.js icon-*.png pi:/www/matika/
rsync -az fonts/*.woff2 pi:/www/matika/fonts/
```

`index.html` i `sw.js` jsou v repu commitnuté schválně — nasazení je jen kopie souborů.
