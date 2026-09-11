# MATH-3: Izometrické stavění

Stavění z MATH-1 kreslí kostky do jedné svislé vrstvy (zeď zpředu). Cílem je skutečná
izometrie: kosočtverečná podlaha, hloubka i výška.

## Geometrie

SVG symboly kostek **už izometrické kostky jsou** — `viewBox 0 0 32 32`, tři stěny
přes `matrix(1,.5,-1,.5,16,0)` (horní), `matrix(1,.5,0,1,0,8)` (levá) a
`matrix(1,-.5,0,1,16,16)` (pravá). Hrana kostky je 16 jednotek, obal je čtverec 32×32.
Grafika se tedy nemění vůbec, mění se jen rozmístění:

    obal kostky (x, y, z):  left = (x − y + DEPTH − 1) · s/2
                            top  = (x + y) · s/4 − z · s/2 + (LEVELS − 1) · s/2

Směr pohledu je (1,1,1) — dva body splynou, právě když se liší o násobek (1,1,1).
Větší `x + y + z` je proto blíž k divákovi: **kreslit vzestupně podle součtu**.

## Plán

- [x] Založit task MATH-3 v TODOcku a větev
- [x] `lib/iso.ts` — čisté funkce: klíč buňky, projekce, hloubka, rozměr scény, stěny
- [x] `lib/inventory.ts` — buňky 3D, převod staré ploché stavby
- [x] Testy na `iso.ts` a doplnit testy inventáře
- [x] `BuildArea.vue` — podlaha, kostky podle hloubky, terče na stěnách, tažení
- [x] CSS pro scénu
- [x] Ověřit v prohlížeči na telefonu, tabletu i desktopu + přesnost klepnutí
- [x] `npm test`, `npm run build`, PR

## Ovládání

Terč pro prst je **samotná stěna**: kosočtverec pro horní, kosodélníky pro boční.
Co je vidět, na to se dá klepnout — a naopak, co kostka zakryje, patří jí.

| klepnutí | akce |
| --- | --- |
| podlaha | kostka na zem `(x, y, 0)` |
| horní stěna | kostka nad ni `(x, y, z+1)` |
| pravá stěna | kostka před ni `(x+1, y, z)` |
| levá stěna | kostka před ni `(x, y+1, z)` |

Boční stěny umí převisy a oblouky, takže se nemusí hlídat podpora zespodu — nová
kostka vždy na něčem navazuje. Kostka se dá sebrat i zpod stavby, stejně jako
v Minecraftu.

## Výsledek

Hotovo, podrobně v `tasks/MATH-3-izometricke-staveni.md`.

- `lib/iso.ts` — projekce, hloubka, rozměr scény a matice stěn jako čisté funkce, 8 testů.
- Mřížka 8 × 8 × 8, klíč buňky `"x,y,z"`, stará plochá stavba se převede.
- Kostka má na telefonu 40 px místo 21 px, na tabletu a desktopu 80 px.
- Ověřeno v prohlížeči na 1280×900, 810×1080, 390×844 a 844×390 (dev i produkční build):
  klepnutí trefilo pokaždé očekávanou buňku, tažení i opakovaný přesun fungují,
  počítání a zeď beze změny, v konzoli nic.

### Co stojí za zaznamenání

Přebytečnou výšku dostávaly v mřížce **všechny** řádky `auto`, ne jen ta s plochou —
hlavička se roztáhla a plocha zůstala malá. Řeší to `grid-template-rows: auto minmax(0, 1fr)`
u `.page.building`.
