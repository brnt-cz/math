/**
 * Mřížka zdi.
 *
 * Sloupec se plní odspodu nahoru, teprve pak začíná další vedle. Když se zeď nevejde,
 * kostky se zmenší — ale **skokem a s rezervou při zvětšování**, aby se zeď nepřerovnávala
 * s každou přírůstkovou kostkou.
 */

/** Kolik šířky stránky smí zeď nejvýš zabrat. */
export const RAIL_SHARE = 0.32;
/** Mezera mezi sloupci zdi jako násobek šířky kostky. */
export const GAP_X = 0.18;
/** Pod tuhle velikost se kostka už nezmenšuje. */
export const MIN_BW = 13;
/** Zeď se zmenšuje skokem, ne plynule. */
export const ZOOM_STEP = 0.78;
export const MAX_ZOOM_LEVEL = 12;
/** Zvětšit zpátky až s touhle rezervou, ať zeď nepřeskakuje na hranici. */
const GROW_HEADROOM = 1.15;

export type Grid = {
  level: number;
  bw: number;
  rows: number;
  maxCols: number;
  capacity: number;
};

export type Space = {
  /** základní velikost kostky v px (z CSS) */
  base: number;
  /** dostupná výška pruhu v px */
  height: number;
  /** kolik px smí zeď zabrat na šířku */
  allowance: number;
};

export function fitAt(level: number, space: Space): Grid {
  const bw = Math.max(MIN_BW, space.base * Math.pow(ZOOM_STEP, level));
  const rows = Math.max(2, Math.floor((space.height - bw) / (bw * 0.75)) + 1);
  const stepX = bw * (1 + GAP_X);
  const maxCols = Math.max(1, Math.floor((space.allowance + bw * GAP_X) / stepX));

  return { level, bw, rows, maxCols, capacity: rows * maxCols };
}

/**
 * Mřížka pro daný počet kostek. `level` je předchozí úroveň zmenšení — vrací se nová,
 * takže volající si ji drží a hystereze funguje napříč voláními.
 */
export function gridFor(bricks: number, level: number, space: Space): Grid {
  let grid = fitAt(level, space);

  while (bricks > grid.capacity && grid.bw > MIN_BW && grid.level < MAX_ZOOM_LEVEL) {
    grid = fitAt(grid.level + 1, space);
  }

  while (grid.level > 0) {
    const bigger = fitAt(grid.level - 1, space);
    if (bricks * GROW_HEADROOM > bigger.capacity) break;
    grid = bigger;
  }
  return grid;
}

export type Placement = { index: number; row: number; col: number };

/**
 * Rozmístění kostek do mřížky. `offset` je počet kostek, které se při přetečení
 * nekreslí (nejstarší patra), `banked` posouvá index, aby si kostka po uložení
 * do truhly nezměnila druh.
 */
export function placements(bricks: number, grid: Grid, banked = 0): Placement[] {
  const visible = Math.min(bricks, grid.capacity);
  const offset = bricks - visible;
  const out: Placement[] = [];

  for (let i = 0; i < visible; i++) {
    out.push({
      index: banked + offset + i,
      row: i % grid.rows,
      col: Math.floor(i / grid.rows),
    });
  }
  return out;
}
