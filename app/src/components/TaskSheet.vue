<!-- List čtverečkovaného papíru s příkladem a rámečkem na výsledek. -->
<script setup lang="ts">
import type { Task } from "../lib/generator";
import type { NoteKind } from "../composables/useGame";

defineProps<{
  task: Task | null;
  answer: string;
  locked: boolean;
  note: string;
  noteKind: NoteKind;
  shake: boolean;
}>();
</script>

<template>
  <div class="sheet" :class="{ 'is-ok': noteKind === 'ok', 'is-bad': noteKind === 'bad', 'is-shake': shake }" id="sheet">
    <div class="task" id="task" :data-n="task?.terms.length">
      <template v-for="(n, i) in task?.terms ?? []" :key="i">
        <span v-if="i > 0" class="op">{{ task?.ops[i - 1] }}</span>
        <span>{{ n }}</span>
      </template>
      <span class="eq">=</span>
      <span id="answer" role="status" aria-label="Výsledek" :class="{ locked }">{{ answer }}</span>
    </div>
    <p class="note" :class="noteKind" id="note" aria-live="polite">{{ note }}</p>
  </div>
</template>
