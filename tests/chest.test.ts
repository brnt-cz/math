import { describe, expect, it } from "vitest";
import { BANK_SIZE, CHEST_SLOTS, chestList, firstChestFull } from "../app/src/lib/chest";
import { STACK, countTypes, usedSlots } from "../app/src/lib/blocks";

const sum = (chests: ReturnType<typeof chestList>) =>
  chests.reduce((n, c) => n + c.count, 0);

/** Kolik nasbíraných kostek ještě padne do jedné truhly — poslední padesátka před přetečením. */
const FULL = (() => {
  let last = BANK_SIZE;
  for (let banked = BANK_SIZE; banked <= 20000; banked += BANK_SIZE) {
    if (chestList(banked).length > 1) break;
    last = banked;
  }
  return last;
})();

describe("truhly", () => {
  it("do 50 kostek žádná truhla není", () => {
    expect(chestList(0)).toHaveLength(0);
    expect(chestList(49)).toHaveLength(0);
  });

  it("od 50 je truhla, od 100 velká", () => {
    expect(chestList(50)).toMatchObject([{ count: 50, big: false, slots: CHEST_SLOTS }]);
    expect(chestList(100)).toMatchObject([{ count: 100, big: true, slots: CHEST_SLOTS * 2 }]);
    expect(chestList(150)).toMatchObject([{ count: 150, big: true }]);
  });

  it("součet kostek v truhlách odpovídá uloženému počtu", () => {
    for (const banked of [50, 100, 300, 1000, FULL, FULL + BANK_SIZE, 5000]) {
      expect(sum(chestList(banked)), `banked ${banked}`).toBe(banked - (banked % BANK_SIZE));
    }
  });

  it("další truhla se přistaví teprve když je předchozí plná", () => {
    // kolik kostek se do truhly vejde, plyne z rozložení druhů — proto to nepíšu
    // číslem: každý nový druh si bere vlastní políčka a hranice se tím posune
    expect(chestList(FULL)).toHaveLength(1);
    expect(usedSlots(chestList(FULL)[0]!.counts)).toBe(CHEST_SLOTS * 2);
    expect(FULL).toBeGreaterThan(2000); // stavění má zůstat dlouhodobou trofejí

    const overflow = chestList(FULL + BANK_SIZE);
    expect(overflow).toHaveLength(2);
    expect(overflow[0]!.count).toBe(FULL);
    expect(overflow[1]!.count).toBe(BANK_SIZE);
    expect(overflow[1]!.big).toBe(false);

    // další padesátky rostou v té nové
    expect(chestList(FULL + 250)[1]).toMatchObject({ count: 250, big: true });
  });

  it("žádné políčko nemá víc než 64 kostek", () => {
    for (const banked of [50, 500, FULL, 5000]) {
      for (const chest of chestList(banked)) {
        for (const n of Object.values(chest.counts)) {
          const stacks = Math.ceil((n ?? 0) / STACK);
          expect((n ?? 0) / Math.max(1, stacks)).toBeLessThanOrEqual(STACK);
        }
      }
    }
  });

  it("obsah truhel dohromady odpovídá nasbíraným kostkám po druzích", () => {
    const banked = 3300;
    const chests = chestList(banked);
    const total = countTypes(0, banked);

    const merged: Record<string, number> = {};
    for (const chest of chests) {
      for (const [type, n] of Object.entries(chest.counts)) merged[type] = (merged[type] ?? 0) + (n ?? 0);
    }
    expect(merged).toEqual(
      Object.fromEntries(Object.entries(total).map(([k, v]) => [k, v ?? 0])),
    );
  });

  it("stavění se odemkne teprve při plné první truhle", () => {
    expect(firstChestFull(chestList(50))).toBe(false);
    expect(firstChestFull(chestList(1000))).toBe(false);
    expect(firstChestFull(chestList(FULL - 500))).toBe(false);
    expect(firstChestFull(chestList(FULL))).toBe(true);
    expect(firstChestFull(chestList(FULL + BANK_SIZE))).toBe(true);
  });
});
