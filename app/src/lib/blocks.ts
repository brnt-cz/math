/** Druhy kostek: vzhled, názvy a vážená vzácnost. */

export const BLOCKS = ["grass", "stone", "cobble", "plank", "log", "sand", "nether", "obsidian"] as const;

export type Block = (typeof BLOCKS)[number];

/**
 * Šance v procentech, od nejběžnějšího po nejvzácnější. Součet je 100.
 *
 * Nové druhy si vždycky vezmou díl **od svého příbuzného** a stojí v seznamu hned za ním:
 * kláda z prken (20 → 12 + 8), dlažební kostka z kamene (24 → 14 + 10). Součty přes
 * ostatní druhy tím zůstanou stejné, takže se už nasbíraným kostkám druh nemění — jen
 * z části prken jsou klády a z části kamene dlažba. Jinak by se synovi přeházela
 * celá truhla i zeď.
 */
export const RARITY: Record<Block, number> = {
  grass: 27,
  stone: 14,
  cobble: 10,
  plank: 12,
  log: 8,
  sand: 15,
  nether: 9,
  obsidian: 5,
};

/**
 * Vzhledy kostek: druhy plus hlína. Hlína **není druh** — je to tráva, na které něco
 * stojí. V truhle zůstává blokem trávy, takže se rarita ani počítání nemění.
 */
export const SPRITES = [...BLOCKS, "dirt"] as const;

export type Sprite = (typeof SPRITES)[number];

/** Tráva pod kostkou se zadupe na hlínu, jako v Minecraftu. */
export function spriteFor(type: Block, covered: boolean): Sprite {
  return type === "grass" && covered ? "dirt" : type;
}

export const NAMES: Record<Sprite, string> = {
  grass: "Blok trávy",
  stone: "Kámen",
  cobble: "Dlažební kostka",
  plank: "Dubová prkna",
  log: "Dubová kláda",
  sand: "Písek",
  nether: "Netherrack",
  obsidian: "Obsidián",
  dirt: "Hlína",
};

export const STACK = 64;

/**
 * Druh kostky podle jejího indexu. Je to hash, ne náhoda — kostka si svůj druh
 * drží při každém překreslení i po uložení do truhly, a nikde se neukládá.
 */
export function blockFor(index: number): Block {
  let h = Math.imul(index + 1, 2654435761);
  h ^= h >>> 15;
  h = Math.imul(h, 668265263);
  h ^= h >>> 13;

  const roll = (h >>> 0) % 100;
  let acc = 0;

  for (const block of BLOCKS) {
    acc += RARITY[block];
    if (roll < acc) return block;
  }
  return BLOCKS[0];
}

export type Counts = Partial<Record<Block, number>>;

/** Kolik je kterého druhu mezi indexy [from, to). */
export function countTypes(from: number, to: number, into: Counts = {}): Counts {
  for (let i = from; i < to; i++) {
    const block = blockFor(i);
    into[block] = (into[block] ?? 0) + 1;
  }
  return into;
}

/** Kolik políček obsah zabere — každý druh se láme po 64 na stack. */
export function usedSlots(counts: Counts): number {
  return BLOCKS.reduce((n, block) => n + Math.ceil((counts[block] ?? 0) / STACK), 0);
}

export type Stack = { type: Block; n: number };

/** Obsah rozložený do stacků v pořadí druhů, jak se ukazuje v inventáři. */
export function stacksOf(counts: Counts): Stack[] {
  const stacks: Stack[] = [];

  for (const type of BLOCKS) {
    let left = counts[type] ?? 0;
    while (left > 0) {
      stacks.push({ type, n: Math.min(STACK, left) });
      left -= STACK;
    }
  }
  return stacks;
}
