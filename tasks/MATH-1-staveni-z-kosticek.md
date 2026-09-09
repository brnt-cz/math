# MATH-1 — Stavění z kostiček

> Promyslet přepínač, který zobrazí nějaký „canvas", kam se budou moci kostičky z truhly
> přesunout myší/prstem a něco z nich postavit.

Větev: `MATH-1-staveni-z-kosticek`

## Rozhodnutí (odsouhlasená se zadavatelem)

| Otázka | Rozhodnutí |
|---|---|
| Vztah k truhle | Kostky se z truhly **ubírají a jde je vrátit** — truhla je skutečný inventář |
| Geometrie | **Jedna vrstva** (ne izometrické 3D s hloubkou, ne volné pokládání), ale vykreslená jako 2,5D stoh — řady se překrývají o čtvrtinu kostky, aby mezi nimi nebyly mezery |
| Kdy odemknout | Až je **první truhla doslova plná** — všech 54 políček (~3250 kostek) |
| Rozsah | Celé: mřížka + paleta + bourání |

Zadavatel byl upozorněn, že 3250 kostek je ~325 kol po deseti příkladech (měsíce hraní),
a rozhodl se tak vědomě — je to dlouhodobá trofej.

## Návrh

### Odemčení

Přepínač `Počítání / Stavění` v hlavičce. Do odemčení je **vidět, ale zamčený**
s ukazatelem postupu (`🔒 Stavění · 1240 / 3250`), aby se z neviditelné funkce stal
viditelný cíl.

Podmínka se **nepočítá z konstanty**, ale z toho, že první truhla má obsazených všech
54 políček — tedy přesně to pravidlo, které už dnes rozhoduje o přistavení druhé truhly.
Přesné číslo tím plyne z rozložení druhů kostek (~3250).

Zadní vrátka pro rodiče: `?stavet` v URL odemkne přepínač pro danou návštěvu.
Pro dítě neviditelné, slouží i k testování.

### Stav a invariant

Dnes je obsah truhly celý **odvozený** z jednoho čísla `banked` (druh kostky = hash
jejího indexu), nikde se neukládá. Stavění je první funkce, která potřebuje skutečný
inventář — ale i tady se držíme jednoho zdroje pravdy:

    build   { "x,y": typ }        ← jediný nový ukládaný stav
    nasbírané(typ) = z banked přes blockFor()   (jako dosud)
    v truhle(typ)  = nasbírané(typ) − počet buněk s tímto typem v build

`taken` se **záměrně neukládá** — počítá se z `build`. Tím nemůže vzniknout rozpor mezi
dvěma čísly a poškozený `localStorage` se sám srovná.

Invariant k otestování: *pro každý druh platí `v truhle + na canvasu = nasbírané`* —
žádná kostka nesmí vzniknout ani zmizet.

### Mřížka a vykreslení

Pevná logická mřížka **16 × 12** (192 buněk). Pevná schválně: stavba postavená na tabletu
se stejně zobrazí na telefonu.

Kostky se kladou do jedné vrstvy, ale **kreslí se jako stoh** — rozteč řady je
`0,75 × šířka kostky`, takže se řady o čtvrtinu překrývají a mezi kostkami nejsou mezery
(stejný trik, jaký drží pohromadě zeď). Vyšší řada kreslí přes spodní (`z-index` roste
zdola nahoru).

Kostka je čtvercová a přečnívá nad svou řadu, proto je oddělená od terče pro prst:

    .cell  terč — výška = rozteč řady (0,75), terče se nepřekrývají, reaguje na prst
    .blk   kostka — čtvercová, přečnívá nahoru, `pointer-events: none`

Díky tomu zůstává trefování buňky přesné i při překrývajícím se vykreslení. Klepnutí na
viditelnou horní čtvrtinu kostky spadá do terče nad ní — při bourání se proto sundá
kostka pod ním, což odpovídá tomu, na co člověk míří.

Výška plochy je `(řady − 1) × 0,75 + 1` kostky, velikost buňky se počítá z toho.

### Ovládání

Samotné přetahování je pro dítě na dotyku nepřesné, takže dvojkolejně:

1. **tažení z palety na buňku** (Pointer Events, myš i prst) — jak je v zadání
2. po položení zůstane druh vybraný → **další buňky jde jen klepat**
3. **režim bourání** (přepínač) — klepnutí na kostku ji vrátí do truhly

Paleta = druhy z truhly se zbývajícími počty, vizuálně navazuje na dnešní inventář.
Vybraný druh, kterého je 0, se nedá položit.

### Rozvržení

V režimu stavění se skryje hra (nastavení, sešit, klávesnice, puntíky) i pruh se zdí
a truhlami — canvas a paleta zabírají celou stránku. Pravidlo „na šířku bez posuvníku"
platí dál: canvas je pružný, paleta má pevnou výšku.

### Struktura kódu

`src/matika.html` má ~1800 řádků a musí zůstat jeden soubor (publikuje se jako Artifact).
Stavění bude proto samostatná, jasně oddělená sekce s malým rozhraním k okolí:

    buildAvailable()      → je odemčeno?
    enterBuild()/exit()   → přepnutí režimu
    stock(typ)            → kolik zbývá v truhle
    place(x,y,typ) / take(x,y)

Zbytek appky se nedotkne ničeho z vnitřností stavění.

## Plán

- [x] Stav: `build` v localStorage, `stock()` z `banked` − obsazené buňky
- [x] Odemčení: první truhla plná (54 políček) + `?stavet` pro rodiče
- [x] Přepínač v hlavičce včetně zamčeného stavu s postupem
- [x] Canvas: mřížka 16 × 12, sprity kostek, buňky reagující na dotyk
- [x] Paleta: druhy z truhly se zbývajícími počty, výběr druhu
- [x] Pokládání: tažení z palety (pointer events) + klepání dalších buněk
- [x] Bourání: přepínač, vrácení kostky do truhly
- [x] Persistence: stavba přežije zavření stránky
- [x] Rozvržení: bez posuvníku na šířku, použitelné na telefonu i tabletu
- [x] Ověření invariantu: `v truhle + na canvasu = nasbírané` pro všechny druhy
- [x] Vykreslení jako 2,5D stoh bez mezer (na žádost zadavatele po první verzi)
- [x] PR s odkazem na MATH-1 (**nenasazeno** — na produkci jde až po sloučení)

## Review

### Ověřeno

- **Invariant** `v truhle + na ploše = nasbírané` platí po pokládání i bourání
  (89 nasbíraných → 85 v truhle + 4 na ploše).
- **Mřížka** je přesná: 16 sloupců × 51 px, rozteč řady 38 px (0,75), plocha 816 × 472.
  Terče se nepřekrývají, kostky ano — proto to drží bez mezer.
- **Odemčení** podle `banked`: 0 → přepínač schovaný, 50 → `🔒 Stavění 6/27`,
  300 → `🔒 Stavění 8/54`, 3300 → odemčeno. `?stavet` odemkne i při 300.
- **Tažení** z palety na buňku funguje skutečnými pointer eventy (Playwright `dragTo`):
  kostka se položí, ubere se z truhly, duch i nápověda buňky se uklidí.
- **Rozvržení bez posuvníku** v režimu stavění: telefon na výšku (buňka 21 px,
  plocha 336 × 194), tablet i desktop 51 px. Paleta se vejde na jeden řádek i na telefonu.
- **Invariant přes sérii operací:** po 6 položeních a 3 zbouráních zůstal součet
  `v truhle + na ploše` u všech šesti druhů nezměněný (89 / 64 / 66 / 51 / 20 / 10 = 300).
- **Bourání klepnutím na horní část kostky** sundá tu správnou (terč nad ní je prázdný,
  takže se použije kostka pod ním).
- **Persistence:** stavba přežije reload. Klepnutí na buňku bez vybraného druhu nic nedělá.
- **Bez regrese:** přepnutí tam a zpět vrátí hru, zeď i truhly; počítání dál funguje
  (`15+1+2=18` → „Správně! Kostka nahoru.“).

### Nalezené chyby (obě z vlastního kódu, opraveno)

1. **Vybrání druhu překreslovalo celou paletu** → tlačítko pod prstem zmizelo z DOM,
   `setPointerCapture` na odpojeném prvku spadl a tažení se přerušilo. Vybrání teď jen
   přepíná `aria-pressed` (`markPicked()`), paleta se překresluje až při změně počtů.
2. `setPointerCapture` je navíc v `try/catch` — bez zachycení se tažení degraduje
   na klepání místo aby spadlo.
3. **Chyba v mém testu, ne v kódu:** invariant jsem nejdřív počítal proti zásobě v truhle
   místo proti celkovému počtu, takže kostky už ležící na ploše se počítaly dvakrát.
   Správný test je, že se součet `v truhle + na ploše` nemění.

### Vědomá omezení

- **Na telefonu je buňka 21 px**, protože pevná mřížka 16 × 12 se musí vejít do šířky.
  Stavění je tedy především pro tablet a desktop. Pohodlné stavění na telefonu by
  chtělo buď menší mřížku jen pro telefony (stavba by pak nebyla stejná na všech
  zařízeních), nebo zvětšení s posouváním plochy — na to je potřeba samostatné zadání.
- **Režim se neukládá** — po otevření appky je vždy počítání. Záměrně: příklady mají
  prioritu a syn se do stavění musí kliknout sám.
- Sprite kostky byl na třech místech, teď je v jedné funkci `blockSprite()`.
