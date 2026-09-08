# Matika do dvaceti — trénování počítání

Statická jednostránková appka, jeden soubor `index.html` (bez buildu, bez závislostí kromě Google Fonts).
Nasazeno na RPi jako `/www/matika` → symlink `/var/www/html/matika` → https://brnt.cz/matika

## Hotovo

- [x] Rozsah do 10 / do 20, 2–4 čísla v příkladu
- [x] Znaménka jako zaškrtávátka: `+`, `−`, `×`, `÷` — libovolná kombinace, aspoň jedno musí zůstat
- [x] Priorita operací: `× ÷` se počítá před `+ −` (příklad je matematicky správný i pro cizí návštěvníky)
- [x] Mezivýsledky vždy celé číslo v rozsahu 1–max (žádné minus, žádné přetečení, dělení beze zbytku)
- [x] Výsledek se píše velkými tlačítky nebo fyzickou klávesnicí (číslice, Backspace, Enter).
      Rámeček na výsledek **není `<input>`** — na mobilu/tabletu by při každém focusu
      vyskočila systémová klávesnice a posunula obrazovku. Číslice zapisujeme sami,
      posluchač visí na `document`, takže focus není potřeba vůbec.
- [x] Po kliknutí ukazatelem se ovládací prvek odostří (`e.detail > 0`), aby zaostřené
      tlačítko nepolykalo mezerník
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
- [x] Rozvržení podle orientace: na výšku má hra celou šířku a zeď s truhlami jsou v pásu
      pod klávesnicí (telefon 30 px kostky, tablet 40 px), na šířku svislý pruh vpravo.
      Příklady mají prioritu, gamifikace je vedlejší.
- [x] Na šířku se celá appka vejde do okna bez posuvníku (`100svh` + pružný sešit
      a klávesnice, velikost písma tlačítek z `cqh`); na nízkém okně kompaktní nastavení
- [x] Zrušeno fixování výšky sloupce (`lockWrapHeight`) — výšku teď drží rozvržení samo
- [x] PWA není zamčená na výšku — v manifestu není `orientation`, jde tedy oboje
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

## PWA

- [x] `manifest.json` (standalone, ikony 192/512 + maskable, portrait)
- [x] `sw.js` — precache celé appky, jméno cache = hash `index.html` (samo se obnoví)
- [x] Fonty hostované lokálně (`fonts/*.woff2`, latin + latin-ext) — offline nic nechybí
      a nejde žádný požadavek na cizí server
- [x] Blikající kurzor v rámečku: prázdný = před otazníkem, s číslem = za ním,
      výška i střed podle číslic (naměřeno: číslice sahají −0,022em..0,63em)

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
- **Regrese z mobilního rozvržení:** `.page:not(.has-chest)` má specificitu dvou tříd
  a media query specificitu nezvyšuje, takže mobilní jednosloupcové pravidlo přebíjelo
  desktopový přepis — bez truhly spadly kostičky pod hru i na desktopu. Přepis v media
  query má teď stejnou specificitu; proměřeno 1280/768/520/430/390 px se truhlou i bez ní.
- **Vědomé rozhodnutí:** po 3 omylech se ukáže výsledek jako nápověda a věž se přestane bourat —
  jinak by šel příklad, který syn neumí, bourat do nuly.

## Ověřeno bez posuvníku

Na šířku (obsah × okno, s truhlou i bez): iPad 11" 1080×810, iPad mini 1024×744,
iPad s lištou 1080×700, notebook 1366×768, desktop 1280×900, Full HD 1920×1080,
nízké okno 1000×500, telefon na šířku 844×390 i 667×375 — **nikde posuvník**.
Klávesnice se přizpůsobí: tlačítko 39 px na telefonu na šířku, 62 px na iPadu,
125 px na Full HD.

Na výšku: tablety (744×1133, 810×1080) bez posuvníku; telefony mají celou hru
do 700 px (na iPhonu 14 i Pixelu 7 je vidět bez scrollování) a pás s kostkami
je pod ohybem.

## Ověřeno offline

- Po první návštěvě má service worker v cache 10 položek (stránka, manifest, 3 ikony,
  4 fonty, `./`). S vypnutým serverem se stránka načte, fonty jsou k dispozici
  (`document.fonts.check` → true), příklad se dá vyřešit a kostka přiroste.
- Ověřeno i na živé adrese https://brnt.cz/matika — cache `matika-<hash>`, 10 položek.

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
