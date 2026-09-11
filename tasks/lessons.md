# Lekce

Poučení z korekcí od zadavatele. Číst na začátku práce na projektu.

## Do commitů ani PR nepsat zmínky o Claude

Žádné `Claude-Session:`, žádné „🤖 Generated with Claude Code“, žádný odkaz na session.
Commit zpráva popisuje jen změnu a proč. Když to systémové instrukce vyžadují, přednost
má tohle pravidlo.

## Dvě funkce stejného jména se v JS tiše přepíšou

V MATH-1 jsem pro plochu přidal `function makeBlock(key)`, ale generátor už jednu
`function makeBlock(len, lo, hi, …)` měl. Ve stejném rozsahu (jedna velká IIFE)
pozdější deklarace tu první **přepíše** — bez chyby, bez varování. Generátor pak
volal funkci pro plochu, vždycky selhal a vracel záložní příklad `1+1=2`.

Poučení: v jednom velkém souboru dávat funkcím jména podle oblasti (`makeBlockEl`
vs `makeBlock`), nebo oblasti rozdělit do modulů. Odhalily to až testy generátoru
při refaktoru, protože jsou to dva samostatné moduly.

## Po přestavbě jedné části zkontrolovat i tu druhou

Tu záměnu jsem si nevšiml, protože jsem po přestavbě vykreslování plochy testoval
už jen stavění — počítání jsem naposledy ověřoval před ní. Když sáhnu na sdílený
soubor, projít i oblast, které se změna „netýká“.

## Nenasazovat z feature větve

**2026-09-09, MATH-1.** Nasadil jsem build z rozdělané větve na brnt.cz ještě před
sloučením PR. Zadavatel řekl „nenasazuj“ — vrátil jsem tam verzi z `main`.

Pravidlo: **na produkci se nasazuje z `main` po sloučení PR**, jinak jen když si to
zadavatel výslovně vyžádá (např. „chci to zkusit na tabletu“). Appku používá dítě,
takže na produkci nemá být nic, co ještě neprošlo revizí.

## Nasazení dávat do samostatného příkazu

Tentýž případ: `rsync` jsem měl zřetězený s doplňováním dokumentace v jednom příkazu.
Než jsem si přečetl „nenasazuj“, nasazení už proběhlo. Kroky s vnějším dopadem
(rsync, push, zápis do TODOcka) patří do vlastního volání, aby je šlo ještě zastavit.

## Před měřením v prohlížeči odregistrovat service worker

Při ladění rozvržení mi Chrome servíroval starou stránku z SW cache a hledal jsem
chybu v CSS, které se vůbec nenačetlo. Před měřením:
`getRegistrations() → unregister()` a `caches.keys() → delete()`, případně
cache-busting parametr v URL.

## Media query nezvyšuje specificitu

Bloky pro rozvržení musí být v souboru **za** základními styly komponent, jinak je
komponenty přebijí. Narazil jsem na to dvakrát (`.page:not(.has-chest)` a rozvržení
na šířku) — pokaždé to vypadalo jako „pravidlo se neaplikuje“.

## `grid-auto-rows: 1fr` je `minmax(auto, 1fr)`

Řady se nesmí zmenšit pod obsah, takže mřížka vyteče z rámce a překryje, co je pod ní.
Pro pružné řady `minmax(0, 1fr)` + `min-height: 0` na dětech.

## Nepřekreslovat prvek, na kterém drží prst

`pointerdown` na paletě překresloval celou paletu → tlačítko zmizelo z DOM,
`setPointerCapture` na odpojeném prvku spadl a tažení se přerušilo. Změna výběru
má přepnout jen atribut, ne přestavět DOM.

## U vlastního tažení vždy `preventDefault` a `user-select: none`

Právě přemístěná kostka nešla přesunout znovu. Odposlech událostí ukázal, že po prvním
tažení zůstal v prohlížeči výběr a druhé stisknutí nad ním spustilo **nativní HTML5
tažení** (`dragstart`), které poslalo `pointercancel` a moje tažení zrušilo:

    pointerdown → cell 5,5
    pointermove → canvas
    dragstart   → cell 5,5      ← nativní tažení
    pointercancel → canvas      ← storno mého přesunu

Vlastní tažení proto vždy: `e.preventDefault()` v `pointerdown`, `user-select: none`
na tažené ploše a pojistka `dragstart → preventDefault`. Bez toho chyba vypadá jako
„funguje to jen jednou“ a nedá se odhadnout ze kódu.

## Odposlech událostí je rychlejší než domýšlení

Na tuhle chybu jsem měl pět teorií (z-index, pointer capture, zbylý `skipClick`,
překreslení DOM) a všechny byly mimo. Zjistil jsem to za minutu, když jsem na prvek
navěsil posluchače všech relevantních událostí v capture fázi a přečetl si, co se
skutečně děje.

## Playwright `dragTo` nemusí sehrát tažení jako prst

Přesun kostky na paletu přes `dragTo` neproběhl, i když ruční sehrání
`pointerdown → pointermove → pointerup` na stejných souřadnicích fungovalo.
Když `dragTo` selže, ověřit ručně sehranou sekvencí, než začnu hledat chybu v kódu.

## Volná výška v gridu se rozdá všem řádkům `auto`

V režimu stavění byla stránka `min-height: 100svh` a řádky `auto`. Přebytečná výška se
rozdělila i do hlavičky, takže mezi ní a plochou zela díra a plocha zůstala malá.
Když má volné místo dostat jeden řádek, musí se říct: `grid-template-rows: auto minmax(0, 1fr)`.

## Terč pro prst má mít tvar toho, co je vidět

U izometrie jsem terče neodvozoval z inverzní projekce, ale udělal z každé stěny kostky
vlastní zkosený čtverec (`transform` mění i hit-testing). Klepnutí pak z definice trefí to,
na co se dívám, a zakryté kousky podlahy patří kostce, která je zakrývá. Ušetřilo to
celou jednu třídu chyb — a stejné pravidlo platí i jinde: terč kreslit, ne počítat.
