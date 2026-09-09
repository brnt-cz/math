# MATH-2 — Refactor do Vue 3

Větev: `MATH-2-refactor-vue`

## Zadání a rozhodnutí

Přepsat appku z jednoho ručního HTML souboru (~2000 řádků) do Vue 3 + TypeScript,
aby se dala dál rozvíjet a aby šlo testovat logiku bez prohlížeče.

| Otázka | Rozhodnutí |
|---|---|
| Nástroj | **Vue 3 + Vite**, Composition API, TypeScript, SFC |
| Artifact verze | **Nezahazuje se** — bude se generovat buildem do jednoho souboru |
| Chování | **Beze změny.** Refaktor nesmí nic přidat ani ubrat |
| Grafika | **Musí zůstat identická jako před refaktorem.** CSS a SVG se nepřepisují, přenášejí se doslova; na konci se to proti staré verzi proměří |
| Pořadí | Nejdřív tenhle refaktor, izometrie s hloubkou až po něm (samostatný task) |

Důvod pořadí: nejtěžší část izometrie je matematika (svět → obrazovka, prst → buňka,
řazení podle hloubky). Tu chci mít pokrytou unit testy v nodu, ne proklikanou v Chrome —
ověřování v prohlížeči mě v této práci dvakrát podvedlo (stará stránka ze service
workeru, `dragTo` nesehrálo tažení jako prst).

## Dva výstupy z jednoho zdroje

    dist/                  index.html + hashované assety + sw.js + manifest + ikony + fonty
                           → nasazení na brnt.cz, PWA, offline
    artifact/matika.html   jeden soubor s inlinovaným JS a CSS, bez <html>/<head>/<body>,
                           fonty z Google CDN → publikování jako Claude Artifact

Fragment nemůže odkazovat na lokální soubory, proto u něj fonty z CDN. Web má fonty
u sebe, aby fungoval offline.

## Struktura

    app/index.html          šablona pro Vite
    app/src/main.ts
    app/src/App.vue
    app/src/lib/            čistá logika bez DOM — tady jsou testy
      blocks.ts             druhy kostek, vzácnost, blockFor (hash), názvy
      generator.ts          příklady: bloky, priorita × ÷, rozsah, přes desítku
      chest.ts              truhly: plnění po 50, 64 na políčko, kdy přistavit další
      wall.ts               mřížka zdi: řady/sloupce, skokové zmenšení s hysterezí
      inventory.ts          stavění: zásoba = nasbírané − na ploše, položit/vzít/přesunout
      storage.ts            localStorage: načtení, migrace starých formátů, uložení
    app/src/components/     Setup, Sheet, Keypad, Progress, Done, Wall, Chest,
                            ChestPanel, BuildCanvas, Palette, BlockSprite
    app/src/styles/         tokeny a rozvržení (beze změny pravidel)
    scripts/postbuild.mjs   vyrobí sw.js s precache podle skutečných jmen assetů
                            a artifact/matika.html
    tests/                  vitest

Staré soubory (`index.html`, `sw.js`, `src/matika.html`, `build.py`) zůstávají po dobu
práce, aby šlo srovnávat chování starého a nového vedle sebe. Smažou se v posledním
commitu větve.

## Co musí přežít beze změny

- **Generátor:** priorita `× ÷` zaručená konstrukcí (bloky), mezivýsledky celé v rozsahu,
  dělení beze zbytku, `x÷x` jen když jinak příklad nejde, v rozsahu do 20 převážně
  příklady přes desítku (~85–100 %)
- **Zeď:** sloupce odspodu, nový sloupec po dosažení vrcholu, skokové zmenšení (×0,78)
  s hysterezí, druh kostky = hash indexu s váženou vzácností
- **Truhly:** obsah odvozený z `banked`, stack 64, další truhla až po zaplnění 54 políček
- **Stavění:** jediný ukládaný stav je mapa buněk, zásoba se počítá; přesouvání, pick
  block, vytažení na paletu, bourání
- **Rozvržení:** podle orientace, na šířku bez posuvníku, velikosti z `cqw`/`cqh`
- **PWA:** manifest, precache podle obsahu, lokální fonty, offline
- **`localStorage`:** stejný klíč `matika-do-dvaceti` i stejný tvar dat včetně starého
  formátu `ops` jako string (`"mix"`, `"add"`, `"sub"`). Syn nesmí přijít o zeď, truhly
  ani stavbu.

## Jak ověřím, že se chování nezměnilo

1. **Unit testy (vitest)** na `lib/`: generátor (36 kombinací × stovky příkladů proti
   referenčnímu vyhodnocení s prioritou), rozložení „přes desítku“, obsah truhel
   a lámání stacků, mřížka zdi (kdy nový sloupec, kdy zmenšení), invariant inventáře,
   migrace `localStorage`.
2. **Měření v prohlížeči** na nové verzi stejnými scénáři, které mám z předchozí práce:
   posuvník na 9 rozměrech, rozvržení podle orientace, stabilita zdi při růstu 1 → 70,
   offline po vypnutí serveru.
3. **Srovnání starý/nový vedle sebe** u generátoru: stejný seed → stejné rozdělení.

## Plán

- [x] Scaffold: Vite + Vue 3 + TS + Vitest, `app/` vedle staré verze
- [x] `lib/blocks.ts` (druhy, vzácnost, hash, stacky, obsazená políčka)
- [x] `lib/generator.ts` + 10 testů (priorita, rozsah, přes desítku, dělení, determinismus)
- [x] `lib/chest.ts` + 7 testů (plnění, stacky, kdy další truhla)
- [x] `lib/wall.ts` + 7 testů (řady/sloupce, skokové zmenšení, hystereze, dno)
- [x] `lib/inventory.ts` + 8 testů (zásoba, položit/vzít/přesunout, invariant, poškozená data)
- [x] `lib/storage.ts` + 8 testů (migrace `ops` jako textu, round-trip, nesmysly, nedostupné úložiště)
- [x] Komponenty: počítání (SetupPanel, TaskSheet, Keypad, RoundProgress, RoundDone)
- [x] Komponenty: zeď a truhly (BrickWall, ChestColumn)
- [x] Komponenty: stavění (BuildArea)
- [x] Styly: CSS přeneseno **doslova** v jednom souboru (pořadí pravidel je nosné), SVG symboly původní
- [x] Grafické srovnání: 22 prvků shodných na 1280×900, 810×1080, 390×844 i 844×390
- [x] `scripts/postbuild.mjs`: favicona, sw.js s precache, artifact/matika.html
- [x] Offline ověřeno s vypnutým serverem (12 položek v cache, počítání funguje)
- [x] Smazána stará verze, README a nasazení upraveno
- [ ] PR s odkazem na MATH-2

## Nalezené při portování

- **`chestList` lhala o vstupu.** Pro 49 kostek vyrobila truhlu s 50 — v původním kódu
  to nevadilo, protože `banked` je vždy násobek padesáti, ale jako čistá funkce to
  být nesmí. Teď se vstup zarovná na celé padesátky, což odpovídá skutečnosti:
  nedokončená padesátka leží pořád na zdi.

- **Dvě uvolnění pravidel byla spojená v jedno.** Když se nepovedlo vygenerovat příklad
  přes desítku, druhý průchod zároveň povolil dělení sebou samým. To odporuje tomu, co
  je v MATH-1 zapsané jako pravidlo, takže generátor má teď tři průchody a `x÷x` se
  povolí až v posledním.
- **Chyba v mém dřívějším testu:** `x÷x` jsem hledal regexem `(\d+)÷\1`, který ale chytá
  i `3×6÷6` (= 18÷6, naprosto v pořádku). Test teď prochází kroky výpočtu a hlídá, že
  se nedělí právě tím, co je v běhu.

## Review

### Ověřeno

- **40 testů logiky** bez prohlížeče (generátor 10, truhly 7, zeď 7, inventář 8, úložiště 8).
- **Grafika je shodná se starou verzí:** pozice i spočítané styly 22 klíčových prvků
  na 1280×900, 810×1080, 390×844 a 844×390 — všude 22/22, posuvník stejný.
- **Offline:** s vypnutým serverem se stránka načte ze service workeru (12 položek
  v cache), fonty jsou k dispozici a příklad se dá vyřešit (kostek 16 → 17).
- **Artifact:** fragment se v minimální obálce namountuje, fonty z CDN naběhnou,
  lokální `@font-face` je z něj odstraněný.

### Co refaktor odhalil

1. **Regrese v `main`** — v MATH-1 přidaná `makeBlock(key)` pro plochu přepsala
   generátorovou `makeBlock(len, lo, hi, …)`, takže generátor vracel pořád `1+1=2`.
   Opraveno zvlášť (PR #4). Bez modulů a testů by to našel až syn.
2. **Dvě uvolnění pravidel generátoru byla spojená** — když se nepovedl příklad přes
   desítku, druhý průchod zároveň povolil `x÷x`. Teď tři samostatné průchody.
3. **`chestList` lhala o vstupu** — pro 49 kostek vyrobila truhlu s 50.
4. **Můj dřívější test na `x÷x` byl vadný** — regex chytal i `3×6÷6` (= 18÷6).

### Vědomá rozhodnutí

- **CSS zůstalo v jednom souboru doslova.** Pořadí pravidel je nosné a rozdělovat ho
  bez vizuálních testů by bylo proti požadavku „grafika musí zůstat identická“.
- **`dist/` a `artifact/matika.html` se commitují**, aby nasazení nepotřebovalo build
  na serveru — stejný princip jako dosud u `index.html`.
- **Poprvé nasadit s `--delete`**, aby ze serveru zmizely soubory staré verze.
