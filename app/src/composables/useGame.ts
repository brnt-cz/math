/**
 * Stav appky. Drží to, co se ukládá (nastavení, série, zeď, truhly, stavba)
 * a průběh kola příkladů. Vykreslování je věc komponent, tady je jen logika.
 */

import { computed, reactive, watch } from "vue";
import { makeTask, type Task } from "../lib/generator";
import { blankCells, makePyramid, valueAt, type Cell, type Pyramid } from "../lib/pyramid";
import { BANK_SIZE, chestList, firstChestFull } from "../lib/chest";
import { countTypes, type Block } from "../lib/blocks";
import { apply, stock, type BuildAction } from "../lib/inventory";
import { turned } from "../lib/iso";
import { canBuild, remainingTasks, solved as solvedTask, spend } from "../lib/allowance";
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
    /** rozdělaná pyramida a co už je v ní doplněné */
    pyramid: null as Pyramid | null,
    filled: {} as Record<string, number>,
    /** cihla, do které se právě píše */
    cursor: null as Cell | null,
    /** režim stavění */
    building: false,
    picked: null as Block | null,
    wrecking: false,
  });

  /* ---------- ukládání ---------- */

  watch(
    () => [
      state.range,
      state.mode,
      state.terms,
      state.ops,
      state.best,
      state.tower,
      state.banked,
      state.build,
      state.turn,
      state.allowance,
    ],
    () => {
      save(store, {
        range: state.range,
        mode: state.mode,
        terms: state.terms,
        ops: state.ops,
        best: state.best,
        tower: state.tower,
        banked: state.banked,
        build: state.build,
        turn: state.turn,
        allowance: state.allowance,
      });
    },
    { deep: true },
  );

  /* ---------- truhly a stavění ---------- */

  const chests = computed(() => chestList(state.banked));
  const collected = computed(() => countTypes(0, state.banked));
  const inStock = computed(() => stock(state.banked, state.build, collected.value));

  /** Truhla je plná — stavění je vůbec ve hře. */
  const buildUnlocked = computed(() => {
    if (typeof location !== "undefined" && /[?&]stavet(=|&|$)/.test(location.search)) return true;
    return firstChestFull(chests.value);
  });

  /** ...a zbývá i čas. */
  const buildReady = computed(() => buildUnlocked.value && canBuild(state.allowance));
  const tasksToBuild = computed(() => remainingTasks(state.allowance));

  /** Odestavěné sekundy. Vrací true, když zásoba právě došla. */
  function spendBuildTime(seconds: number): boolean {
    if (!canBuild(state.allowance)) return false;

    state.allowance = spend(state.allowance, seconds);
    if (canBuild(state.allowance)) return false;

    state.building = false;
    note("Čas na stavění vypršel. Spočítej 30 příkladů a můžeš stavět dál.");
    return true;
  }

  function buildAction(action: BuildAction): boolean {
    const next = apply(state.build, action, state.banked, collected.value);
    if (!next) return false;
    state.build = next;
    return true;
  }

  /** Otočení plochy o krok doleva (−1) nebo doprava (+1). */
  function rotate(step: number): void {
    state.turn = turned(state.turn, step);
  }

  function setMode(on: boolean): void {
    state.building = on && buildReady.value;
    if (state.building) {
      state.wrecking = false;
      state.picked = null;
    }
  }

  /* ---------- pyramidy ---------- */

  const cellKey = (cell: Cell): string => `${cell.row},${cell.at}`;

  /** Prázdné cihly, které ještě nejsou doplněné — v pořadí, jak se dají vyřešit úvahou. */
  const openCells = computed(() =>
    state.pyramid ? blankCells(state.pyramid).filter((c) => !(cellKey(c) in state.filled)) : [],
  );

  function newPyramid(): void {
    state.pyramid = makePyramid({ range: state.range, base: state.terms });
    state.filled = {};
    state.cursor = openCells.value[0] ?? null;
  }

  /** Klepnutí na cihlu: psát jde jen do těch, co se doplňují. */
  function pickCell(cell: Cell): void {
    if (!openCells.value.some((c) => c.row === cell.row && c.at === cell.at)) return;

    state.cursor = cell;
    state.answer = "";
    state.locked = false;
    state.tries = 0;
  }

  /* ---------- kolo příkladů ---------- */

  function nextTask(): void {
    state.locked = false;
    state.tries = 0;
    state.answer = "";
    state.note = "";
    state.noteKind = "";

    if (state.mode === "pyramid") {
      // rozdělaná pyramida pokračuje další cihlou, hotová se vymění za novou
      if (!state.pyramid || !openCells.value.length) newPyramid();
      else state.cursor = openCells.value[0] ?? null;
      return;
    }

    state.task = makeTask({ range: state.range, terms: state.terms, ops: state.ops });
  }

  function startRound(): void {
    // nové kolo staví novou pyramidu: jinak by se změna šířky ani rozsahu
    // neprojevila, dokud by syn nedoplnil tu rozdělanou
    state.pyramid = null;
    state.filled = {};
    state.cursor = null;

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

  /**
   * Vyhodnocení jedné odpovědi. Sdílené pro příklad i pro cihlu pyramidy — obojí je
   * jedno číslo, jedna kostka do zdi a jedna tečka v kole.
   */
  function judge(expected: number, onRight: () => void): void {
    if (state.locked) return;

    if (state.answer.trim() === "") {
      note(state.mode === "pyramid" ? "Napiš číslo do cihly." : "Napiš výsledek.");
      return;
    }

    if (parseInt(state.answer, 10) === expected) {
      state.locked = true;
      state.allowance = solvedTask(state.allowance);
      onRight();
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
        : state.mode === "pyramid"
          ? `Do cihly patří ${expected} — napiš to.`
          : `Výsledek je ${expected} — napiš ho.`,
      "bad",
    );
    state.answer = "";
  }

  function check(): void {
    if (state.mode === "pyramid") {
      const cell = state.cursor;
      if (!state.pyramid || !cell) return;

      const value = valueAt(state.pyramid, cell);
      judge(value, () => void (state.filled[cellKey(cell)] = value));
      return;
    }

    if (!state.task) return;
    judge(state.task.result, () => {});
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
    openCells,
    pickCell,
    buildUnlocked,
    buildReady,
    tasksToBuild,
    summary,
    setMode,
    spendBuildTime,
    buildAction,
    rotate,
    startRound,
    typeDigit,
    backspace,
    check,
  };
}

export type Game = ReturnType<typeof useGame>;
