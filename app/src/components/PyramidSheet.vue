<!-- Počítací pyramida na listu papíru. Každá cihla je součet dvou pod sebou; prázdné
     se doplňují a klepnutím se vybírá ta, do které se píše. Kreslí se odshora, ale
     data jdou odspodu (`rows[0]` je základna), takže se patra obracejí. -->
<script setup lang="ts">
import { computed } from "vue";
import { isKnown, valueAt, widthOf, type Cell, type Pyramid } from "../lib/pyramid";
import type { NoteKind } from "../composables/useGame";

const props = defineProps<{
  pyramid: Pyramid | null;
  filled: Record<string, number>;
  cursor: Cell | null;
  answer: string;
  locked: boolean;
  note: string;
  noteKind: NoteKind;
  shake: boolean;
}>();

const emit = defineEmits<{ (e: "pick", cell: Cell): void }>();

type Brick = {
  cell: Cell;
  /** co je v cihle vidět */
  text: string;
  known: boolean;
  done: boolean;
  here: boolean;
};

const key = (cell: Cell): string => `${cell.row},${cell.at}`;

/** Patra odshora dolů, jak se pyramida kreslí. */
const levels = computed(() => {
  const p = props.pyramid;
  if (!p) return [];

  const base = p.rows[0]?.length ?? 0;
  const out: Brick[][] = [];

  for (let row = base - 1; row >= 0; row--) {
    const bricks: Brick[] = [];

    for (let at = 0; at < widthOf(base, row); at++) {
      const cell = { row, at };
      const known = isKnown(p, cell);
      const done = key(cell) in props.filled;
      const here = props.cursor?.row === row && props.cursor?.at === at;

      bricks.push({
        cell,
        known,
        done,
        here,
        text: known || done ? String(valueAt(p, cell)) : here ? props.answer : "",
      });
    }
    out.push(bricks);
  }
  return out;
});
</script>

<template>
  <div
    class="sheet pyramid-sheet"
    :class="{ 'is-ok': noteKind === 'ok', 'is-bad': noteKind === 'bad', 'is-shake': shake }"
    id="sheet"
  >
    <div class="pyramid" id="pyramid" :data-base="pyramid?.rows[0]?.length">
      <div v-for="(level, i) in levels" :key="i" class="bricks">
        <button
          v-for="brick in level"
          :key="key(brick.cell)"
          type="button"
          class="brick-cell"
          :class="{
            'is-given': brick.known,
            'is-done': brick.done,
            'is-here': brick.here,
            'is-blank': !brick.known && !brick.done,
          }"
          :data-cell="key(brick.cell)"
          :disabled="brick.known || brick.done"
          :aria-label="brick.known || brick.done ? String(brick.text) : 'Doplň cihlu'"
          @click="emit('pick', brick.cell)"
        >
          <span :class="{ 'is-locked': brick.here && locked }">{{ brick.text }}</span>
        </button>
      </div>
    </div>

    <p class="note" :class="noteKind" id="note" aria-live="polite">{{ note }}</p>
  </div>
</template>
