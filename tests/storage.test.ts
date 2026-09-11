import { describe, expect, it } from "vitest";
import { KEY, defaultState, load, save, type State, type StorageLike } from "../app/src/lib/storage";

function memory(initial?: string): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  if (initial !== undefined) data[KEY] = initial;
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe("uložený stav", () => {
  it("bez dat vrátí výchozí nastavení", () => {
    expect(load(memory())).toEqual(defaultState());
  });

  it("poškozená data appku nepoloží", () => {
    expect(load(memory("{tohle není json"))).toEqual(defaultState());
    expect(load(memory("null"))).toEqual(defaultState());
    expect(load(memory("[]"))).toEqual(defaultState());
  });

  it("načte a uloží tvar dat beze změny", () => {
    const state: State = {
      range: 20,
      terms: 4,
      ops: { add: true, sub: true, mul: true, div: false },
      best: 9,
      tower: 17,
      banked: 300,
      build: { "3,4,0": "grass", "4,4,1": "stone" },
      turn: 2,
    };

    const store = memory();
    save(store, state);
    expect(load(store)).toEqual(state);

    // a v úložišti je opravdu původní klíč a stejná pole
    expect(Object.keys(JSON.parse(store.data[KEY] as string)).sort()).toEqual(
      ["banked", "best", "build", "ops", "range", "terms", "tower", "turn"],
    );
  });

  it("syn nepřijde o zeď, truhly ani stavbu", () => {
    const store = memory(
      JSON.stringify({ range: 20, terms: 3, ops: { add: true, sub: true, mul: false, div: false }, best: 12, tower: 23, banked: 3300, build: { "5,2,0": "plank" } }),
    );
    const state = load(store);

    expect(state.tower).toBe(23);
    expect(state.banked).toBe(3300);
    expect(state.best).toBe(12);
    expect(state.build).toEqual({ "5,2,0": "plank" });
  });

  it("otočení plochy přežije zavření, stará data ho neznají", () => {
    const store = memory(JSON.stringify({ banked: 300, turn: 3 }));
    expect(load(store).turn).toBe(3);

    // starý stav ani nesmysl otočení nemá, patří mu pohled bez otočení
    expect(load(memory(JSON.stringify({ banked: 300 }))).turn).toBe(0);
    expect(load(memory(JSON.stringify({ turn: 7 }))).turn).toBe(0);
    expect(load(memory(JSON.stringify({ turn: "vlevo" }))).turn).toBe(0);
  });

  it("rozumí starému formátu znamének jako textu", () => {
    const mix = load(memory(JSON.stringify({ ops: "mix" })));
    expect(mix.ops).toEqual({ add: true, sub: true, mul: false, div: false });

    const add = load(memory(JSON.stringify({ ops: "add" })));
    expect(add.ops).toEqual({ add: true, sub: false, mul: false, div: false });

    const sub = load(memory(JSON.stringify({ ops: "sub" })));
    expect(sub.ops).toEqual({ add: false, sub: true, mul: false, div: false });
  });

  it("aspoň jedno znaménko zůstane zaškrtnuté", () => {
    const none = load(memory(JSON.stringify({ ops: { add: false, sub: false, mul: false, div: false } })));
    expect(none.ops.add).toBe(true);
  });

  it("nesmyslné hodnoty se srovnají", () => {
    const state = load(
      memory(JSON.stringify({ range: 15, terms: 9, best: -5, tower: "abc", banked: 3299 })),
    );
    expect(state.range).toBe(10);          // jen 10 nebo 20
    expect(state.terms).toBe(2);           // jen 2–4
    expect(state.best).toBe(0);
    expect(state.tower).toBe(0);
    expect(state.banked).toBe(3250);       // v truhlách jsou celé padesátky
  });

  it("nedostupné úložiště nevyhodí chybu", () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error("zakázáno");
      },
      setItem: () => {
        throw new Error("zakázáno");
      },
    };
    expect(() => save(broken, defaultState())).not.toThrow();
    expect(() => load(broken)).not.toThrow();
    expect(load(broken)).toEqual(defaultState());
  });
});
