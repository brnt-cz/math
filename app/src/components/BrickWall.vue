<!-- Zeď: sloupce se plní odspodu, po dosažení vrcholu začíná další vedle.
     Když se zeď nevejde, kostky se zmenší skokem — žádná nikdy nezmizí. -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { blockFor, NAMES } from "../lib/blocks";
import { RAIL_SHARE, gridFor, placements, type Grid, type Space } from "../lib/wall";
import BlockSprite from "./BlockSprite.vue";

const props = defineProps<{ tower: number; banked: number; sideLayout: boolean; pageWidth: number }>();

const rail = ref<HTMLElement | null>(null);
const probe = ref<HTMLElement | null>(null);
const towerEl = ref<HTMLElement | null>(null);

/** Úroveň zmenšení si držíme mezi překreslením — na ní stojí hystereze. */
const level = ref(0);
const grid = ref<Grid>({ level: 0, bw: 36, rows: 6, maxCols: 1, capacity: 6 });

function space(): Space {
  const base = probe.value?.offsetWidth || 36;
  const height = towerEl.value?.clientHeight || base * 6;

  // svislý pruh vpravo smí zabrat jen část stránky; pás pod klávesnicí celou šířku
  const allowance = props.sideLayout
    ? Math.max(base, props.pageWidth * RAIL_SHARE)
    : Math.max(base, rail.value?.clientWidth || base);

  return { base, height, allowance };
}

function measure(): void {
  const next = gridFor(props.tower, level.value, space());
  level.value = next.level;
  grid.value = next;
}

const bricks = computed(() =>
  placements(props.tower, grid.value, props.banked).map((p) => ({
    ...p,
    type: blockFor(p.index),
  })),
);

const cols = computed(() =>
  Math.min(grid.value.maxCols, Math.max(1, Math.ceil(Math.min(props.tower, grid.value.capacity) / grid.value.rows))),
);

const zoom = computed(() => grid.value.bw / (probe.value?.offsetWidth || grid.value.bw));

let observer: ResizeObserver | null = null;

onMounted(() => {
  measure();
  if (typeof ResizeObserver !== "undefined" && towerEl.value) {
    observer = new ResizeObserver(() => measure());
    observer.observe(towerEl.value);
  }
});

onBeforeUnmount(() => observer?.disconnect());

defineExpose({ measure });
</script>

<template>
  <div
    class="rail"
    id="rail"
    ref="rail"
    :style="{ '--cols': cols, '--zoom': zoom.toFixed(4) }"
  >
    <div class="bw-probe" id="bw-probe" aria-hidden="true" ref="probe" />
    <span class="lab">Zeď</span>
    <div class="tower-count" id="tower-count">
      {{ tower }}<span>&nbsp;{{ tower === 1 ? "kostka" : tower >= 2 && tower <= 4 ? "kostky" : "kostek" }}</span>
    </div>

    <div class="tower" id="tower" ref="towerEl" aria-label="Postavená zeď">
      <div
        v-for="brick in bricks"
        :key="brick.index"
        class="brick"
        :data-name="NAMES[brick.type]"
        :style="{ '--r': brick.row, '--c': brick.col }"
      >
        <BlockSprite :type="brick.type" />
      </div>
    </div>
  </div>
</template>
