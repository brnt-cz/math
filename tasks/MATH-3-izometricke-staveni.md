# MATH-3 — Izometrické stavění

> „To staveni kosticek by bylo lepsi trochu vic izometricky, bez mezer a vic 3d.“
> Ze tří nabídnutých směrů si zadavatel vybral **1) skutečnou izometrii s hloubkou** —
> plocha jako kosočtverečná podlaha, kostky se kladou i „dozadu“ a dají se stavět na sebe
> do výšky. Dohodnuto, že se to udělá až po refaktoru do Vue (MATH-2).

Větev: `MATH-3-izometricke-staveni`

## Co se změnilo

MATH-1 kreslil kostky do jedné svislé vrstvy: mřížka 16 × 12, řady se překrývaly o čtvrtinu
kostky. Vypadalo to jako zeď zpředu. Teď má kostka **tři souřadnice** `x` (doprava dopředu),
`y` (doleva dopředu) a `z` (nahoru) a scéna je skutečná izometrie.

## Klíčové zjištění: grafika už izometrická byla

SVG symboly kostek jsou od začátku izometrické krychle — `viewBox 0 0 32 32`, tři stěny
přes `matrix(1,.5,-1,.5,16,0)` (horní), `matrix(1,.5,0,1,0,8)` (levá) a
`matrix(1,-.5,0,1,16,16)` (pravá). Hrana kostky je 16 jednotek, obal je čtverec 32 × 32.
**Nekreslí se tedy nic nového**, mění se jen rozmístění:

    obal kostky (x, y, z):  left = (x − y + DEPTH − 1) · s/2
                            top  = (x + y) · s/4 + (LEVELS − 1 − z) · s/2

    osy na obrazovce:  x → (+s/2, +s/4)   y → (−s/2, +s/4)   z → (0, −s/2)

## Pořadí kreslení

Dva body v této projekci splynou, právě když se liší o násobek (1, 1, 1) — to je směr
pohledu. Větší `x + y + z` je proto blíž k divákovi a kreslí se později. `z-index` je
`10 + 2 · hloubka`, stěny o jedničku výš, takže terče jedné kostky leží nad její vlastní
kresbou, ale pod kresbou všeho, co je před ní.

Že to sedí, potvrzuje i kostka „přímo před“ (`+1, +1, +1`): padne přesně na stejné místo
a má o tři větší hloubku, takže tu zadní správně překryje celou.

## Ovládání: terč je samotná stěna

Každá stěna kostky je vlastní zkosený čtverec (matice z `lib/iso.ts`, `transform-origin: 0 0`),
který chytá prst. Co je vidět, na to se dá klepnout — a co kostka zakryje, patří jí, včetně
kousků podlahy pod jejími bočními stěnami. Žádná inverzní projekce, žádné hádání.

| klepnutí | akce |
|---|---|
| podlaha | kostka na zem `(x, y, 0)` |
| horní stěna | kostka nad ni `(x, y, z+1)` |
| pravá stěna | kostka před ni `(x+1, y, z)` |
| levá stěna | kostka před ni `(x, y+1, z)` |

Boční stěny umí převisy a oblouky. Protože nová kostka vždycky navazuje na tu, na kterou
se kleplo, nemusí se hlídat podpora zespodu; sebrat jde i kostka zespodu stavby, stejně
jako v Minecraftu.

Klepnutí se od tažení odděluje **osmipixelovou tolerancí** (`SLOP`): dokud prst neujede
dál, jde o klepnutí a kostka, na kterou se kleplo, se nehýbe.

Kostka pod kurzorem se celá zvýrazní (v režimu bourání červeně) a průhledný náhled ukáže,
kam nová kostka spadne. Popisek s názvem kostky se na ploše **nezobrazuje** — při stavění
ruší; zůstal jen tam, kde se kostky prohlížejí: v paletě, ve zdi a v truhle. Není to kosmetika: **patro výš vypadá v izometrii přesně stejně
jako políčko dozadu** — `(x, y, z+1)` a `(x−1, y−1, z)` padnou na to samé místo, protože
(1, 1, 1) je směr pohledu. Bez zvýraznění není poznat, jestli klepnutí staví nahoru, nebo
na podlahu za kostkou; hlídá to i test.

Z toho plyne jedna vlastnost, která se nedá „spravit“, protože je to pravda o izometrii:
políčko podlahy **přímo za** kostkou je celé zakryté její horní stěnou, takže se na něj
nedá klepnout. Dozadu se staví po osách (políčka vlevo i vpravo za kostkou zůstávají
z poloviny vidět) nebo od zadu dopředu.

**Pravé tlačítko bourá** — sundá kostku, na kterou se kleplo, bez přepínání režimu
(kontextové menu se potlačí). Na dotykových displejích pravé tlačítko není, proto
režim „Bourat“ zůstává.

Beze změny zůstává: tažení kostky jinam ji přesune, tažení na paletu ji vrátí do truhly,
klepnutí s prázdnou rukou vezme druh kostky do ruky, režim „Bourat“ sundává.

## Rozměry scény

Mřížka je 16 × 16 políček a 8 pater (`ISO_COLS`, `ISO_DEPTH`, `ISO_LEVELS`). Scéna se kreslí
jen na tolik pater, kolik se vejde do volné výšky — nejmíň ale na to, co je postaveno plus
jedno navíc. Podlaha proto drží dole, stavba roste do vzduchu nad ní a plocha se pod rukama
nepřerovnává. Rám plochy scénu obalí, takže po ní nezůstává prázdná bílá plocha.

Velikost kostky je násobek čtyř, aby všechny pozice (`s/2`, `s/4`) padly na celé pixely
a mezi kostkami nevznikaly světlé spáry.

Kostka má na telefonu 20 px, na tabletu i desktopu 40 px.

## Hlína pod kostkou

Tráva, na které něco stojí, se kreslí jako **hlína** — jako v Minecraftu. Jakmile je
nahoře volno (typicky u horní vrstvy stavby), je zase travnatá.

Hlína **není druh kostky**: `BLOCKS` (a tím rarita, zeď i truhla) zůstávají beze změny,
přidaný je jen vzhled (`SPRITES`, symbol `blk-dirt` složený z hliněných stěn trávy).
Rozhoduje o tom čistá funkce `spriteFor(type, covered)`, takže se to dá otestovat bez
prohlížeče. V truhle je to pořád blok trávy — počítání „v truhle + na ploše = nasbírané“
se tím nedotkne.

## Nové druhy kostek

Přidané druhy: **dubová kláda** a **dlažební kostka**. Obojí si vzalo svůj díl vzácnosti
**od svého příbuzného** a stojí v seznamu hned za ním — kláda z prken (20 → 12 + 8),
dlažba z kamene (24 → 14 + 10). Součty přes ostatní druhy tím zůstaly stejné, takže se
už nasbíraným kostkám druh nezměnil: jen z části prken jsou klády a z části kamene
dlažba. Jinak by se synovi přeházela celá truhla i zeď. Hlídá to test, který porovnává
starou a novou tabulku kostku po kostce.

Vedlejší důsledek: osm druhů zabere v truhle víc políček než šest, takže se první truhla
naplní dřív (~3150 kostek místo ~3250). Testy proto tu hranici počítají z rozložení
druhů, ne z čísla v kódu.

## Nether portál

Obsidiánový rám se pozná sám: v jedné svislé rovině hledá `lib/portal.ts` obdélník
prázdných buněk nejmíň 2 × 3, celý obehnaný obsidiánem. Vnitřek se pak kreslí jako
fialová plocha portálu — leží v rovině rámu, takže se kreslí **stejnou maticí jako
stěna kostky** (`y` konstantní → levá, `x` konstantní → pravá).

Je to čistá funkce nad uloženou stavbou, nikde se nedrží žádný stav: portál se zapálí
položením poslední kostky rámu a zhasne, jakmile se rám poruší nebo se do vnitřku něco
postaví. Rohy rámu potřeba nejsou, stejně jako ve hře.

## Zbourat vše

Tlačítko vedle „Bourat“ vrátí celou plochu do truhly. Ptá se dvakrát (druhé klepnutí
do čtyř sekund), ať se hotová stavba nesmaže omylem, a na prázdné ploše je zakázané.

## Uložená data

Klíč buňky je `"x,y,z"`. Stavba ze staré ploché verze (`"x,y"`, kde `y` byla výška) se
**převede**: sloupce se postaví k zadní stěně (`y = 0`) a sesypou k zemi, co se do scény
nevejde, zůstane v truhle. Invariant „v truhle + na ploše = nasbírané“ platí dál.

## Ověřeno

- 54 testů (`npm test`), z toho 9 nových na izometrii: projekce, hloubka, rozměr scény,
  celistvost podlahy, tři stěny pokryjí kostku a nepřekrývají se.
- V prohlížeči na 1280×900, 810×1080, 390×844 a 844×390: klepnutí na pravou i levou stěnu,
  na horní stěnu i na políčko podlahy trefilo pokaždé očekávanou buňku; přesun tažením
  i opakovaný přesun té samé kostky (regrese z MATH-1) fungují; vrácení na paletu ubere
  ze stavby a přidá do truhly; bourání sundá kostku, na kterou se kleplo.
- Počítání i zeď beze změny, v konzoli nic.
- Stejné výsledky i nad produkčním buildem z `dist/` a v `artifact/matika.html`.
