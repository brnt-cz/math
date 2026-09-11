/**
 * Nether portál.
 *
 * Rám z obsidiánu se pozná sám: v jedné svislé rovině (stojí buď `x`, nebo `y`) je
 * obdélník prázdných buněk **nejmíň 2 × 3**, celý obehnaný obsidiánem. Vnitřek se pak
 * kreslí jako fialová plocha portálu. Rohy rámu potřeba nejsou, stejně jako ve hře —
 * kontroluje se jen to, co na vnitřek přímo doléhá.
 *
 * Je to čistá funkce nad uloženou stavbou, takže se nikde nedrží žádný stav: portál
 * vznikne položením poslední kostky rámu a zmizí, jakmile se rám poruší nebo se
 * do vnitřku něco postaví.
 */

import { ISO_COLS, ISO_DEPTH, ISO_LEVELS, voxelKey } from "./iso";
import type { Build, Cell } from "./inventory";

/** Nejmenší vnitřek portálu: dvě kostky na šířku, tři na výšku. */
export const PORTAL_MIN_WIDTH = 2;
export const PORTAL_MIN_HEIGHT = 3;

/** Která souřadnice je v rovině portálu konstantní. */
export type Plane = "x" | "y";

const FRAME = "obsidian";

/** Buňka roviny: `a` je vodorovná osa (x nebo y), `b` je výška. */
type Flat = { a: number; b: number };

function planeKey(plane: Plane, at: number, a: number, b: number): Cell {
  return plane === "y" ? voxelKey(a, at, b) : voxelKey(at, a, b);
}

/**
 * Prázdná plocha okolo `(a, b)` v jedné rovině. Vrací `null`, jakmile je jasné,
 * že to portál není — sáhne za mřížku, nebo na ni doléhá něco jiného než obsidián.
 */
function enclosed(build: Build, plane: Plane, at: number, start: Flat, wide: number): Flat[] | null {
  const seen = new Set<string>([`${start.a},${start.b}`]);
  const queue: Flat[] = [start];
  const out: Flat[] = [];

  while (queue.length) {
    const cell = queue.pop() as Flat;
    out.push(cell);

    for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
      const a = cell.a + da;
      const b = cell.b + db;

      // za hranou mřížky rám chybí, takže tam portál být nemůže
      if (a < 0 || a >= wide || b < 0 || b >= ISO_LEVELS) return null;

      const key = `${a},${b}`;
      if (seen.has(key)) continue;

      const block = build[planeKey(plane, at, a, b)];
      if (block) {
        if (block !== FRAME) return null;
        continue;
      }

      seen.add(key);
      queue.push({ a, b });
    }
  }
  return out;
}

/** Je plocha celý obdélník o rozměru portálu? */
function fits(cells: Flat[]): boolean {
  const as = cells.map((c) => c.a);
  const bs = cells.map((c) => c.b);
  const w = Math.max(...as) - Math.min(...as) + 1;
  const h = Math.max(...bs) - Math.min(...bs) + 1;

  return w >= PORTAL_MIN_WIDTH && h >= PORTAL_MIN_HEIGHT && cells.length === w * h;
}

/**
 * Buňky, které se mají kreslit jako plocha portálu, a rovina, ve které leží.
 * Prázdná mapa znamená „žádný portál“.
 */
export function portalCells(build: Build): Map<Cell, Plane> {
  const out = new Map<Cell, Plane>();
  if (!Object.keys(build).length) return out;

  for (const plane of ["y", "x"] as Plane[]) {
    const depth = plane === "y" ? ISO_DEPTH : ISO_COLS;
    const wide = plane === "y" ? ISO_COLS : ISO_DEPTH;

    for (let at = 0; at < depth; at++) {
      const done = new Set<Cell>();

      for (let a = 0; a < wide; a++) {
        for (let b = 0; b < ISO_LEVELS; b++) {
          const key = planeKey(plane, at, a, b);
          if (done.has(key) || build[key] || out.has(key)) continue;

          const area = enclosed(build, plane, at, { a, b }, wide);
          if (!area) continue;

          for (const cell of area) done.add(planeKey(plane, at, cell.a, cell.b));
          if (!fits(area)) continue;

          for (const cell of area) out.set(planeKey(plane, at, cell.a, cell.b), plane);
        }
      }
    }
  }
  return out;
}
