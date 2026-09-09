<!-- Nastavení: rozsah, počet čísel, znaménka. -->
<script setup lang="ts">
import { OP_KEYS, type OpKey, type Ops } from "../lib/generator";

const props = defineProps<{ range: number; terms: number; ops: Ops }>();
const emit = defineEmits<{
  (e: "update:range", value: number): void;
  (e: "update:terms", value: number): void;
  (e: "update:ops", value: Ops): void;
}>();

const OP_LABEL: Record<OpKey, { sym: string; word: string }> = {
  add: { sym: "+", word: "plus" },
  sub: { sym: "−", word: "minus" },
  mul: { sym: "×", word: "krát" },
  div: { sym: "÷", word: "děleno" },
};

/* Po kliknutí ukazatelem prvek odostříme — jinak by zaostřené tlačítko polykalo
   mezerník. Klávesnice píše přes posluchač na dokumentu, takže focus není potřeba.
   (detail === 0 znamená spuštěno klávesou.) */
function unfocus(e: MouseEvent): void {
  if (e.detail > 0) (e.currentTarget as HTMLElement | null)?.blur();
}

function toggleOp(key: OpKey, e: Event): void {
  const next = { ...props.ops, [key]: !props.ops[key] };
  if (!OP_KEYS.some((k) => next[k])) return;      // aspoň jedno musí zůstat

  emit("update:ops", next);
  (e.target as HTMLElement | null)?.blur();
}
</script>

<template>
  <div class="setup">
    <div class="row">
      <span class="lab" id="lab-range">Počítáme</span>
      <div class="seg" role="group" aria-labelledby="lab-range" id="seg-range">
        <button
          v-for="value in [10, 20]"
          :key="value"
          type="button"
          :data-v="value"
          :aria-pressed="range === value"
          @click="unfocus($event); emit('update:range', value)"
        >
          do {{ value }}
        </button>
      </div>
    </div>

    <div class="row">
      <span class="lab" id="lab-terms">Počet čísel</span>
      <div class="seg" role="group" aria-labelledby="lab-terms" id="seg-terms">
        <button
          v-for="value in [2, 3, 4]"
          :key="value"
          type="button"
          :data-v="value"
          :aria-pressed="terms === value"
          @click="unfocus($event); emit('update:terms', value)"
        >
          {{ value }}
        </button>
      </div>
    </div>

    <div class="row">
      <span class="lab" id="lab-ops">Znaménka</span>
      <div class="ops" role="group" aria-labelledby="lab-ops" id="seg-ops">
        <label v-for="key in OP_KEYS" :key="key" class="chip">
          <input type="checkbox" :value="key" :checked="ops[key]" @change="toggleOp(key, $event)">
          <span aria-hidden="true">{{ OP_LABEL[key].sym }}</span>
          <em>{{ OP_LABEL[key].word }}</em>
        </label>
      </div>
    </div>
  </div>
</template>
