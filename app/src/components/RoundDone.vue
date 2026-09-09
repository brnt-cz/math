<!-- Výsledek kola. -->
<script setup lang="ts">
import { ROUND } from "../composables/useGame";

defineProps<{ first: number; stars: number; text: string }>();
const emit = defineEmits<{ (e: "again"): void }>();

function unfocus(e: MouseEvent): void {
  if (e.detail > 0) (e.currentTarget as HTMLElement | null)?.blur();
}
</script>

<template>
  <div class="done" id="done">
    <div class="stars" id="stars">{{ "★★★".slice(0, stars) + "☆☆☆".slice(0, 3 - stars) }}</div>
    <h2 id="score">{{ first }} z {{ ROUND }} napoprvé</h2>
    <p id="summary">{{ text }}</p>
    <button type="button" class="again" id="again" @click="unfocus($event); emit('again')">Další desítka</button>
  </div>
</template>
