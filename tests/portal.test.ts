import { describe, expect, it } from "vitest";
import { ISO_LEVELS, voxelKey } from "../app/src/lib/iso";
import { portalCells } from "../app/src/lib/portal";
import type { Build } from "../app/src/lib/inventory";

/**
 * Postaví rám portálu v rovině y = `at`: vnitřek je `w × h` počínaje na `(x0, z0)`,
 * rám doléhá ze všech čtyř stran. `corners` přidá i rohy, které portál nepotřebuje.
 */
function frame(w: number, h: number, opts: { at?: number; x0?: number; z0?: number; corners?: boolean; block?: string } = {}): Build {
  const { at = 3, x0 = 2, z0 = 1, corners = false, block = "obsidian" } = opts;
  const build: Build = {};
  const put = (x: number, z: number) => {
    build[voxelKey(x, at, z)] = block as never;
  };

  for (let i = 0; i < w; i++) {
    put(x0 + i, z0 - 1);
    put(x0 + i, z0 + h);
  }
  for (let j = 0; j < h; j++) {
    put(x0 - 1, z0 + j);
    put(x0 + w, z0 + j);
  }
  if (corners) {
    put(x0 - 1, z0 - 1);
    put(x0 + w, z0 - 1);
    put(x0 - 1, z0 + h);
    put(x0 + w, z0 + h);
  }
  return build;
}

const inside = (w: number, h: number, at = 3, x0 = 2, z0 = 1): string[] => {
  const out: string[] = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) out.push(voxelKey(x0 + i, at, z0 + j));
  return out;
};

describe("nether portál", () => {
  it("rám 2 × 3 z obsidiánu portál zapálí", () => {
    const cells = portalCells(frame(2, 3));

    expect([...cells.keys()].sort()).toEqual(inside(2, 3).sort());
    for (const plane of cells.values()) expect(plane).toBe("y");
  });

  it("rohy rámu potřeba nejsou, ale nevadí", () => {
    expect(portalCells(frame(2, 3, { corners: true })).size).toBe(6);
  });

  it("větší portál se zapálí celý", () => {
    expect(portalCells(frame(3, 4)).size).toBe(12);
  });

  it("chybějící kostka v rámu portál nezapálí", () => {
    const broken = frame(2, 3);
    delete broken[voxelKey(2, 3, 0)];

    expect(portalCells(broken).size).toBe(0);
  });

  it("rám z jiného materiálu nestačí", () => {
    expect(portalCells(frame(2, 3, { block: "stone" })).size).toBe(0);
    expect(portalCells(frame(2, 3, { block: "cobble" })).size).toBe(0);
  });

  it("malý rám se nezapálí: potřeba jsou dvě na šířku a tři na výšku", () => {
    expect(portalCells(frame(1, 3)).size).toBe(0);
    expect(portalCells(frame(2, 2)).size).toBe(0);
    expect(portalCells(frame(1, 1)).size).toBe(0);
  });

  it("kostka ve vnitřku portál zhasne", () => {
    const blocked = frame(2, 3);
    blocked[voxelKey(2, 3, 2)] = "plank" as never;

    expect(portalCells(blocked).size).toBe(0);
  });

  it("portál stojí i v druhé rovině", () => {
    const build: Build = {};
    // rovina x = 5, vnitřek (y 2..3, z 1..3)
    for (const y of [2, 3]) {
      build[voxelKey(5, y, 0)] = "obsidian" as never;
      build[voxelKey(5, y, 4)] = "obsidian" as never;
    }
    for (const z of [1, 2, 3]) {
      build[voxelKey(5, 1, z)] = "obsidian" as never;
      build[voxelKey(5, 4, z)] = "obsidian" as never;
    }

    const cells = portalCells(build);
    expect(cells.size).toBe(6);
    for (const plane of cells.values()) expect(plane).toBe("x");
  });

  it("u hrany mřížky rám chybí, portál tedy nevzniká", () => {
    // vnitřek by sahal až na strop, kde už rám být nemůže
    expect(portalCells(frame(2, 3, { z0: ISO_LEVELS - 3 })).size).toBe(0);
    expect(portalCells(frame(2, 3, { x0: 0 })).size).toBe(0);
  });

  it("prázdná i obyčejná stavba portál nevyrobí", () => {
    expect(portalCells({}).size).toBe(0);

    const house: Build = {};
    for (let x = 2; x < 6; x++) for (let y = 2; y < 6; y++) house[voxelKey(x, y, 0)] = "plank" as never;
    expect(portalCells(house).size).toBe(0);
  });
});
