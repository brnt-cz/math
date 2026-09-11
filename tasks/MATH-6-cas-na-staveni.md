# MATH-6 — Časový limit na stavění

> „Půjde o to, aby se stavěním nestrávilo moc času, takže omezíme na 10 minut
> a pak se musí spočítat další příklady (aspoň 30).“

Větev: `MATH-6-cas-na-staveni`

## Pravidla

Na stavění je **10 minut**. Když se vyčerpají, appka se sama vrátí k příkladům a stavění
se odemkne po **30 spočítaných příkladech**. Stavba se přitom nikdy nemaže.

| Otázka | Rozhodnutí |
|---|---|
| Co je spočítaný příklad | **Správně vyřešený**, bez ohledu na počet pokusů. Kdyby stačilo odpovědět, dá se limit obejít mlácením špatných odpovědí. |
| Sčítá se čas dopředu? | **Ne.** Příklady se sbírají teprve s prázdnou zásobou, takže 60 příkladů nedá 20 minut. Jinak by šlo „nakoupit“ hodinu stavění. |
| Nedočerpaná zásoba | Zůstává. Po třech minutách stavění zbývá sedm. |
| Stará data | Dostanou plnou zásobu, ne nulu — po aktualizaci nemá syn zůstat bez stavění. |

## Kde je co

`lib/allowance.ts` je čisté účtování: **uplynulé sekundy jsou parametr**, ne `Date.now()`
uvnitř, takže testy běží bez čekání na reálný čas.

`composables/useBuildClock.ts` je jediné místo, které sahá na hodiny. Měří **rozdíly
časových značek**, ne tikání intervalu — interval prohlížeč na pozadí přiškrtí a čas by
se počítal špatně. Interval je tam jen na obnovování nápisu. Zbytek pod sekundu se vrací
do značky, takže se nic neztrácí ani nezdvojuje.

Odpočet stojí, když se nestaví nebo appka není vidět (`visibilitychange`, `pagehide`) —
o čas se nemá přijít tím, že někdo zavolá.

## Co je vidět

- Při stavění zbývající čas v liště u palety; poslední minuta je červená.
- V počítání ukazuje přepínač postup: `🔒 Stavění 12/30`, popisek říká, kolik ještě zbývá.
- Po vyčerpání poznámka: „Čas na stavění vypršel. Spočítej 30 příkladů a můžeš stavět dál.“

## Ověřeno

- 84 testů, z toho 7 na účtování: plná zásoba, ubývání a dno na nule, třicátý příklad,
  nemožnost střádat dopředu, zůstatek nedočerpané zásoby, očista uložených dat a formát
  času.
- V prohlížeči: počítání zásobu nekrátí, stavění ano (3,4 s → 597 s), na pozadí odpočet
  stojí, po vyčerpání se appka vrátí k příkladům se zachovanou stavbou a stavění je
  zamčené, třicátý správný příklad zásobu obnoví na 600 s, se zásobou se příklady nesbírají.
- Na telefonu (390×844) se hodiny i čtyři tlačítka vejdou bez posuvníku.
