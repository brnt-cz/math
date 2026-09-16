# MATH-7 — Počítací pyramidy (Hejného metoda)

> „Přidat počítací pyramidy – Hejného metoda.“

Větev: `MATH-7-pyramidy`

## Pravidla

Dole je řada cihel a každá cihla nad nimi je **součet dvou pod sebou**. Část cihel je
vidět, zbytek se doplňuje. Kouzlo metody je v tom, že prázdné cihly nejsou jen nahoře:
**když chybí cihla dole a nad ní je součet, musí se odčítat** — aniž by dítě kdy vidělo
znaménko minus.

| Otázka | Rozhodnutí (od zadavatele) |
|---|---|
| Velikost základny | Přepínač **2 3 4**, který už tam je; v pyramidách se jmenuje „Šířka pyramidy“ |
| Prázdné cihly | **Různě** — nahoře i dole |
| Kam to patří | Třetí volba u „Počítáme“: `do 10 · do 20 · pyramidy` |

## Co drží pyramidu pohromadě

**Vždy jednoznačně řešitelná.** Náhodně rozházené díry umí udělat pyramidu, která má víc
řešení (typicky když je zadané jen prostřední patro) nebo žádné. Hlídá to řešitel
propagací: doplň součet, když znáš obě cihly pod ním, a doplň cihlu, když znáš součet
a sourozence. Když propagace dojde na všechny díry, je řešení právě jedno — a navíc je to
**pořadí, ve kterém se pyramida dá vyřešit úvahou**, takže podle něj appka vybírá další
cihlu a syn se nezasekne.

**Celá pyramida v rozsahu.** Vrchol roste jako kombinační čísla základny (pro čtyřku
`a + 3b + 3c + d`) a je vždycky největší cihla — stačí tedy hlídat jeho. Losovat základnu
nazdařbůh a zkoušet ale nestačí: u základny 4 v desítce projde sotva promile pokusů.
Základna se proto losuje **s rozpočtem**: každá cihla dostane jedničku a zbytek rozsahu se
rozdá po vahách, takže se pyramida vejde do rozsahu **z konstrukce**.

**Jedna doplněná cihla = jeden příklad.** Kostka do zdi, tečka v kole i odemykání stavění
se počítají stejně jako dřív, takže se nerozhodí ekonomika truhly ani limit na stavění.
Kolo je tedy deset cihel, ne deset pyramid.

## Kde to bylo zrádné

**Dvě kolize jmen tříd v CSS.** Cihla dostala třídu `done` — jenže `.done` už v appce
znamená panel s výsledkem kola (`display: grid`, padding). Číslo v cihle proto po odeslání
správné odpovědi poskočilo o 13,8 px dolů. Panel nastavení dostal třídu `pyramid` — jenže
`.pyramid` kreslí pyramidu jako svislý flex, takže se přepínače zmáčkly a rozsypaly.
Třídy cihel mají teď předponu `is-`.

**Kurzor nesmí brát místo.** Schovat ho přes `display: none` zkrátí řádek a číslo v cihle
poskočí; musí se jen zneviditelnit.

**Přepnutí šířky se neprojevilo.** Nové kolo pokračovalo v rozdělané pyramidě, takže změna
základny ani rozsahu nebyla vidět, dokud ji syn nedopočítal. Nové kolo teď vždycky staví
novou pyramidu.

## Aby se nehýbala klávesnice

Pyramida je vyšší než jeden příklad, takže papír má **stálou výšku danou tou nejvyšší
pyramidou** (17 rem) a obsah je na střed; v počítání má příklad kolem sebe víc papíru.
Znaménka v pyramidách nemají co říct, ale **nemizí** — jen zašednou a nejdou zapnout,
protože jinak by se panel zkrátil a klávesnice by poskočila.

Cihly jsou co největší a zmenšují se podle šířky základny (2,25 / 2 / 1,625 rem). Na šířku
obrazovky se řídí výškou okna (`cqh`), aby appka zůstala bez posuvníku.

## Ověřeno

- 95 testů, z toho 10 na pyramidy: součty sedí, celá pyramida v rozsahu, vždy jednoznačně
  řešitelná, díry padají nahoru i dolů, nejednoznačné zadání se pozná, základna se do
  rozsahu vejde z konstrukce, stejné semínko dá stejnou pyramidu.
- V prohlížeči: doplnění cihly přidá kostku a tečku a vybere další cihlu, dokončená
  pyramida se vymění za novou, špatná odpověď kostku sundá, klepnutí vybírá jinou prázdnou
  cihlu, zadané cihly klepnutí ignorují, kolo deseti cihel skončí výsledkovou obrazovkou.
- Panel i papír mají v obou režimech a při všech šířkách základny **stejnou výšku**
  (190 a 272 px), takže se klávesnice ani tečky nehnou.
