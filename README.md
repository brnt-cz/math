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
- V rozsahu **do 20** se generují převážně příklady, které přejdou přes desítku
  (~85–100 % podle nastavení); pod deseti zůstane jen každý pátý, ať to není samá
  jednoduchá matematika
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

Rozvržení se řídí orientací, ne jen šířkou: **na výšku** má hra celou šířku a zeď
s truhlami jsou v pásu pod klávesnicí (na tabletu s většími kostkami), **na šířku**
se přesunou do svislého pruhu vpravo. Příklady mají prioritu, gamifikace je vedlejší.

**Na šířku se celá appka vejde do okna bez posuvníku** — stránka má výšku `100svh`
a o zbylou výšku se dělí sešit s klávesnicí (`flex` + `grid-auto-rows: 1fr`), takže
klávesnice je na Full HD velká a na nízkém okně menší, ale vždy celá vidět. Velikost
písma na tlačítkách se počítá z výšky sloupce (`cqh`). Na velmi nízkém okně (telefon
na šířku) se nastavení srovná do jednoho řádku bez popisků.

Na výšku se bez posuvníku vejdou tablety; na telefonu je vidět celá hra a scrolluje
se jen k pásu s kostkami.

## PWA a offline

Appka jde přidat na plochu telefonu/tabletu a funguje **bez sítě**:

- `manifest.json` — standalone režim, ikony 192/512 + maskable, obě orientace
- `sw.js` — service worker, který si při první návštěvě uloží celou appku
  (stránku, ikony, fonty). Jméno cache obsahuje hash `index.html`, takže
  se po nasazení nové verze sama obnoví a stará cache se smaže. Precache jde
  přes `cache: "reload"`, aby se neuložila verze z HTTP cache prohlížeče.
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
