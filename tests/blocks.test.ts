import { describe, expect, it } from "vitest";
import { BLOCKS, NAMES, RARITY, SPRITES, blockFor, countTypes, spriteFor, type Block } from "../app/src/lib/blocks";

describe("druhy kostek a jejich vzhled", () => {
  it("tráva s kostkou nad sebou se kreslí jako hlína", () => {
    expect(spriteFor("grass", false)).toBe("grass");
    expect(spriteFor("grass", true)).toBe("dirt");
  });

  it("ostatní druhy se pod kostkou nemění", () => {
    for (const type of BLOCKS) {
      if (type === "grass") continue;
      expect(spriteFor(type, true), type).toBe(type);
      expect(spriteFor(type, false), type).toBe(type);
    }
  });

  it("hlína není druh kostky — v truhle ani ve zdi se neobjeví", () => {
    expect(BLOCKS).not.toContain("dirt");
    expect(SPRITES).toContain("dirt");

    // žádná nasbíraná kostka není hlína, takže se rarita ani počítání nemění
    for (let i = 0; i < 500; i++) expect(BLOCKS).toContain(blockFor(i));
    expect(Object.keys(countTypes(0, 500))).not.toContain("dirt");
  });

  it("přidání klády a dlažby nepřeházelo už nasbírané kostky", () => {
    // tabulka vzácnosti před nimi: kláda si vzala díl z prken (20 → 12 + 8),
    // dlažební kostka z kamene (24 → 14 + 10)
    const before: [Block, number][] = [
      ["grass", 27],
      ["stone", 24],
      ["plank", 20],
      ["sand", 15],
      ["nether", 9],
      ["obsidian", 5],
    ];

    const oldBlockFor = (index: number): Block => {
      let h = Math.imul(index + 1, 2654435761);
      h ^= h >>> 15;
      h = Math.imul(h, 668265263);
      h ^= h >>> 13;

      const roll = (h >>> 0) % 100;
      let acc = 0;
      for (const [type, share] of before) {
        acc += share;
        if (roll < acc) return type;
      }
      return "grass";
    };

    /** nový druh smí vzniknout jen ze svého příbuzného */
    const family: Partial<Record<Block, Block>> = { log: "plank", cobble: "stone" };
    const fresh: Partial<Record<Block, number>> = {};

    for (let i = 0; i < 4000; i++) {
      const now = blockFor(i);
      const was = oldBlockFor(i);
      const from = family[now];

      if (from) {
        expect(was, `kostka ${i}`).toBe(from);
        fresh[now] = (fresh[now] ?? 0) + 1;
      } else {
        expect(now, `kostka ${i}`).toBe(was);
      }
    }

    for (const type of Object.keys(family) as Block[]) {
      expect(fresh[type] ?? 0, type).toBeGreaterThan(0);
    }
  });

  it("vzácnosti dávají dohromady sto procent", () => {
    expect(BLOCKS.reduce((sum, type) => sum + RARITY[type], 0)).toBe(100);
  });

  it("každý vzhled má jméno do popisku", () => {
    for (const sprite of SPRITES) expect(NAMES[sprite], sprite).toBeTruthy();
  });
});
