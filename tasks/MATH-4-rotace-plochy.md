# MATH-4 — Rotace plochy na stavění

> „Zkusíme pořešit rotaci plátna (šlo by to?)“

Větev: `MATH-4-rotace-plochy`

## Proč

V MATH-3 se narazilo na vlastnost izometrie, která se nedá spravit: políčko podlahy
**přímo za** kostkou je celé zakryté její horní stěnou, takže se na něj nedá klepnout.
Otočením plochy se z nedostupného místa stane dostupné — stejně to řeší každá
izometrická hra.

## Jak

Uložená stavba zůstává ve **světových** souřadnicích, kreslení a terče běží
v souřadnicích **pohledu**. Mezi nimi překlápí `toView` a `toWorld`:

    r = 0:  a = x,            b = y
    r = 1:  a = 15 − y,       b = x
    r = 2:  a = 15 − x,       b = 15 − y
    r = 3:  a = y,            b = 15 − x

Projekce, hloubka `x + y + z`, pořadí kreslení ani matice stěn o otočení **nevědí** —
dostanou souřadnice pohledu a počítají to samé jako dřív. V komponentě platí jednoduché
pravidlo: co jde do `build`, je vždycky svět; co má pozici na obrazovce, je vždycky pohled.

Podmínka je splněná už z MATH-3: mřížka je 16 × 16, tedy čtvercová, takže se otočením
mapuje sama na sebe. Při 16 × 12 by to nešlo.

## Kde to bylo zrádné

**Směr.** Krok `+1` musí otáčet plochou **po směru hodin**, jak to čeká ruka u tlačítka ↻.
Napoprvé jsem to měl naopak a zadavatel to poznal hned. Směr teď fixuje test: zadní kout
kosočtverce (svět 0, 0) je po kroku doprava vpravo, po dalším vepředu a po dalším vlevo.

**Stěny.** „Pravá stěna“ je +a *v pohledu*, ne ve světě. Kam kostka spadne, se proto počítá
v pohledu a až výsledek se překlopí do světa. Ověřeno: pravá stěna míří po otočeních na
`+x → +y → −x → −y`, horní stěna vždycky na `z+1`.

**Portál.** `portalCells` vrací rovinu ve světě (stojí `x`, nebo `y`), ale kreslí se
v pohledu — a otočení o 90° tyhle dvě roviny prohodí. Řeší to `portalFace(plane, turn)`
podle parity otočení.

**Co se nemění:** „kostka nad“ u zadupané trávy je věc světa, ne pohledu. Stejně tak výška
scény a počet pater.

## Čemu jsem se vyhnul

Plynulé otáčení animací nejde: otočení kamery o 90° mění, **které stěny kostky jsou vidět**
(z levé se stane pravá), takže to není afinní transformace obrázku a jedním CSS `transform`
se to udělat nedá. Otočení je proto skokové.

Grafika se nemění — textury stěn jsou nepravidelné, takže stejné sprity fungují ve všech
pohledech.

## Ovládání

Dvě tlačítka `↺ ↻` vedle „Bourat“. Otočení se ukládá (`turn` 0–3), stará data ho neznají
a dostanou pohled bez otočení. Po otočení se ruší míření i rozdělané tažení, protože pod
kurzorem leží něco jiného.

## Ověřeno

- 76 testů, z toho 6 nových na otočení: převod tam a zpátky pro všechny buňky a všechna
  otočení, otočení jako přerovnání mřížky (nic nezmizí, nic se nesloučí), zachování
  sousedství, cyklus po čtyřech krocích, směr otáčení a prohození rovin portálu.
- V prohlížeči ve všech čtyřech pohledech: klepnutí na podlahu i na stěny trefilo
  očekávanou **světovou** buňku, kostka ve světě 3,3,0 se objevila na čtyřech různých
  místech obrazovky, portál se kreslí správně v každém pohledu (6 polí, správná stěna).
- Otočení přežije reload; na telefonu (390×844) i na šířku (844×390) se tlačítka vejdou
  bez posuvníku.
