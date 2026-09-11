/**
 * Uložený stav.
 *
 * Klíč i tvar dat musí zůstat stejné jako před refaktorem — syn nesmí přijít o zeď,
 * truhly ani stavbu. Načtení proto snese i starší podoby dat, včetně `ops` jako
 * textu ("mix", "add", "sub") z první verze.
 */

import { OP_KEYS, type Ops } from "./generator";
import { TURNS, type Turn } from "./iso";
import { BANK_SIZE } from "./chest";
import { sanitizeBuild, type Build } from "./inventory";

export const KEY = "matika-do-dvaceti";

export type State = {
  range: number;
  terms: number;
  ops: Ops;
  best: number;
  tower: number;
  banked: number;
  build: Build;
  /** otočení plochy na stavění, 0–3 */
  turn: Turn;
};

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function defaultState(): State {
  return {
    range: 10,
    terms: 2,
    ops: { add: true, sub: true, mul: false, div: false },
    best: 0,
    tower: 0,
    banked: 0,
    build: {},
    turn: 0,
  };
}

function readOps(raw: unknown, fallback: Ops): Ops {
  if (typeof raw === "string") {
    // první verze měla jen jeden přepínač: "add", "sub" nebo "mix"
    return { add: raw !== "sub", sub: raw !== "add", mul: false, div: false };
  }

  if (raw && typeof raw === "object") {
    const src = raw as Record<string, unknown>;
    const ops = { ...fallback };
    for (const key of OP_KEYS) ops[key] = !!src[key];
    if (!OP_KEYS.some((k) => ops[k])) ops.add = true;
    return ops;
  }
  return fallback;
}

function whole(raw: unknown, min = 0): number {
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > min ? n : min;
}

export function load(storage: StorageLike): State {
  const state = defaultState();

  let saved: Record<string, unknown> = {};
  try {
    saved = (JSON.parse(storage.getItem(KEY) ?? "{}") as Record<string, unknown>) ?? {};
  } catch {
    return state;
  }

  if (saved.range === 10 || saved.range === 20) state.range = saved.range;

  const terms = whole(saved.terms);
  if (terms >= 2 && terms <= 4) state.terms = terms;

  state.ops = readOps(saved.ops, state.ops);
  state.best = whole(saved.best);
  state.tower = whole(saved.tower);

  // v truhlách jsou vždy celé padesátky
  state.banked = whole(saved.banked) - (whole(saved.banked) % BANK_SIZE);
  state.build = sanitizeBuild(saved.build);

  // starší data otočení neznají, těm patří pohled bez otočení
  if (TURNS.includes(saved.turn as Turn)) state.turn = saved.turn as Turn;

  return state;
}

export function save(storage: StorageLike, state: State): void {
  try {
    storage.setItem(
      KEY,
      JSON.stringify({
        range: state.range,
        terms: state.terms,
        ops: state.ops,
        best: state.best,
        tower: state.tower,
        banked: state.banked,
        build: state.build,
        turn: state.turn,
      }),
    );
  } catch {
    /* nedostupné úložiště: appka funguje dál, jen si nic nezapamatuje */
  }
}
