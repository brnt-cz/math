/**
 * Stavění: inventář a plocha.
 *
 * Jediný ukládaný stav je mapa buněk `Build` ("x,y,z" → druh kostky). Kolik čeho zbývá
 * v truhle se **nikde neukládá** — počítá se jako nasbírané(druh) − kostky téhož druhu
 * na ploše. Nemůže tak vzniknout rozpor mezi dvěma čísly a poškozený localStorage
 * se sám srovná.
 *
 * Invariant: pro každý druh platí `v truhle + na ploše = nasbírané`.
 *
 * Souřadnice a promítání na obrazovku řeší `iso.ts`.
 */

import { BLOCKS, countTypes, type Block, type Counts } from "./blocks";
import { ISO_COLS, ISO_LEVELS, parseVoxel, voxelKey, type Voxel } from "./iso";

export type Cell = string;
export type Build = Record<Cell, Block>;

export function cellKey(x: number, y: number, z: number): Cell {
  return voxelKey(x, y, z);
}

export function parseCell(key: Cell): Voxel | null {
  return parseVoxel(key);
}

/**
 * Stavba z první verze stavění: plocha byla svislá zeď, klíč "x,y" a `y` byla výška.
 * Převede se na zeď vzadu (`y = 0`) a kostky v každém sloupci se **sesypou k zemi**,
 * aby ve stavbě nezůstaly mezery po kostkách mimo scénu. Co se nevejde, zůstane
 * v truhle — zásoba se počítá z toho, co na ploše je.
 */
function migrateFlat(raw: Record<string, unknown>): Build {
  const columns = new Map<number, { at: number; type: Block }[]>();

  for (const [key, value] of Object.entries(raw)) {
    const m = /^(\d+),(\d+)$/.exec(key);
    if (!m || !BLOCKS.includes(value as Block)) continue;

    const x = Number(m[1]);
    if (x >= ISO_COLS) continue;

    const column = columns.get(x) ?? [];
    column.push({ at: Number(m[2]), type: value as Block });
    columns.set(x, column);
  }

  const build: Build = {};
  for (const [x, column] of columns) {
    column.sort((a, b) => a.at - b.at);
    column.slice(0, ISO_LEVELS).forEach((item, z) => {
      build[cellKey(x, 0, z)] = item.type;
    });
  }
  return build;
}

/** Očistí uloženou stavbu — vyhodí neznámé druhy i buňky mimo scénu. */
export function sanitizeBuild(raw: unknown): Build {
  const build: Build = {};
  if (!raw || typeof raw !== "object") return build;

  const entries = Object.entries(raw as Record<string, unknown>);
  const flat = entries.length > 0 && entries.every(([key]) => /^\d+,\d+$/.test(key));
  if (flat) return migrateFlat(raw as Record<string, unknown>);

  for (const [key, value] of entries) {
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
 * (obsazená buňka, buňka mimo scénu, prázdný zdroj, nedostatek kostek).
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
