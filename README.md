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

Verze pro Claude Artifact (`artifact/matika.html`) je jeden soubor s inlinovaným JS
a CSS, bez obálky `<html>/<head>/<body>` — a fonty si bere z Google CDN, protože
fragment nemůže odkazovat na lokální soubory.

## Struktura

    app/                   zdroj: Vue 3 + TypeScript
      index.html           šablona pro Vite
      src/lib/             čistá logika bez DOM — tady jsou testy
        blocks.ts          druhy kostek, vážená vzácnost, hash, stacky
        generator.ts       příklady: bloky, priorita × ÷, rozsah, přes desítku
        chest.ts           truhly: plnění po 50, 64 na políčko, kdy přistavit další
        wall.ts            mřížka zdi: řady/sloupce, skokové zmenšení s hysterezí
        inventory.ts       stavění: zásoba = nasbírané − na ploše, položit/vzít/přesunout
        storage.ts         localStorage včetně migrace starých formátů
      src/composables/     useGame (stav a kolo příkladů), useSideLayout, usePointerTip
      src/components/      SetupPanel, TaskSheet, Keypad, RoundProgress, RoundDone,
                           BrickWall, ChestColumn, BuildArea, BlockSprite, BlockDefs
      src/styles/app.css   CSS přenesené doslova z první verze
      src/assets/fonts/    woff2 (Vite je hashuje)
      public/              manifest.json a ikony
    dist/                  build — tohle se nasazuje (commituje se)
    artifact/matika.html   build pro publikování jako Claude Artifact (commituje se)
    scripts/postbuild.mjs  favicona, sw.js s precache, artifact
    tests/                 vitest — 40 testů logiky
    tasks/                 plány, průběh a lekce

## Sestavení a nasazení

```bash
npm install
npm run dev      # vývoj na localhostu
npm test         # 40 testů logiky, bez prohlížeče
npm run build    # kontrola typů + vite build + postbuild → dist/ a artifact/matika.html
```

Nasazení je kopie souborů. `--delete` je poprvé potřeba, aby ze serveru zmizely
soubory staré verze (assety mají v názvu hash, jinak by se tam vršily):

```bash
rsync -az --delete dist/ pi:/www/matika/
```

`dist/` i `artifact/matika.html` jsou v repu commitnuté schválně, aby nasazení
nepotřebovalo build na serveru.

### Proč je CSS v jednom souboru

`app/src/styles/app.css` je CSS z první verze **doslova**. Pořadí pravidel je nosné:
bloky pro rozvržení musí zůstat za styly komponent, jinak je komponenty přebijí
(media query nezvyšuje specificitu). Rozdělovat to má smysl teprve s vizuálními testy.
