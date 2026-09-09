import { describe, expect, it } from "vitest";
import { BLOCKS, countTypes, type Block, type Counts } from "../app/src/lib/blocks";
import {
  BUILD_COLS,
  BUILD_ROWS,
  apply,
  cellKey,
  onCanvas,
  parseCell,
  sanitizeBuild,
  stock,
  type Build,
} from "../app/src/lib/inventory";

const BANKED = 300;

/** Invariant: v truhle + na ploše = nasbírané, pro každý druh. */
function checkInvariant(build: Build, banked = BANKED): void {
  const collected = countTypes(0, banked);
  const left = stock(banked, build);
  const placed = onCanvas(build);

  for (const type of BLOCKS) {
    expect((left[type] ?? 0) + (placed[type] ?? 0), type).toBe(collected[type] ?? 0);
  }
}

const firstType = (): Block => {
  const collected: Counts = countTypes(0, BANKED);
  return BLOCKS.find((b) => (collected[b] ?? 0) > 0) as Block;
};

describe("inventář a plocha", () => {
  it("buňky mimo mřížku a neznámé druhy se zahodí", () => {
    expect(parseCell("0,0")).toEqual({ x: 0, y: 0 });
    expect(parseCell(`${BUILD_COLS},0`)).toBeNull();
    expect(parseCell(`0,${BUILD_ROWS}`)).toBeNull();
    expect(parseCell("-1,0")).toBeNull();
    expect(parseCell("a,b")).toBeNull();

    expect(
      sanitizeBuild({ "1,1": "grass", "99,1": "stone", "2,2": "diamant", "x": "grass" }),
    ).toEqual({ "1,1": "grass" });

    expect(sanitizeBuild(null)).toEqual({});
    expect(sanitizeBuild("nesmysl")).toEqual({});
  });

  it("prázdná plocha: v truhle je všechno nasbírané", () => {
    checkInvariant({});
    const left = stock(BANKED, {});
    expect(Object.values(left).reduce((a, n) => a + (n ?? 0), 0)).toBe(BANKED);
  });

  it("položení ubere z truhly, sundání vrátí", () => {
    const type = firstType();
    let build: Build = {};

    build = apply(build, { kind: "place", cell: cellKey(3, 11), type }, BANKED)!;
    expect(build[cellKey(3, 11)]).toBe(type);
    checkInvariant(build);

    build = apply(build, { kind: "take", cell: cellKey(3, 11) }, BANKED)!;
    expect(build).toEqual({});
    checkInvariant(build);
  });

  it("na obsazenou buňku se položit nedá a sundat prázdnou taky ne", () => {
    const type = firstType();
    const build = apply({}, { kind: "place", cell: cellKey(1, 1), type }, BANKED)!;

    expect(apply(build, { kind: "place", cell: cellKey(1, 1), type }, BANKED)).toBeNull();
    expect(apply(build, { kind: "take", cell: cellKey(5, 5) }, BANKED)).toBeNull();
    expect(apply(build, { kind: "place", cell: "99,99", type }, BANKED)).toBeNull();
  });

  it("přesun na prázdnou projde, na obsazenou ne, na sebe taky ne", () => {
    const type = firstType();
    let build = apply({}, { kind: "place", cell: cellKey(2, 2), type }, BANKED)!;
    build = apply(build, { kind: "place", cell: cellKey(4, 4), type }, BANKED)!;

    const moved = apply(build, { kind: "move", from: cellKey(2, 2), to: cellKey(7, 7) }, BANKED)!;
    expect(moved[cellKey(7, 7)]).toBe(type);
    expect(moved[cellKey(2, 2)]).toBeUndefined();
    expect(Object.keys(moved)).toHaveLength(2);
    checkInvariant(moved);

    expect(apply(build, { kind: "move", from: cellKey(2, 2), to: cellKey(4, 4) }, BANKED)).toBeNull();
    expect(apply(build, { kind: "move", from: cellKey(2, 2), to: cellKey(2, 2) }, BANKED)).toBeNull();
    expect(apply(build, { kind: "move", from: cellKey(9, 9), to: cellKey(8, 8) }, BANKED)).toBeNull();
  });

  it("z čeho není zásoba, to se položit nedá", () => {
    const type = firstType();
    const collected = countTypes(0, BANKED);
    const have = collected[type] ?? 0;

    let build: Build = {};
    for (let i = 0; i < have; i++) {
      const next = apply(build, { kind: "place", cell: cellKey(i % BUILD_COLS, Math.floor(i / BUILD_COLS)), type }, BANKED);
      expect(next, `kostka ${i + 1} z ${have}`).not.toBeNull();
      build = next!;
    }

    expect(stock(BANKED, build)[type]).toBe(0);
    const free = cellKey(BUILD_COLS - 1, BUILD_ROWS - 1);
    expect(apply(build, { kind: "place", cell: free, type }, BANKED)).toBeNull();
    checkInvariant(build);
  });

  it("invariant drží přes sérii položení, přesunů a bourání", () => {
    let build: Build = {};
    const types = BLOCKS.slice();

    for (let i = 0; i < 60; i++) {
      const type = types[i % types.length] as Block;
      const next = apply(build, { kind: "place", cell: cellKey(i % BUILD_COLS, i % BUILD_ROWS), type }, BANKED);
      if (next) build = next;
    }
    checkInvariant(build);

    const keys = Object.keys(build);
    for (let i = 0; i < 10; i++) {
      const from = keys[i] as string;
      const moved = apply(build, { kind: "move", from, to: cellKey(15, i) }, BANKED);
      if (moved) build = moved;
    }
    checkInvariant(build);

    for (let i = 0; i < 15; i++) {
      const taken = apply(build, { kind: "take", cell: Object.keys(build)[0] as string }, BANKED);
      if (taken) build = taken;
    }
    checkInvariant(build);
  });

  it("uložený stav nezvětší zásobu nad nasbírané ani při poškození", () => {
    // 300 nasbíraných, ale ve stavbě je kostka mimo mřížku i neznámý druh
    const build = sanitizeBuild({ "1,1": "obsidian", "50,50": "obsidian", "2,2": "kytka" });
    expect(Object.keys(build)).toEqual(["1,1"]);
    checkInvariant(build);
  });
});
