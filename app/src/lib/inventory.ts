/**
 * Stavění: inventář a plocha.
 *
 * Jediný ukládaný stav je mapa buněk `Build` ("x,y" → druh kostky). Kolik čeho zbývá
 * v truhle se **nikde neukládá** — počítá se jako nasbírané(druh) − kostky téhož druhu
 * na ploše. Nemůže tak vzniknout rozpor mezi dvěma čísly a poškozený localStorage
 * se sám srovná.
 *
 * Invariant: pro každý druh platí `v truhle + na ploše = nasbírané`.
 */

import { BLOCKS, countTypes, type Block, type Counts } from "./blocks";

/** Pevná logická mřížka, ať stavba vypadá stejně na telefonu i na tabletu. */
export const BUILD_COLS = 16;
export const BUILD_ROWS = 12;

export type Cell = string;
export type Build = Record<Cell, Block>;

export function cellKey(x: number, y: number): Cell {
  return `${x},${y}`;
}

export function parseCell(key: Cell): { x: number; y: number } | null {
  const m = /^(\d+),(\d+)$/.exec(key);
  if (!m) return null;

  const x = Number(m[1]);
  const y = Number(m[2]);
  if (x >= BUILD_COLS || y >= BUILD_ROWS) return null;

  return { x, y };
}

/** Očistí uloženou stavbu — vyhodí neznámé druhy i buňky mimo mřížku. */
export function sanitizeBuild(raw: unknown): Build {
  const build: Build = {};
  if (!raw || typeof raw !== "object") return build;

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!parseCell(key)) continue;
    if (!BLOCKS.includes(value as Block)) continue;
    build[key] = value as Block;
  }
  return build;
}

/** Kolik kostek kterého druhu je na ploše. */
export function onCanvas(build: Build): Counts {
  const counts: Counts = {};
  for (const type of Object.values(build)) {
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
}

/**
 * Zásoba v truhle po druzích. `collected` se počítá z uloženého počtu kostek —
 * volající si ho může nechat spočítat jednou a předat, aby se to nedělalo pořád.
 */
export function stock(banked: number, build: Build, collected = countTypes(0, banked)): Counts {
  const placed = onCanvas(build);
  const out: Counts = {};

  for (const type of BLOCKS) {
    out[type] = Math.max(0, (collected[type] ?? 0) - (placed[type] ?? 0));
  }
  return out;
}

export type BuildAction =
  | { kind: "place"; cell: Cell; type: Block }
  | { kind: "take"; cell: Cell }
  | { kind: "move"; from: Cell; to: Cell };

/**
 * Provede akci a vrátí novou mapu buněk, nebo `null`, když akce nejde
 * (obsazená buňka, prázdný zdroj, nedostatek kostek).
 */
export function apply(
  build: Build,
  action: BuildAction,
  banked: number,
  collected = countTypes(0, banked),
): Build | null {
  if (action.kind === "place") {
    if (!parseCell(action.cell) || build[action.cell]) return null;
    if ((stock(banked, build, collected)[action.type] ?? 0) <= 0) return null;

    return { ...build, [action.cell]: action.type };
  }

  if (action.kind === "take") {
    if (!build[action.cell]) return null;

    const next = { ...build };
    delete next[action.cell];
    return next;
  }

  const type = build[action.from];
  if (!type || !parseCell(action.to)) return null;
  if (action.from === action.to || build[action.to]) return null;

  const next = { ...build };
  delete next[action.from];
  next[action.to] = type;
  return next;
}
