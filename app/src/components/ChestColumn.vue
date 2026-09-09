<!-- Truhly: stohují se nahoru, další se přistaví až když je ta pod ní plná.
     Kliknutím se otevře inventář nad tou truhlou, na kterou se kleplo. -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { NAMES, stacksOf } from "../lib/blocks";
import type { Chest } from "../lib/chest";
import BlockSprite from "./BlockSprite.vue";

const props = defineProps<{ chests: Chest[]; banked: number }>();

const col = ref<HTMLElement | null>(null);
const stack = ref<HTMLElement | null>(null);
const open = ref(-1);
/** kam se má inventář zakotvit — nad tu truhlu, na kterou se kleplo */
const panelBottom = ref("0px");

const label = computed(() => (props.chests.length > 1 ? "Truhly" : (props.chests[0]?.name ?? "Truhla")));
const shown = computed(() => props.chests[open.value] ?? null);
const slots = computed(() => {
  const chest = shown.value;
  if (!chest) return [];

  const filled = stacksOf(chest.counts);
  return Array.from({ length: chest.slots }, (_, i) => filled[i] ?? null);
});

function close(): void {
  open.value = -1;
}

function toggle(i: number, e: MouseEvent): void {
  e.stopPropagation();
  if (e.detail > 0) (e.currentTarget as HTMLElement | null)?.blur();

  if (open.value === i) {
    close();
    return;
  }

  open.value = i;

  const btn = stack.value?.querySelector<HTMLElement>(`[data-i="${i}"]`);
  const box = col.value?.getBoundingClientRect();
  if (btn && box) panelBottom.value = `${Math.round(box.bottom - btn.getBoundingClientRect().top + 8)}px`;
}

defineExpose({ close });
</script>

<template>
  <div class="chest-col" id="chest-col" ref="col" :class="{ open: open >= 0 }">
    <span class="lab" id="chest-lab">{{ label }}</span>
    <span class="chest-n" id="chest-n">{{ banked }}</span>

    <div class="chest-stack" id="chest-stack" ref="stack">
      <button
        v-for="(chest, i) in chests"
        :key="chest.start"
        type="button"
        class="chest"
        :class="{ double: chest.big }"
        :data-i="i"
        :data-name="`${chest.name} · ${chest.count} kostek`"
        :aria-expanded="open === i"
        :aria-label="`${chest.name}, ${chest.count} kostek`"
        @click="toggle(i, $event)"
      >
        <svg
          class="chest-art"
          :viewBox="chest.big ? '0 0 50 42' : '0 0 34 34'"
          aria-hidden="true"
        >
          <use :href="chest.big ? '#chest-double' : '#chest-single'" />
        </svg>
      </button>
    </div>

    <div
      class="chest-panel"
      id="chest-panel"
      role="dialog"
      aria-label="Obsah truhly"
      :style="{ bottom: panelBottom }"
    >
      <div class="chest-head">
        <b id="chest-title">{{ shown?.name }}</b>
        <span id="chest-size">{{ shown?.big ? "6 × 9" : "3 × 9" }}</span>
      </div>
      <div class="chest-grid" id="chest-grid">
        <div
          v-for="(slot, i) in slots"
          :key="i"
          class="slot"
          :data-name="slot ? NAMES[slot.type] : undefined"
        >
          <template v-if="slot">
            <BlockSprite :type="slot.type" />
            <b>{{ slot.n }}</b>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
