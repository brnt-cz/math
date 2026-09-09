<!-- Průběh série: puntík za každý příklad. -->
<script setup lang="ts">
import { ROUND, type Mark } from "../composables/useGame";

const props = defineProps<{ results: Mark[] }>();

function dotClass(i: number): string {
  const mark = props.results[i];
  if (mark) return mark;
  return i === props.results.length ? "now" : "";
}
</script>

<template>
  <div class="progress" id="progress" aria-label="Průběh série">
    <span v-for="i in ROUND" :key="i" class="dot" :class="dotClass(i - 1)" />
  </div>
</template>
