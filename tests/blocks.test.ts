import { describe, expect, it } from "vitest";
import { BLOCKS, NAMES, SPRITES, blockFor, countTypes, spriteFor } from "../app/src/lib/blocks";

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

  it("každý vzhled má jméno do popisku", () => {
    for (const sprite of SPRITES) expect(NAMES[sprite], sprite).toBeTruthy();
  });
});
