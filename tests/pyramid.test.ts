import { describe, expect, it } from "vitest";
import {
  blankCells,
  blanksFor,
  build,
  cellsOf,
  isKnown,
  makePyramid,
  randomBottom,
  solvable,
  solveOrder,
  valueAt,
  weights,
  widthOf,
  type Pyramid,
  type Rng,
} from "../app/src/lib/pyramid";

const SIZES = [2, 3, 4];
const RANGES = [10, 20];

/** Nezávislá kontrola: každá cihla je součet dvou pod sebou. */
function sumsHold(p: Pyramid): boolean {
  for (let row = 1; row < p.rows.length; row++) {
    const below = p.rows[row - 1] as number[];
    const here = p.rows[row] as number[];

    for (let at = 0; at < here.length; at++) {
      if (here[at] !== (below[at] as number) + (below[at + 1] as number)) return false;
    }
  }
  return true;
}

describe("počítací pyramida", () => {
  it("patra se zužují a cihel je správný počet", () => {
    expect(widthOf(4, 0)).toBe(4);
    expect(widthOf(4, 3)).toBe(1);
    expect(cellsOf(4)).toHaveLength(4 + 3 + 2 + 1);
    expect(cellsOf(2)).toHaveLength(3);
  });

  it("stavba odspodu sčítá a hlídá rozsah", () => {
    expect(build([1, 2, 3], 20)).toEqual([[1, 2, 3], [3, 5], [8]]);

    // 9 + 9 = 18 se do desítky nevejde
    expect(build([9, 9], 10)).toBeNull();
    expect(build([9, 9], 20)).toEqual([[9, 9], [18]]);
  });

  it("každá cihla je součet dvou pod sebou a všechno je v rozsahu", () => {
    for (const range of RANGES) {
      for (const base of SIZES) {
        for (let i = 0; i < 200; i++) {
          const p = makePyramid({ range, base });

          expect(sumsHold(p), `${range}/${base}`).toBe(true);
          expect(p.rows).toHaveLength(base);

          for (const cell of cellsOf(base)) {
            const n = valueAt(p, cell);
            expect(Number.isInteger(n)).toBe(true);
            expect(n).toBeGreaterThanOrEqual(1);
            expect(n).toBeLessThanOrEqual(range);
          }
        }
      }
    }
  });

  it("pyramida je vždycky jednoznačně řešitelná úvahou", () => {
    for (const range of RANGES) {
      for (const base of SIZES) {
        for (let i = 0; i < 200; i++) {
          const p = makePyramid({ range, base });

          expect(solvable(p), `${range}/${base}`).toBe(true);
          expect(blankCells(p)).toHaveLength(blanksFor(base));
        }
      }
    }
  });

  it("prázdné cihly padají nahoru i dolů", () => {
    const rows = { bottom: 0, middle: 0, top: 0 };

    for (let i = 0; i < 400; i++) {
      const p = makePyramid({ range: 20, base: 3 });
      for (const cell of cellsOf(3)) {
        if (isKnown(p, cell)) continue;
        if (cell.row === 0) rows.bottom++;
        else if (cell.row === 1) rows.middle++;
        else rows.top++;
      }
    }

    // díra dole nutí odčítat, díra nahoře je sčítání — chceme obojí
    expect(rows.bottom).toBeGreaterThan(0);
    expect(rows.middle).toBeGreaterThan(0);
    expect(rows.top).toBeGreaterThan(0);
  });

  it("nejednoznačné zadání se pozná", () => {
    const rows = build([2, 3, 4], 20) as number[][];

    // zadané jen prostřední patro: vrchol se dopočítá, ale základna má nekonečno řešení
    // (5 = a + b, 7 = b + c drží jeden volný parametr)
    const ambiguous: Pyramid = {
      rows,
      known: [[false, false, false], [true, true], [false]],
    };
    expect(solvable(ambiguous)).toBe(false);

    // jen vrchol taky nestačí
    expect(solvable({ rows, known: [[false, false, false], [false, false], [true]] })).toBe(false);

    // dvě díry vedle sebe dole ale vadit nemusí: když je nad nimi celé patro, dopočítají se
    expect(solvable({ rows, known: [[false, false, true], [true, true], [true]] })).toBe(true);
  });

  it("postup doplňování je návod, jak na to", () => {
    const rows = build([2, 3, 4], 20) as number[][];
    const known = [[true, false, true], [true, true], [true]];

    // 3 se dopočítá z 5 − 2 (ze součtu a sourozence)
    expect(solveOrder(3, known)).toEqual([{ row: 0, at: 1 }]);

    // z prázdné základny se nedá nic
    expect(solveOrder(3, [[false, false, false], [false, false], [false]])).toEqual([]);
    expect(rows[2]).toEqual([12]);
  });

  it("základna se do rozsahu vejde z konstrukce, ne náhodou", () => {
    expect(weights(2)).toEqual([1, 1]);
    expect(weights(3)).toEqual([1, 2, 1]);
    expect(weights(4)).toEqual([1, 3, 3, 1]);

    for (const range of RANGES) {
      for (const base of SIZES) {
        for (let i = 0; i < 300; i++) {
          const bottom = randomBottom(base, range, Math.random) as number[];

          expect(bottom).toHaveLength(base);
          expect(Math.min(...bottom)).toBeGreaterThanOrEqual(1);
          // vrchol je největší cihla, takže stačí hlídat jeho
          expect(build(bottom, range), `${range}/${base}: ${bottom}`).not.toBeNull();
        }
      }
    }
  });

  it("se stejným generátorem náhody vyjde stejná pyramida", () => {
    const seeded = (): Rng => {
      let s = 9876;
      return () => {
        s = (s * 1103515245 + 12345) % 2147483648;
        return s / 2147483648;
      };
    };

    const a = makePyramid({ range: 20, base: 3 }, seeded());
    const b = makePyramid({ range: 20, base: 3 }, seeded());
    expect(a).toEqual(b);
  });

  it("v dvacítce pyramidy převážně přelezou desítku", () => {
    for (const base of SIZES) {
      let high = 0;
      const runs = 300;

      for (let i = 0; i < runs; i++) {
        const p = makePyramid({ range: 20, base });
        const top = valueAt(p, { row: base - 1, at: 0 });
        if (top >= 11) high++;
      }
      expect(high / runs, `základna ${base}`).toBeGreaterThan(0.6);
    }
  });
});
