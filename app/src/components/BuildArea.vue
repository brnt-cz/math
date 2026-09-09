<!-- Stavění: plocha 16 × 12 a paleta s obsahem truhly.
     Kostky se kladou do jedné vrstvy, ale kreslí se jako 2,5D stoh — řady se
     překrývají o čtvrtinu kostky, takže mezi nimi nejsou mezery. Terč pro prst
     je proto oddělený od kostky, aby trefování zůstalo přesné. -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { BLOCKS, NAMES, type Block } from "../lib/blocks";
import { BUILD_COLS, BUILD_ROWS, cellKey, type Build, type BuildAction, type Cell } from "../lib/inventory";
import type { Counts } from "../lib/blocks";
import BlockSprite from "./BlockSprite.vue";

const props = defineProps<{
  build: Build;
  stock: Counts;
  picked: Block | null;
  wrecking: boolean;
  sideLayout: boolean;
}>();

const emit = defineEmits<{
  (e: "action", value: BuildAction): void;
  (e: "update:picked", value: Block | null): void;
  (e: "update:wrecking", value: boolean): void;
}>();

const wrap = ref<HTMLElement | null>(null);
const canvas = ref<HTMLElement | null>(null);
const cell = ref(24);
const hint = ref<Cell | null>(null);

/** kostka pod prstem: buď z palety, nebo zvednutá z plochy */
const drag = ref<{ type: Block; from: Cell | null; moved: boolean; x: number; y: number } | null>(null);

const rowsTall = (BUILD_ROWS - 1) * 0.75 + 1;

function measure(): void {
  const box = wrap.value;
  if (!box) return;

  const pad = 16;
  const byWidth = (box.clientWidth - pad) / BUILD_COLS;
  const height = box.clientHeight - pad;

  const size = props.sideLayout && height > 40 ? Math.min(byWidth, height / rowsTall) : byWidth;
  cell.value = Math.max(14, Math.floor(size));
}

const cells = computed(() => {
  const out: { key: Cell; c: number; r: number; type: Block | undefined }[] = [];

  for (let y = 0; y < BUILD_ROWS; y++) {
    for (let x = 0; x < BUILD_COLS; x++) {
      const key = cellKey(x, y);
      out.push({ key, c: x, r: BUILD_ROWS - 1 - y, type: props.build[key] });
    }
  }
  return out;
});

const lifted = computed(() => (drag.value?.moved ? drag.value.from : null));

function cellAt(x: number, y: number): Cell | null {
  const node = document.elementFromPoint(x, y);
  const hit = node?.closest?.(".cell") as HTMLElement | null;
  return hit?.dataset.key ?? null;
}

/* ---------- paleta ---------- */

function pickDown(type: Block, e: PointerEvent): void {
  if ((props.stock[type] ?? 0) <= 0) return;
  e.preventDefault();

  emit("update:wrecking", false);
  emit("update:picked", type);
  drag.value = { type, from: null, moved: false, x: e.clientX, y: e.clientY };

  try {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  } catch {
    /* bez zachycení tažení nesleduje prst mimo tlačítko; klepání funguje dál */
  }
}

/* ---------- plocha ---------- */

function canvasDown(key: Cell, e: PointerEvent): void {
  if (props.wrecking || !props.build[key]) return;

  // bez preventDefault by druhé stisknutí nad výběrem spustilo nativní tažení,
  // které pošle pointercancel a náš přesun zruší
  e.preventDefault();

  drag.value = { type: props.build[key] as Block, from: key, moved: false, x: e.clientX, y: e.clientY };
  try {
    canvas.value?.setPointerCapture(e.pointerId);
  } catch {
    /* viz výše */
  }
}

function move(e: PointerEvent): void {
  const d = drag.value;
  if (!d) return;

  d.moved = true;
  d.x = e.clientX;
  d.y = e.clientY;

  const over = cellAt(e.clientX, e.clientY);
  hint.value = over && !props.build[over] ? over : null;
}

function up(e: PointerEvent): void {
  const d = drag.value;
  if (!d) return;

  drag.value = null;
  hint.value = null;

  if (!d.moved) {
    // jen klepnutí: z palety vybrání druhu, na ploše vzetí druhu do ruky
    if (d.from) emit("update:picked", d.type);
    return;
  }

  const over = cellAt(e.clientX, e.clientY);
  const onPalette = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest?.(".palette");

  if (d.from === null) {
    if (over) emit("action", { kind: "place", cell: over, type: d.type });
    return;
  }

  if (over && !props.build[over]) emit("action", { kind: "move", from: d.from, to: over });
  else if (onPalette) emit("action", { kind: "take", cell: d.from });
}

function tap(key: Cell): void {
  if (props.wrecking) {
    // horní čtvrtina kostky spadá do terče nad ní — když je prázdný, boura se ta pod
    let target = key;
    if (!props.build[target]) {
      const [x, y] = key.split(",").map(Number) as [number, number];
      const below = cellKey(x, y + 1);
      if (props.build[below]) target = below;
    }
    emit("action", { kind: "take", cell: target });
    return;
  }

  if (props.picked && !props.build[key]) {
    emit("action", { kind: "place", cell: key, type: props.picked });
  }
}

function toggleWreck(e: MouseEvent): void {
  if (e.detail > 0) (e.currentTarget as HTMLElement | null)?.blur();
  emit("update:wrecking", !props.wrecking);
  if (!props.wrecking) emit("update:picked", null);
}

let observer: ResizeObserver | null = null;

onMounted(() => {
  measure();
  if (typeof ResizeObserver !== "undefined" && wrap.value) {
    observer = new ResizeObserver(() => measure());
    observer.observe(wrap.value);
  }
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div class="build" id="build">
    <div class="canvas-wrap" ref="wrap">
      <div
        class="canvas"
        id="canvas"
        ref="canvas"
        aria-label="Plocha na stavění"
        :style="{ '--cols-b': BUILD_COLS, '--rows-b': BUILD_ROWS, '--cell': `${cell}px` }"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="drag = null; hint = null"
      >
        <div
          v-for="item in cells"
          :key="item.key"
          class="cell"
          :class="{ hint: hint === item.key }"
          :data-key="item.key"
          :style="{ '--c': item.c, '--r': item.r }"
          @pointerdown="canvasDown(item.key, $event)"
          @click="tap(item.key)"
        />

        <div
          v-for="item in cells.filter((c) => c.type && c.key !== lifted)"
          :key="`blk-${item.key}`"
          class="blk"
          :data-blk="item.key"
          :data-name="NAMES[item.type as Block]"
          :style="{ '--c': item.c, '--r': item.r }"
        >
          <BlockSprite :type="item.type as Block" />
        </div>
      </div>
    </div>

    <div class="palette" id="palette">
      <div class="palette-row" id="palette-row" @pointermove="move" @pointerup="up" @pointercancel="drag = null">
        <button
          v-for="type in BLOCKS"
          :key="type"
          type="button"
          class="pick"
          :data-type="type"
          :data-name="`${NAMES[type]} · v truhle ${stock[type] ?? 0}`"
          :disabled="(stock[type] ?? 0) === 0"
          :aria-pressed="picked === type"
          @pointerdown="pickDown(type, $event)"
        >
          <BlockSprite :type="type" />
          <b>{{ stock[type] ?? 0 }}</b>
        </button>
      </div>

      <button type="button" class="wreck" id="wreck" :aria-pressed="wrecking" @click="toggleWreck">
        Bourat
      </button>
    </div>

    <div
      v-if="drag?.moved"
      class="drag"
      :style="{ width: `${cell}px`, height: `${cell}px`, left: `${drag.x - cell / 2}px`, top: `${drag.y - cell / 2}px` }"
    >
      <BlockSprite :type="drag.type" />
    </div>
  </div>
</template>
