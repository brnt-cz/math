<!-- Kostka: odkaz na SVG symbol z BlockDefs. Používá ji zeď, inventář i plocha. -->
<script setup lang="ts">
import type { Sprite } from "../lib/blocks";

defineProps<{ type: Sprite }>();
</script>

<template>
  <svg viewBox="0 0 32 32" aria-hidden="true"><use :href="`#blk-${type}`" /></svg>
</template>
