/**
 * Stav appky. Drží to, co se ukládá (nastavení, série, zeď, truhly, stavba)
 * a průběh kola příkladů. Vykreslování je věc komponent, tady je jen logika.
 */

import { computed, reactive, watch } from "vue";
import { makeTask, type Task } from "../lib/generator";
import { BANK_SIZE, chestList, firstChestFull } from "../lib/chest";
import { countTypes, type Block } from "../lib/blocks";
import { apply, stock, type BuildAction } from "../lib/inventory";
import { load, save, type State } from "../lib/storage";

/** Kolik příkladů má jedno kolo. */
export const ROUND = 10;
/** Po třech omylech napovíme, ať syn neuvízne. */
export const HINT_AFTER = 3;

export type Mark = "first" | "second" | "miss";
export type NoteKind = "" | "ok" | "bad";

function fallbackStorage() {
  const data: Record<string, string> = {};
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
  };
}

const store = typeof localStorage === "undefined" ? fallbackStorage() : localStorage;

export function useGame() {
  const saved: State = load(store);

  const state = reactive({
    ...saved,
    /** aktuální nepřerušená řada napoprvé */
    streak: 0,
    /** nejdelší řada v tomto kole */
    roundBest: 0,
    task: null as Task | null,
    answer: "",
    tries: 0,
    locked: false,
    note: "",
    noteKind: "" as NoteKind,
    results: [] as Mark[],
    done: false,
    /** režim stavění */
    building: false,
    picked: null as Block | null,
    wrecking: false,
  });

  /* ---------- ukládání ---------- */

  watch(
    () => [state.range, state.terms, state.ops, state.best, state.tower, state.banked, state.build],
    () => {
      save(store, {
        range: state.range,
        terms: state.terms,
        ops: state.ops,
        best: state.best,
        tower: state.tower,
        banked: state.banked,
        build: state.build,
      });
    },
    { deep: true },
  );

  /* ---------- truhly a stavění ---------- */

  const chests = computed(() => chestList(state.banked));
  const collected = computed(() => countTypes(0, state.banked));
  const inStock = computed(() => stock(state.banked, state.build, collected.value));

  const buildUnlocked = computed(() => {
    if (typeof location !== "undefined" && /[?&]stavet(=|&|$)/.test(location.search)) return true;
    return firstChestFull(chests.value);
  });

  function buildAction(action: BuildAction): boolean {
    const next = apply(state.build, action, state.banked, collected.value);
    if (!next) return false;
    state.build = next;
    return true;
  }

  function setMode(on: boolean): void {
    state.building = on && buildUnlocked.value;
    if (state.building) {
      state.wrecking = false;
      state.picked = null;
    }
  }

  /* ---------- kolo příkladů ---------- */

  function nextTask(): void {
    state.locked = false;
    state.tries = 0;
    state.answer = "";
    state.note = "";
    state.noteKind = "";
    state.task = makeTask({ range: state.range, terms: state.terms, ops: state.ops });
  }

  function startRound(): void {
    state.results = [];
    state.streak = 0;
    state.roundBest = 0;
    state.done = false;
    nextTask();
  }

  function note(text: string, kind: NoteKind = ""): void {
    state.note = text;
    state.noteKind = kind;
  }

  /** Přidá kostku do zdi. Vrací true, když se zeď právě uložila do truhly. */
  function addBrick(): boolean {
    state.tower += 1;
    if (state.tower < BANK_SIZE) return false;

    state.tower -= BANK_SIZE;
    state.banked += BANK_SIZE;
    return true;
  }

  function dropBrick(): void {
    if (state.tower > 0) state.tower -= 1;
  }

  function typeDigit(digit: string): void {
    if (state.locked || state.answer.length >= 2) return;
    state.answer = (state.answer + digit).replace(/^0(?=\d)/, "");
  }

  function backspace(): void {
    if (state.locked) return;
    state.answer = state.answer.slice(0, -1);
  }

  function advance(mark: Mark): void {
    state.results.push(mark);

    if (state.results.length >= ROUND) {
      setTimeout(() => void (state.done = true), 500);
      return;
    }
    setTimeout(nextTask, mark === "first" ? 550 : 800);
  }

  function check(): void {
    if (state.locked || !state.task) return;

    if (state.answer.trim() === "") {
      note("Napiš výsledek.");
      return;
    }

    if (parseInt(state.answer, 10) === state.task.result) {
      state.locked = true;
      note((state.tries === 0 ? "Správně!" : "Správně, teď to je!") + " Kostka nahoru.", "ok");

      if (addBrick()) {
        note(
          state.banked === BANK_SIZE
            ? "Padesát kostek! Zeď je uložená v truhle."
            : state.banked === 2 * BANK_SIZE
              ? "Dalších padesát — z truhly je velká truhla!"
              : "Dalších padesát kostek do truhly!",
          "ok",
        );
      }

      if (state.tries === 0) {
        state.streak += 1;
        state.roundBest = Math.max(state.roundBest, state.streak);
        state.best = Math.max(state.best, state.streak);
      } else {
        state.streak = 0;
      }

      advance(state.tries === 0 ? "first" : state.tries === 1 ? "second" : "miss");
      return;
    }

    /* Špatná odpověď příklad nezruší — zůstává, dokud ho syn nedopočítá.
       Každý omyl sundá kostku, ale po nápovědě už zeď nebouráme. */
    state.streak = 0;
    state.tries += 1;
    if (state.tries <= HINT_AFTER) dropBrick();

    note(
      state.tries < HINT_AFTER
        ? "Ještě jednou, zkus to znovu."
        : `Výsledek je ${state.task.result} — napiš ho.`,
      "bad",
    );
    state.answer = "";
  }

  /** Souhrn kola pro výsledkovou obrazovku. */
  const summary = computed(() => {
    const first = state.results.filter((r) => r === "first").length;
    const second = state.results.filter((r) => r === "second").length;
    const hinted = state.results.filter((r) => r === "miss").length;

    const parts = [`nejdelší řada za sebou ${state.roundBest}`];
    if (second) parts.push(`${second} na druhý pokus`);
    if (hinted) parts.push(`${hinted} s nápovědou`);
    parts.push(state.banked ? `zeď ${state.tower} · truhla ${state.banked}` : `zeď má ${state.tower}`);

    return {
      first,
      stars: first >= 9 ? 3 : first >= 6 ? 2 : first >= 3 ? 1 : 0,
      text: parts.join(" · "),
    };
  });

  startRound();

  return {
    state,
    chests,
    collected,
    inStock,
    buildUnlocked,
    summary,
    setMode,
    buildAction,
    startRound,
    typeDigit,
    backspace,
    check,
  };
}

export type Game = ReturnType<typeof useGame>;
