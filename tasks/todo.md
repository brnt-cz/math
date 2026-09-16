# MATH-7: Počítací pyramidy (Hejného metoda)

Sčítací pyramida: řada cihel dole, každá cihla nad nimi je součet dvou pod sebou.
Prázdné cihly jsou **různě** — když chybí cihla dole a nad ní je součet, dítě musí
odčítat, aniž by kdy vidělo znaménko minus. To je na té metodě to hlavní.

## Rozhodnutí (od zadavatele)

| Otázka | Rozhodnutí |
|---|---|
| Velikost základny | Přepínač **POČET ČÍSEL 2 3 4**, který už tam je |
| Prázdné cihly | **Různě** — nahoře i dole |
| Kam to patří | Třetí volba u „POČÍTÁME“: `do 10 · do 20 · pyramidy` |

## Plán

- [x] `lib/pyramid.ts` — stavba pyramidy a řešitel propagací, čisté funkce
- [x] Testy: rozsah, součty sedí, vždy jednoznačně řešitelné, díry padají nahoru i dolů
- [x] `storage.ts` — pamatovat si volbu (do 10 / do 20 / pyramidy)
- [x] `useGame` — jedna doplněná cihla = jeden příklad (kostka, tečka v kole, čas na stavění)
- [x] `SetupPanel` — třetí volba, v režimu pyramid schovat znaménka (jsou jen na sčítání)
- [x] `PyramidSheet.vue` — pyramida na listu papíru, klepnutí vybírá cihlu, klávesnice píše
- [x] Ověřit v prohlížeči na telefonu, tabletu i desktopu

## Co musí platit

- **Vždy jednoznačně řešitelná.** Díry se nesmí rozhodit tak, aby pyramida měla víc
  řešení nebo žádné. Hlídá to řešitel propagací: doplň součet, když znáš obě cihly pod
  ním, a doplň cihlu, když znáš součet a sourozence. Když propagace dojde na všechno,
  je řešení právě jedno — a zároveň je to pořadí, ve kterém se to dá vyřešit úvahou,
  takže se dítě nikdy nezasekne.
- **Celá pyramida v rozsahu.** Při základně 4 roste vrchol jako `a + 3b + 3c + d`, takže
  se musí stavět odspodu a zkoušet, dokud se všechno nevejde do desítky/dvacítky.
- **Jedna doplněná cihla = jeden příklad.** Kostka do zdi, tečka v kole i odemykání
  stavění se počítají stejně jako dnes, takže se nerozhodí ekonomika truhly.

## Výsledek

Hotovo, podrobně v `tasks/MATH-7-pyramidy.md`. Kromě zadání padly dvě kolize jmen tříd
v CSS (`done`, `pyramid`), kvůli kterým poskakovalo číslo v cihle a rozsypal se panel,
a chyba, že přepnutí šířky se projevilo až po dopočítání rozdělané pyramidy.
