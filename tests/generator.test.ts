import { describe, expect, it } from "vitest";
import {
  OP_KEYS,
  candidates,
  makeTask,
  taskText,
  type Config,
  type OpKey,
  type Task,
} from "../app/src/lib/generator";

/** Nezávislé vyhodnocení zápisu — hlídá, že priorita × ÷ v příkladu skutečně platí. */
function evaluate(task: Task): number {
  const expr = taskText(task).replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/");
  // eslint-disable-next-line no-new-func
  return Function(`return ${expr}`)() as number;
}

function cfg(range: number, terms: number, on: OpKey[]): Config {
  const ops = Object.fromEntries(OP_KEYS.map((k) => [k, on.includes(k)])) as Config["ops"];
  return { range, terms, ops };
}

/** Všechny neprázdné množiny znamének. */
const SETS: OpKey[][] = [];
for (let mask = 1; mask < 16; mask++) {
  SETS.push(OP_KEYS.filter((_, i) => mask & (1 << i)));
}

const SYM_TO_OP: Record<string, OpKey> = { "+": "add", "−": "sub", "×": "mul", "÷": "div" };

/**
 * Skutečné dělení sebou samým — tedy krok, kde se dělí právě tím, co v tu chvíli
 * v běhu je. Hledat to regexem `(\d+)÷\1` nejde: `3×6÷6` je 18÷6 a je v pořádku.
 */
function hasSelfDivision(task: Task): boolean {
  // rozděl na řetězce × ÷ (bloky), které se pak sčítají a odčítají
  let running = task.terms[0] as number;

  for (let i = 0; i < task.ops.length; i++) {
    const sym = task.ops[i] as string;
    const n = task.terms[i + 1] as number;

    if (sym === "×") {
      running = running * n;
    } else if (sym === "÷") {
      if (running === n) return true;
      running = running / n;
    } else {
      running = n; // nový blok, na hranici + − začíná řetězec znovu
    }
  }
  return false;
}

describe("generátor", () => {
  it("zápis odpovídá výsledku včetně priority × ÷", () => {
    for (const range of [10, 20]) {
      for (const terms of [2, 3, 4]) {
        for (const set of SETS) {
          const c = cfg(range, terms, set);
          for (let i = 0; i < 200; i++) {
            const task = makeTask(c);
            expect(evaluate(task), `${taskText(task)} @ ${range}/${terms}/${set}`).toBe(
              task.result,
            );
          }
        }
      }
    }
  });

  it("mezivýsledky zůstanou celé a v rozsahu, dělení je beze zbytku", () => {
    for (const range of [10, 20]) {
      for (const terms of [2, 3, 4]) {
        for (const set of SETS) {
          const c = cfg(range, terms, set);

          for (let i = 0; i < 200; i++) {
            const task = makeTask(c);

            for (const n of task.terms) {
              expect(Number.isInteger(n)).toBe(true);
              expect(n).toBeGreaterThanOrEqual(1);
              expect(n).toBeLessThanOrEqual(range);
            }

            expect(Number.isInteger(task.result)).toBe(true);
            expect(task.result).toBeGreaterThanOrEqual(0);
            expect(task.result).toBeLessThanOrEqual(range);
          }
        }
      }
    }
  });

  it("používá jen zaškrtnutá znaménka", () => {
    for (const set of SETS) {
      const c = cfg(20, 4, set);
      for (let i = 0; i < 200; i++) {
        const task = makeTask(c);
        for (const sym of task.ops) {
          const op = SYM_TO_OP[sym] as OpKey;
          // krajní záložní příklad 1+1 je povolený i tam, kde + zaškrtnuté není
          if (taskText(task) === "1+1") continue;
          expect(set, `${taskText(task)} @ ${set}`).toContain(op);
        }
      }
    }
  });

  it("má správný počet čísel", () => {
    for (const terms of [2, 3, 4]) {
      const c = cfg(20, terms, ["add", "sub"]);
      for (let i = 0; i < 200; i++) {
        const task = makeTask(c);
        expect(task.terms).toHaveLength(terms);
        expect(task.ops).toHaveLength(terms - 1);
      }
    }
  });

  it("v rozsahu do 20 jde většina příkladů přes desítku", () => {
    for (const terms of [2, 3, 4]) {
      for (const set of [["add", "sub"], ["add"], ["sub"], ["mul", "div"], OP_KEYS.slice()] as OpKey[][]) {
        const c = cfg(20, terms, set);
        let high = 0;
        const runs = 500;

        for (let i = 0; i < runs; i++) {
          const task = makeTask(c);
          if (Math.max(...task.terms, task.result) >= 11) high++;
        }

        const share = high / runs;
        expect(share, `${terms} čísla, ${set}`).toBeGreaterThan(0.75);
      }
    }
  });

  it("v rozsahu do 10 nikdy nepřeleze deset", () => {
    for (const terms of [2, 3, 4]) {
      const c = cfg(10, terms, OP_KEYS.slice());
      for (let i = 0; i < 300; i++) {
        const task = makeTask(c);
        expect(Math.max(...task.terms, task.result)).toBeLessThanOrEqual(10);
      }
    }
  });

  it("dělení sebou samým se nenabízí, dokud jde příklad sestavit jinak", () => {
    // pravidlo na úrovni kandidátů: 12 se nedělí dvanáctkou, dokud to není povolené
    expect(candidates("div", 12, 20, false)).toEqual([2, 3, 4, 6]);
    expect(candidates("div", 12, 20, true)).toEqual([2, 3, 4, 6, 12]);
    expect(candidates("div", 13, 20, false)).toEqual([]);
  });

  it("x÷x je vzácné tam, kde jde příklad sestavit jinak", () => {
    for (const [terms, limit] of [
      [2, 0.02],
      [3, 0.02],
      [4, 0.05],
    ] as [number, number][]) {
      const c = cfg(20, terms, ["mul", "div"]);
      let selfDiv = 0;
      const runs = 1000;

      for (let i = 0; i < runs; i++) if (hasSelfDivision(makeTask(c))) selfDiv++;
      expect(selfDiv / runs, `do 20, ${terms} čísla, jen × ÷`).toBeLessThan(limit);
    }
  });

  it("v „do 10, jen ÷, 4 čísla“ je x÷x nutné, jinak příklad neexistuje", () => {
    // 8÷2÷2÷2 potřebuje poslední krok 2÷2 — generátor to smí použít
    const c = cfg(10, 4, ["div"]);
    for (let i = 0; i < 50; i++) {
      const task = makeTask(c);
      expect(task.terms).toHaveLength(4);
      expect(evaluate(task)).toBe(task.result);
    }
  });

  it("se stejným generátorem náhody vyjde stejný příklad", () => {
    const seeded = () => {
      let s = 12345;
      return () => {
        s = (s * 1103515245 + 12345) % 2147483648;
        return s / 2147483648;
      };
    };

    const c = cfg(20, 3, ["add", "sub", "mul", "div"]);
    const a = makeTask(c, seeded());
    const b = makeTask(c, seeded());
    expect(taskText(a)).toBe(taskText(b));
    expect(a.result).toBe(b.result);
  });
});
