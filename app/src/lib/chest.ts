/**
 * Truhly.
 *
 * Obsah se nikde neukládá — druh kostky plyne z jejího indexu, takže se truhly
 * spočítají pokaždé znovu z jednoho čísla (kolik kostek je uložených) a jsou vždy
 * stejné.
 *
 * Kostky se sypou po padesátkách do první truhly; další truhla se přistaví teprve
 * tehdy, když se do té předchozí padesátka už nevejde (má plných 54 políček).
 */

import { countTypes, usedSlots, BLOCKS, type Counts } from "./blocks";

/** Po kolika kostkách se zeď uloží do truhly. */
export const BANK_SIZE = 50;
/** Minecraftová truhla 3 × 9; velká má dvojnásobek. */
export const CHEST_SLOTS = 27;

export type Chest = {
  /** index první kostky v této truhle */
  start: number;
  /** kolik kostek v ní je */
  count: number;
  counts: Counts;
  /** od stovky je z truhly velká truhla */
  big: boolean;
  /** kolik má políček (27 nebo 54) */
  slots: number;
  name: string;
};

export function chestList(banked: number): Chest[] {
  const list: Chest[] = [];
  let open: Chest | null = null;

  // v truhlách jsou jen celé padesátky; nedokončená padesátka leží pořád na zdi
  const stored = Math.max(0, banked - (banked % BANK_SIZE));

  for (let from = 0; from < stored; from += BANK_SIZE) {
    const batch = countTypes(from, from + BANK_SIZE);

    if (open) {
      const merged: Counts = {};
      for (const type of BLOCKS) {
        merged[type] = (open.counts[type] ?? 0) + (batch[type] ?? 0);
      }

      if (usedSlots(merged) <= CHEST_SLOTS * 2) {
        open.counts = merged;
        open.count += BANK_SIZE;
        continue;
      }
    }

    open = {
      start: from,
      count: BANK_SIZE,
      counts: batch,
      big: false,
      slots: CHEST_SLOTS,
      name: "Truhla",
    };
    list.push(open);
  }

  for (const chest of list) {
    chest.big = chest.count > BANK_SIZE;
    chest.slots = chest.big ? CHEST_SLOTS * 2 : CHEST_SLOTS;
    chest.name = chest.big ? "Velká truhla" : "Truhla";
  }
  return list;
}

/** Stavění se odemyká, až je první truhla doslova plná. */
export function firstChestFull(chests: Chest[]): boolean {
  const first = chests[0];
  return !!first && usedSlots(first.counts) >= first.slots;
}
