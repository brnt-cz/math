import { describe, expect, it } from "vitest";
import { MIN_BW, fitAt, gridFor, placements, type Space } from "../app/src/lib/wall";

/** Pruh na desktopu: kostka 64 px, výška 700 px, šířka pro zeď 235 px. */
const desktop: Space = { base: 64, height: 700, allowance: 235 };

describe("mřížka zdi", () => {
  it("sloupec se plní odspodu, teprve pak začíná další", () => {
    const grid = gridFor(20, 0, desktop);
    const spots = placements(20, grid);

    // prvních `rows` kostek je v prvním sloupci, řady jdou 0,1,2,…
    for (let i = 0; i < Math.min(grid.rows, 20); i++) {
      expect(spots[i]).toMatchObject({ row: i, col: 0 });
    }
    if (20 > grid.rows) expect(spots[grid.rows]).toMatchObject({ row: 0, col: 1 });
  });

  it("dokud se zeď vejde, nezmenšuje se", () => {
    const first = gridFor(1, 0, desktop);
    expect(first.level).toBe(0);
    expect(first.bw).toBe(64);

    let level = 0;
    for (let bricks = 1; bricks <= first.capacity; bricks++) {
      const grid = gridFor(bricks, level, desktop);
      level = grid.level;
      expect(grid.bw, `${bricks} kostek`).toBe(64);
    }
  });

  it("při přetečení se kostka zmenší skokem a všechny se vejdou", () => {
    let level = 0;
    for (const bricks of [10, 40, 70, 200, 600]) {
      const grid = gridFor(bricks, level, desktop);
      level = grid.level;
      expect(grid.capacity, `${bricks} kostek`).toBeGreaterThanOrEqual(bricks);
    }
  });

  it("zmenšování má dno", () => {
    const grid = gridFor(100000, 0, desktop);
    expect(grid.bw).toBeGreaterThanOrEqual(MIN_BW);
    expect(placements(100000, grid)).toHaveLength(grid.capacity);
  });

  it("zeď se nepřerovnává s každou kostkou", () => {
    let level = 0;
    let last = gridFor(1, level, desktop);
    let changes = 0;

    for (let bricks = 2; bricks <= 70; bricks++) {
      const grid = gridFor(bricks, level, desktop);
      level = grid.level;
      if (grid.bw !== last.bw || grid.maxCols !== last.maxCols) changes++;
      last = grid;
    }
    // v původní verzi to bylo ~6 změn na 70 kostek; plynulé zmenšování dělalo skoro 70
    expect(changes).toBeLessThan(10);
  });

  it("hystereze: po zmenšení se hned nezvětší zpátky", () => {
    const space: Space = { base: 64, height: 400, allowance: 150 };
    const small = fitAt(0, space);

    // přeteč kapacitu, ať se zmenší
    const shrunk = gridFor(small.capacity + 1, 0, space);
    expect(shrunk.level).toBeGreaterThan(0);

    // ubráním jedné kostky se úroveň nesmí vrátit
    const back = gridFor(small.capacity, shrunk.level, space);
    expect(back.level).toBe(shrunk.level);
  });

  it("index kostky se posouvá o uložené, aby si nezměnila druh", () => {
    const grid = gridFor(3, 0, desktop);
    expect(placements(3, grid, 300).map((p) => p.index)).toEqual([300, 301, 302]);
  });
});
