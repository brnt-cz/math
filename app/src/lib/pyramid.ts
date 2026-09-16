/**
 * Počítací pyramida (Hejného metoda).
 *
 * Dole je řada cihel a každá cihla nad nimi je **součet dvou pod sebou**. Část cihel je
 * vidět, zbytek se doplňuje. Kouzlo metody je v tom, že prázdné cihly nejsou jen nahoře:
 * když chybí cihla dole a nad ní je součet, musí se odčítat — aniž by dítě kdy vidělo
 * znaménko minus.
 *
 * Patra se počítají **odspodu**: `rows[0]` je základna, poslední patro má jednu cihlu.
 */

export type Cell = { row: number; at: number };

export type Pyramid = {
  /** hodnoty všech cihel, odspodu nahoru */
  rows: number[][];
  /** které cihly jsou vidět zadané */
  known: boolean[][];
};

export type PyramidConfig = {
  /** horní hranice rozsahu: 10 nebo 20 */
  range: number;
  /** kolik cihel má základna: 2–4 */
  base: number;
};

export type Rng = () => number;

const defaultRng: Rng = Math.random;

function rnd(n: number, rng: Rng): number {
  return Math.floor(rng() * n);
}

/** Kolik cihel má patro `row` v pyramidě se základnou `base`. */
export function widthOf(base: number, row: number): number {
  return base - row;
}

/** Všechny cihly odspodu nahoru. */
export function cellsOf(base: number): Cell[] {
  const out: Cell[] = [];
  for (let row = 0; row < base; row++) {
    for (let at = 0; at < widthOf(base, row); at++) out.push({ row, at });
  }
  return out;
}

/**
 * Kolikrát se cihla základny promítne do vrcholu — jsou to kombinační čísla
 * (pro základnu 4 je to 1, 3, 3, 1). Vrchol je vždycky největší cihla, takže když se
 * do rozsahu vejde on, vejde se celá pyramida.
 */
export function weights(base: number): number[] {
  const out = [1];
  for (let i = 1; i < base; i++) {
    out.push(((out[i - 1] as number) * (base - i)) / i);
  }
  return out;
}

/**
 * Náhodná základna, která se **z konstrukce** vejde do rozsahu: každá cihla má aspoň
 * jedničku a zbytek rozsahu se rozdělí po vahách. Losovat čísla nazdařbůh a zkoušet
 * nestačí — u základny 4 v desítce projde sotva promile pokusů.
 */
export function randomBottom(base: number, range: number, rng: Rng): number[] | null {
  const w = weights(base);
  const least = w.reduce((n, x) => n + x, 0);
  if (least > range) return null;

  const bottom = Array(base).fill(1) as number[];
  let budget = range - least;

  // pořadí rozdávání se míchá, jinak by první cihly braly rozpočet vždycky jako první
  const order = bottom.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = rnd(i + 1, rng);
    const swap = order[i] as number;
    order[i] = order[j] as number;
    order[j] = swap;
  }

  for (const i of order) {
    const weight = w[i] as number;
    const extra = rnd(Math.floor(budget / weight) + 1, rng);
    budget -= extra * weight;
    bottom[i] = 1 + extra;
  }
  return bottom;
}

/** Dopočítá patra nad základnou. Vrací `null`, když se pyramida nevejde do rozsahu. */
export function build(bottom: number[], range: number): number[][] | null {
  const rows: number[][] = [bottom.slice()];

  for (let row = 1; row < bottom.length; row++) {
    const below = rows[row - 1] as number[];
    const next: number[] = [];

    for (let at = 0; at < below.length - 1; at++) {
      const sum = (below[at] as number) + (below[at + 1] as number);
      if (sum > range) return null;
      next.push(sum);
    }
    rows.push(next);
  }
  return rows;
}

/**
 * Doplňování úvahou: součet znám, když znám obě cihly pod ním; cihlu znám, když znám
 * součet a jejího sourozence. Vrací, které cihly se z `known` dají odvodit — a v jakém
 * pořadí, což je zároveň postup, kterým se to dá vyřešit.
 */
export function solveOrder(base: number, known: boolean[][]): Cell[] {
  const seen = known.map((row) => row.slice());
  const order: Cell[] = [];

  for (let pass = 0; pass < base * base + 1; pass++) {
    let added = false;

    for (let row = 0; row + 1 < base; row++) {
      for (let at = 0; at < widthOf(base, row) - 1; at++) {
        const left = (seen[row] as boolean[])[at] === true;
        const right = (seen[row] as boolean[])[at + 1] === true;
        const top = (seen[row + 1] as boolean[])[at] === true;
        const trio: [boolean, boolean, boolean] = [left, right, top];

        // ze dvou známých ve trojici plyne ta třetí
        if (trio.filter(Boolean).length !== 2) continue;

        if (!left) {
          (seen[row] as boolean[])[at] = true;
          order.push({ row, at });
        } else if (!right) {
          (seen[row] as boolean[])[at + 1] = true;
          order.push({ row, at: at + 1 });
        } else {
          (seen[row + 1] as boolean[])[at] = true;
          order.push({ row: row + 1, at });
        }
        added = true;
      }
    }

    if (!added) break;
  }
  return order;
}

/** Dá se pyramida doplnit celá, a tedy jednoznačně? */
export function solvable(p: Pyramid): boolean {
  const base = p.rows[0]?.length ?? 0;
  const blanks = p.known.reduce((n, row) => n + row.filter((k) => !k).length, 0);

  return solveOrder(base, p.known).length === blanks;
}

/** Kolik cihel se schová. Roste s velikostí, ale pyramida nemá být maraton. */
export function blanksFor(base: number): number {
  return Math.max(1, base - 1);
}

function allKnown(base: number): boolean[][] {
  return Array.from({ length: base }, (_, row) => Array(widthOf(base, row)).fill(true) as boolean[]);
}

/**
 * Náhodná pyramida. Staví se odspodu a zkouší se, dokud se celá nevejde do rozsahu
 * a dokud se schované cihly nedají doplnit úvahou.
 */
export function makePyramid(cfg: PyramidConfig, rng: Rng = defaultRng): Pyramid {
  const base = Math.min(4, Math.max(2, Math.floor(cfg.base)));
  const cells = cellsOf(base);
  const blanks = blanksFor(base);

  // první průchod chce v dvacítce pyramidu, která přeleze desítku; pak už bereme cokoliv
  for (const preferHigh of [true, false]) {
    for (let attempt = 0; attempt < 400; attempt++) {
      const bottom = randomBottom(base, cfg.range, rng);
      if (!bottom) break;

      const rows = build(bottom, cfg.range);
      if (!rows) continue;

      const top = (rows[base - 1] as number[])[0] as number;
      if (preferHigh && cfg.range > 10 && top < 11) continue;

      const known = allKnown(base);
      const hidden = cells.slice();
      for (let i = hidden.length - 1; i > 0; i--) {
        const j = rnd(i + 1, rng);
        const swap = hidden[i] as Cell;
        hidden[i] = hidden[j] as Cell;
        hidden[j] = swap;
      }

      for (const cell of hidden.slice(0, blanks)) {
        (known[cell.row] as boolean[])[cell.at] = false;
      }

      const pyramid = { rows, known };
      if (solvable(pyramid)) return pyramid;
    }
  }

  // krajní záloha: nejjednodušší pyramida, jakou lze postavit
  const rows = build(Array(base).fill(1), cfg.range) as number[][];
  const known = allKnown(base);
  (known[0] as boolean[])[0] = false;
  return { rows, known };
}

/** Hodnota cihly. */
export function valueAt(p: Pyramid, cell: Cell): number {
  return (p.rows[cell.row] as number[])[cell.at] as number;
}

/** Je cihla zadaná (vidět), nebo se doplňuje? */
export function isKnown(p: Pyramid, cell: Cell): boolean {
  return (p.known[cell.row] as boolean[])[cell.at] === true;
}

/** Prázdné cihly v pořadí, v jakém se dají doplnit úvahou. */
export function blankCells(p: Pyramid): Cell[] {
  return solveOrder(p.rows[0]?.length ?? 0, p.known);
}
