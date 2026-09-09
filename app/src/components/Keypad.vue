<!-- Velká číselná klávesnice. Výsledek není <input>, aby na mobilu nevyskakovala
     systémová klávesnice — číslice zapisujeme sami. -->
<script setup lang="ts">
const emit = defineEmits<{
  (e: "digit", value: string): void;
  (e: "backspace"): void;
  (e: "check"): void;
}>();

function unfocus(e: MouseEvent): void {
  if (e.detail > 0) (e.currentTarget as HTMLElement | null)?.blur();
}
</script>

<template>
  <div class="pad" id="pad">
    <button v-for="d in ['1','2','3','4','5','6','7','8','9']" :key="d" type="button" :data-d="d"
            @click="unfocus($event); emit('digit', d)">{{ d }}</button>
    <button type="button" class="del" data-act="del" @click="unfocus($event); emit('backspace')">Smaž</button>
    <button type="button" data-d="0" @click="unfocus($event); emit('digit', '0')">0</button>
    <button type="button" class="go" data-act="check" @click="unfocus($event); emit('check')">Hotovo</button>
  </div>
</template>
