/**
 * Izometrie plochy na stavění.
 *
 * Kostky v SVG **už izometrické kostky jsou**: obal je čtverec 32 × 32 a hrana kostky
 * je 16 jednotek, tedy polovina obalu. Stačí je proto správně rozmístit — grafika se
 * nemění vůbec. Rozměry se tady počítají v násobcích obalu (`s`), CSS si je pak
 * vynásobí velikostí kostky.
 *
 * Osy: `x` doprava dopředu, `y` doleva dopředu, `z` nahoru. Na obrazovce
 *
 *     x → (+s/2, +s/4)      y → (−s/2, +s/4)      z → (0, −s/2)
 *
 * Dva body splynou, právě když se liší o násobek (1, 1, 1) — to je směr pohledu.
 * Větší `x + y + z` je proto blíž k divákovi a **kreslí se později**.
 */

/** Logická mřížka: šířka, hloubka a kolik pater se dá postavit. */
export const ISO_COLS = 16;
export const ISO_DEPTH = 16;
/** Pater je víc, než se obvykle vejde na výšku — volné místo nad podlahou se tím využije. */
export const ISO_LEVELS = 8;

export type Voxel = { x: number; y: number; z: number };

/** Stěny, které jsou z tohohle pohledu vidět. */
export type Face = "top" | "right" | "left";
export const FACES: Face[] = ["top", "right", "left"];

export function voxelKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function inScene(v: Voxel): boolean {
  return (
    Number.isInteger(v.x) &&
    Number.isInteger(v.y) &&
    Number.isInteger(v.z) &&
    v.x >= 0 &&
    v.x < ISO_COLS &&
    v.y >= 0 &&
    v.y < ISO_DEPTH &&
    v.z >= 0 &&
    v.z < ISO_LEVELS
  );
}

/** Rozebere klíč buňky; mimo scénu vrací `null`. */
export function parseVoxel(key: string): Voxel | null {
  const m = /^(\d+),(\d+),(\d+)$/.exec(key);
  if (!m) return null;

  const v = { x: Number(m[1]), y: Number(m[2]), z: Number(m[3]) };
  return inScene(v) ? v : null;
}

/**
 * Kam přijde kostka při klepnutí na stěnu. Boční stěny kladou dopředu, takže se
 * dají dělat převisy a oblouky — a nová kostka vždycky na něco navazuje.
 */
export function neighbor(v: Voxel, face: Face): Voxel {
  if (face === "top") return { x: v.x, y: v.y, z: v.z + 1 };
  if (face === "right") return { x: v.x + 1, y: v.y, z: v.z };
  return { x: v.x, y: v.y + 1, z: v.z };
}

/** Pořadí kreslení: vzestupně, protože směr pohledu je (1, 1, 1). */
export function depth(v: Voxel): number {
  return v.x + v.y + v.z;
}

/**
 * Scéna je vysoká jen na tolik pater, kolik je potřeba (`levels`), a podlaha drží dole.
 * Stavba tak roste vzhůru do volného místa a plocha se pod rukama nepřerovnává.
 */
export function levelsFor(highest: number): number {
  return Math.min(ISO_LEVELS, Math.max(2, highest + 2));
}

/** Levý horní kout obalu kostky v násobcích jeho velikosti. */
export function boxAt(v: Voxel, levels = ISO_LEVELS): { left: number; top: number } {
  return {
    left: (v.x - v.y + ISO_DEPTH - 1) / 2,
    top: (v.x + v.y) / 4 + (levels - 1 - v.z) / 2,
  };
}

/** Rozměr celé scény v násobcích velikosti kostky. */
export function sceneSize(levels = ISO_LEVELS): { w: number; h: number } {
  return {
    w: (ISO_COLS + ISO_DEPTH) / 2,
    h: (ISO_COLS + ISO_DEPTH - 2) / 4 + (levels - 1) / 2 + 1,
  };
}

/**
 * Podlaha je horní stěna pomyslného patra pod zemí — políčko `(x, y)` leží tam, kde
 * by měla horní stěnu kostka na souřadnici `z = −1`.
 */
export function floorAt(x: number, y: number, levels = ISO_LEVELS): { left: number; top: number } {
  return boxAt({ x, y, z: -1 }, levels);
}

/**
 * Matice stěny pro `transform` nad čtvercem o straně `size`. Terč pro prst je
 * samotná stěna: co je vidět, na to se dá klepnout — a co kostka zakryje, patří jí.
 */
export function faceTransform(face: Face, size: number): string {
  if (face === "top") return `matrix(.5,.25,-.5,.25,${size / 2},0)`;
  if (face === "right") return `matrix(-.5,.25,0,.5,${size},${size / 4})`;
  return `matrix(.5,.25,0,.5,0,${size / 4})`;
}
