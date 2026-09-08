# Matika do dvaceti — trénování počítání

Statická jednostránková appka, jeden soubor `index.html` (bez buildu, bez závislostí kromě Google Fonts).
Nasazeno na RPi jako `/www/matika` → symlink `/var/www/html/matika` → https://brnt.cz/matika

## Hotovo

- [x] Rozsah do 10 / do 20, 2–4 čísla v příkladu
- [x] Znaménka jako zaškrtávátka: `+`, `−`, `×`, `÷` — libovolná kombinace, aspoň jedno musí zůstat
- [x] Priorita operací: `× ÷` se počítá před `+ −` (příklad je matematicky správný i pro cizí návštěvníky)
- [x] Mezivýsledky vždy celé číslo v rozsahu 1–max (žádné minus, žádné přetečení, dělení beze zbytku)
- [x] Input na výsledek + velká numerická klávesnice i fyzická klávesnice (číslice, Backspace, Enter)
- [x] Minecraftová věž: správný výsledek = kostka nahoru, chyba = poslední kostka spadne
- [x] Kostky jako izometrické SVG kubusy (drn / kámen / dubová prkna), bez podlahy, odsazené od sešitu
- [x] Zeď: sloupec se plní odspodu, po dosažení vrcholu stránky začne nový sloupec vedle;
      počet pater se počítá z reálné výšky stránky (přepočet i při změně velikosti okna)
- [x] Když je zeď plná, kostky se zmenší (`--zoom`) — žádná nikdy nezmizí
- [x] Zmenšování skokem (×0,78) s hysterezí, ne plynule — zeď se nepřerovnává s každou kostkou
- [x] 6 druhů kostek (drn, kámen, prkna, písek, netherrack, obsidián), typ = hash indexu,
      takže rozházené, ale po překreslení stejné
- [x] Výška výpočtového sloupce se zafixuje — po dokončení kola zeď zůstane pixel za pixel stejná
- [x] Dělení sebou samým (x÷x) jen když jinak příklad nelze sestavit (dvoufázový generátor)
- [x] Truhla: každých 50 kostek se zeď uloží do truhly (vlastní sloupec vpravo, stojí na stejné
      zemi jako zeď); po 100 je z ní velká truhla. Co je v truhle, chyba už nesundá.
- [x] Kostky se sypou do truhel po řadě; další truhla se přistaví (zarovnaná zleva, sedí na víku
      té spodní) teprve když je předchozí úplně plná — 54 políček, tj. 3250 kostek
- [x] Mobil (<30rem): hra má celou šířku, zeď a truhly jsou v pásu pod klávesnicí a kostky
      jsou menší — příklady mají prioritu, gamifikace je vedlejší
- [x] Inventář na kliknutí (hover se ukázal jako nepříjemný): minecraftová mřížka 3 × 9 nebo 6 × 9,
      kostky stackované po druzích, max 64 na políčko. Vyskočí nad truhlu.
- [x] Dvojtruhla je jeden kus — jedno kování, uprostřed žádná hrana
- [x] Minecraftovský tooltip s názvem kostky (Blok trávy, Kámen, Dubová prkna, Písek,
      Netherrack, Obsidián) na zdi i na políčkách v truhle
- [x] Vážená vzácnost kostek (drn 27 %, kámen 24, prkna 20, písek 15, netherrack 9, obsidián 5)
- [x] Favicon = dřevěná kostka (generuje `build.py` jako inline SVG)
- [x] V hlavičce aktuální i nejlepší série, v souhrnu kola nejdelší řada za sebou
- [x] Po chybě příklad zůstává, dokud ho syn nedopočítá; po 3 omylech nápověda a věž se dál nebourá
- [x] Série 10 příkladů + hvězdičky, nejdelší série napoprvé
- [x] localStorage: nastavení, nejdelší série, výška věže (drží i po zavření stránky)
- [x] Příklad vždy na jednom řádku — velikost fontu z šířky sešitu (`cqw`) a počtu čísel
- [x] Pevný červený okraj sešitu, text do něj nezasahuje
- [x] Responzivní 320 px → desktop, jen světlé téma, zvukové blipnutí

## Review

- **Generátor ověřen programově:** 36 000 příkladů přes všechny kombinace rozsahu (10/20),
  počtu čísel (2/3/4) a všech 15 neprázdných množin znamének. Kontrolováno proti referenčnímu
  vyhodnocení s prioritou operací: 0 chyb — nikde necelé dělení, nikde mezivýsledek mimo rozsah,
  nikde nepovolené znaménko. 8 844 příkladů míchalo `+ −` s `× ÷`, priorita vždy souhlasila.
- **Struktura příkladu:** skládá se z bloků. Blok je jedno číslo nebo řetězec `× ÷`; bloky se
  pak sčítají a odčítají. Díky tomu je priorita zaručena konstrukcí, ne dodatečným parsováním.
- **Nalezená a opravená chyba:** Enter se zpracovával dvakrát (listener na inputu i na dokumentu),
  takže po první chybě naskočilo „Napiš výsledek“ místo „Ještě jednou“. Obsluha klávesnice je teď
  na jednom místě (`document` keydown).
- **Ověřeno v prohlížeči:** správná odpověď přidá kostku a posune sérii, chybná kostku sundá,
  příklad zůstává na místě, hodnoty přežijí reload. Nejhorší reálný čtyřčlenný příklad má na
  320 px ještě rezervu, stránka nikde nescrolluje do strany.
- **Stabilita zdi ověřena:** při rostoucí zdi 1 → 70 kostek na 1440×900 se rozvržení mění
  jen 6×: nový sloupec při 15, 29, 39, 58 a zmenšení kostky při 37 (64→50 px) a 67 (50→39 px).
  Mezi tím se žádná existující kostka nepohne. Po dokončení kola: 0 rozdílů na 66 kostkách.
- **Ověřeno pro zeď:** 1 / 10 / 14 / 23 / 40 / 80 / 200 kostek na 430×880 — vždy se nakreslí
  všechny, sloupců 1 → 6, pruh se šířkou zastaví na 32 % stránky, nic nepřeteče nad ani vpravo,
  sešit se nikdy nezalomí. Pod 13 px se kostka už nezmenšuje.
- **Pozor na záměnu:** „9 z 10 napoprvé" je počet za kolo, „nejdelší série" je nejdelší
  nepřerušená řada — proto může být menší. Kvůli tomu je teď v hlavičce vidět i aktuální série.
- **Past na `<use>` + viewBox:** symbol se záporným počátkem viewBoxu (`0 -8 …`) se odřízne,
  protože `<use>` vytvoří viewport od (0,0). Sprity truhly proto mají viewBox od nuly a obsah
  posunutý dovnitř `<g transform="translate(…)">`. Narazil jsem na to dvakrát — u dvojtruhly
  a pak u černého obtažení.
- **Kotvení inventáře:** `bottom: 100%` na sloupci truhly ho vystřelilo mimo obrazovku (sloupec
  je vysoký jako zeď). Truhla je proto v obalu `.chest-mount` velikosti spritu.
- **Vědomé rozhodnutí:** po 3 omylech se ukáže výsledek jako nápověda a věž se přestane bourat —
  jinak by šel příklad, který syn neumí, bourat do nuly.

## Sestavení a nasazení

`index.html` se sestavuje ze fragmentu (verze pro Artifact, bez `<html>/<head>/<body>`):

```bash
python3 build.py cesta/k/matika.html   # dolepí <head> vč. favicony
scp index.html pi:/www/matika/index.html
```

## Ověřeno u truhly

- Obsah truhly pro 0 / 50 / 100 / 150 / 400 kostek: součet políček vždy odpovídá,
  nikde víc než 64 na políčku, stacky se správně lámou (400 → grass 64+57, …).
- Truhla se objeví až od 50, dvojtruhla od 100 (27 → 54 políček).
- Šířky 320 / 430 / 768: dno truhly je na stejné úrovni jako dno zdi, inventář nikdy
  nepřekrývá zeď ani nevyleze z okna, sešit ani stránka se nezalomí do strany.
- Přechody 49 → 50 (zeď do truhly) a 99 → 100 (velká truhla) včetně hlášky a uložení.
