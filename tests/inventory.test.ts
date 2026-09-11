import { describe, expect, it } from "vitest";
import { BLOCKS, countTypes, type Block, type Counts } from "../app/src/lib/blocks";
import { ISO_COLS, ISO_DEPTH, ISO_LEVELS } from "../app/src/lib/iso";
import {
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

/** i-tá buňka scény, plní se po patrech — scéna má místo pro každou nasbíranou kostku. */
function nth(i: number): string {
  const level = Math.floor(i / (ISO_COLS * ISO_DEPTH));
  const rest = i % (ISO_COLS * ISO_DEPTH);
  return cellKey(rest % ISO_COLS, Math.floor(rest / ISO_COLS), level);
}

const firstType = (): Block => {
  const collected: Counts = countTypes(0, BANKED);
  return BLOCKS.find((b) => (collected[b] ?? 0) > 0) as Block;
};

describe("inventář a plocha", () => {
  it("buňky mimo scénu a neznámé druhy se zahodí", () => {
    expect(parseCell("0,0,0")).toEqual({ x: 0, y: 0, z: 0 });
    expect(parseCell(`${ISO_COLS},0,0`)).toBeNull();
    expect(parseCell(`0,0,${ISO_LEVELS}`)).toBeNull();
    expect(parseCell("-1,0,0")).toBeNull();
    expect(parseCell("a,b,c")).toBeNull();

    expect(
      sanitizeBuild({ "1,1,0": "grass", "99,1,0": "stone", "2,2,0": "diamant", "x": "grass" }),
    ).toEqual({ "1,1,0": "grass" });

    expect(sanitizeBuild(null)).toEqual({});
    expect(sanitizeBuild("nesmysl")).toEqual({});
  });

  it("stavba z ploché verze se převede, ne zahodí", () => {
    // starý klíč "x,y", kde y byla výška: sloupec se sesype k zemi
    const build = sanitizeBuild({ "2,3": "grass", "2,7": "stone", "5,0": "plank" });

    expect(build).toEqual({
      "2,0,0": "grass",
      "2,0,1": "stone",
      "5,0,0": "plank",
    });

    // co se do scény nevejde, zůstane v truhle
    expect(sanitizeBuild({ [`${ISO_COLS + 2},1`]: "grass" })).toEqual({});
    checkInvariant(build);
  });

  it("prázdná plocha: v truhle je všechno nasbírané", () => {
    checkInvariant({});
    const left = stock(BANKED, {});
    expect(Object.values(left).reduce((a, n) => a + (n ?? 0), 0)).toBe(BANKED);
  });

  it("položení ubere z truhly, sundání vrátí", () => {
    const type = firstType();
    let build: Build = {};

    build = apply(build, { kind: "place", cell: cellKey(3, 4, 1), type }, BANKED)!;
    expect(build[cellKey(3, 4, 1)]).toBe(type);
    checkInvariant(build);

    build = apply(build, { kind: "take", cell: cellKey(3, 4, 1) }, BANKED)!;
    expect(build).toEqual({});
    checkInvariant(build);
  });

  it("na obsazenou buňku se položit nedá a sundat prázdnou taky ne", () => {
    const type = firstType();
    const build = apply({}, { kind: "place", cell: cellKey(1, 1, 0), type }, BANKED)!;

    expect(apply(build, { kind: "place", cell: cellKey(1, 1, 0), type }, BANKED)).toBeNull();
    expect(apply(build, { kind: "take", cell: cellKey(5, 5, 0) }, BANKED)).toBeNull();
    expect(apply(build, { kind: "place", cell: "99,99,99", type }, BANKED)).toBeNull();
  });

  it("přesun na prázdnou projde, na obsazenou ne, na sebe taky ne", () => {
    const type = firstType();
    let build = apply({}, { kind: "place", cell: cellKey(2, 2, 0), type }, BANKED)!;
    build = apply(build, { kind: "place", cell: cellKey(4, 4, 0), type }, BANKED)!;

    const moved = apply(build, { kind: "move", from: cellKey(2, 2, 0), to: cellKey(7, 7, 0) }, BANKED)!;
    expect(moved[cellKey(7, 7, 0)]).toBe(type);
    expect(moved[cellKey(2, 2, 0)]).toBeUndefined();
    expect(Object.keys(moved)).toHaveLength(2);
    checkInvariant(moved);

    expect(apply(build, { kind: "move", from: cellKey(2, 2, 0), to: cellKey(4, 4, 0) }, BANKED)).toBeNull();
    expect(apply(build, { kind: "move", from: cellKey(2, 2, 0), to: cellKey(2, 2, 0) }, BANKED)).toBeNull();
    expect(apply(build, { kind: "move", from: cellKey(9, 9, 0), to: cellKey(8, 8, 0) }, BANKED)).toBeNull();
  });

  it("z čeho není zásoba, to se položit nedá", () => {
    const type = firstType();
    const collected = countTypes(0, BANKED);
    const have = collected[type] ?? 0;

    let build: Build = {};
    for (let i = 0; i < have; i++) {
      const next = apply(build, { kind: "place", cell: nth(i), type }, BANKED);
      expect(next, `kostka ${i + 1} z ${have}`).not.toBeNull();
      build = next!;
    }

    expect(stock(BANKED, build)[type]).toBe(0);
    const free = nth(have);
    expect(apply(build, { kind: "place", cell: free, type }, BANKED)).toBeNull();
    checkInvariant(build);
  });

  it("invariant drží přes sérii položení, přesunů a bourání", () => {
    let build: Build = {};
    const types = BLOCKS.slice();

    for (let i = 0; i < 60; i++) {
      const type = types[i % types.length] as Block;
      const next = apply(build, { kind: "place", cell: nth(i), type }, BANKED);
      if (next) build = next;
    }
    checkInvariant(build);

    const keys = Object.keys(build);
    for (let i = 0; i < 10; i++) {
      const from = keys[i] as string;
      const moved = apply(build, { kind: "move", from, to: nth(200 + i) }, BANKED);
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
    const build = sanitizeBuild({ "1,1,1": "obsidian", "50,50,50": "obsidian", "2,2,2": "kytka" });
    expect(Object.keys(build)).toEqual(["1,1,1"]);
    checkInvariant(build);
  });
});
