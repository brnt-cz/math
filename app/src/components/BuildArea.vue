<!-- Stavění: izometrická plocha a paleta s obsahem truhly.
     Kostky mají tři souřadnice a kreslí se vzestupně podle hloubky x+y+z, takže
     na sebe navazují bez mezer. Terč pro prst je samotná stěna kostky: co je vidět,
     na to se dá klepnout — a co kostka zakryje, patří jí.

     Všechno se řeší z pointer událostí (žádné `click`), protože vlastní tažení
     musí v `pointerdown` zavolat `preventDefault`, aby ho prohlížeč nepřebil
     nativním tažením. -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { BLOCKS, NAMES, spriteFor, type Block, type Sprite } from "../lib/blocks";
import type { Counts } from "../lib/blocks";
import {
  FACES,
  ISO_COLS,
  ISO_DEPTH,
  boxAt,
  depth,
  faceTransform,
  ISO_LEVELS,
  floorAt,
  inScene,
  levelsFor,
  neighbor,
  parseVoxel,
  sceneSize,
  voxelKey,
  type Face,
} from "../lib/iso";
import { cellKey, type Build, type BuildAction, type Cell } from "../lib/inventory";
import { portalCells } from "../lib/portal";
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

const area = ref<HTMLElement | null>(null);
const bar = ref<HTMLElement | null>(null);
const wrap = ref<HTMLElement | null>(null);
const canvas = ref<HTMLElement | null>(null);
const cell = ref(32);
const hint = ref<Cell | null>(null);

/** Kolik pixelů se smí ujet, než se z klepnutí stane tažení. */
const SLOP = 8;

type Press = {
  /** druh kostky v ruce: z palety, nebo zvednutý z plochy */
  type: Block | null;
  /** kostka, ze které se táhne (v režimu bourání se netáhne) */
  from: Cell | null;
  /** kostka, na kterou se kleplo */
  cube: Cell | null;
  /** buňka, kam kostka spadne */
  target: Cell | null;
  moved: boolean;
  /** místo stisku, od něj se měří, jestli už jde o tažení */
  x0: number;
  y0: number;
  x: number;
  y: number;
};

const press = ref<Press | null>(null);

/** Buňka pod kurzorem a kostka, na kterou míří — v izometrii jinak není poznat,
    jestli kostka spadne nahoru, nebo dozadu. */
const hover = ref<Cell | null>(null);
const hoverCube = ref<Cell | null>(null);

/** Kolik pater stavba potřebuje: co je postaveno a jedno navíc, ať je kam pokračovat. */
const needed = computed(() => {
  let highest = 0;
  for (const key of Object.keys(props.build)) {
    const v = parseVoxel(key);
    if (v) highest = Math.max(highest, v.z);
  }
  return levelsFor(highest);
});

/** Kolik pater se doopravdy kreslí — zbylá výška se rozdá na vzduch nad podlahou. */
const levels = ref(needed.value);
const scene = computed(() => sceneSize(levels.value));

/**
 * Kostka je co největší, ale musí se vejít na šířku i s potřebnými patry na výšku.
 * Velikost držím na násobku čtyř, aby všechny kostky sedly na celé pixely.
 */
function measure(): void {
  const box = wrap.value;
  const host = area.value;
  if (!box || !host) return;

  // rám plochy obalí scénu, takže volné místo se počítá z celého sloupce bez palety
  const pad = 16;
  const gap = 12;
  const width = box.clientWidth - pad;
  const height = host.clientHeight - (bar.value?.offsetHeight ?? 0) - gap - pad;

  // scéna je vysoká jako podlaha plus půl kostky za každé patro navíc
  const floorTall = sceneSize(1).h;
  let size = width / scene.value.w;
  if (height > 40) size = Math.min(size, height / (floorTall + (needed.value - 1) / 2));

  cell.value = Math.max(16, Math.floor(size / 4) * 4);
  levels.value = Math.min(
    ISO_LEVELS,
    Math.max(needed.value, Math.floor((height / cell.value - floorTall) * 2) + 1),
  );
}

const sceneStyle = computed(() => ({
  width: `${scene.value.w * cell.value}px`,
  height: `${scene.value.h * cell.value}px`,
}));

function frame(left: number, top: number): Record<string, string> {
  return {
    left: `${left * cell.value}px`,
    top: `${top * cell.value}px`,
    width: `${cell.value}px`,
    height: `${cell.value}px`,
  };
}

const floor = computed(() =>
  Array.from({ length: ISO_COLS * ISO_DEPTH }, (_, i) => {
    const x = i % ISO_COLS;
    const y = Math.floor(i / ISO_COLS);
    const { left, top } = floorAt(x, y, levels.value);

    return {
      key: voxelKey(x, y, 0),
      target: cellKey(x, y, 0),
      alt: (x + y) % 2 === 1,
      style: { ...frame(left, top), transform: faceTransform("top", cell.value) },
    };
  }),
);

/** Právě tažená kostka se na svém místě nekreslí. */
const lifted = computed(() => (press.value?.moved ? press.value.from : null));

type Side = { face: Face; target: Cell | null; style: Record<string, string> };

/** Kostky v pořadí kreslení — vzestupně podle hloubky, protože směr pohledu je (1,1,1). */
const blocks = computed(() => {
  const out: { key: Cell; sprite: Sprite; zi: number; style: Record<string, string>; faces: Side[] }[] = [];

  for (const [key, type] of Object.entries(props.build)) {
    const v = parseVoxel(key);
    if (!v || key === lifted.value) continue;

    const { left, top } = boxAt(v, levels.value);
    const zi = 10 + depth(v) * 2;
    const above = cellKey(v.x, v.y, v.z + 1);

    out.push({
      key,
      sprite: spriteFor(type, !!props.build[above]),
      zi,
      style: { ...frame(left, top), zIndex: String(zi) },
      faces: FACES.map((face) => {
        const to = neighbor(v, face);
        return {
          face,
          target: inScene(to) ? cellKey(to.x, to.y, to.z) : null,
          style: { ...frame(left, top), zIndex: String(zi + 1), transform: faceTransform(face, cell.value) },
        };
      }),
    });
  }

  return out.sort((a, b) => a.zi - b.zi);
});

/**
 * Plocha nether portálu. Leží v rovině rámu, takže se kreslí stejnou maticí jako
 * odpovídající stěna kostky — `y` je konstantní u levé stěny, `x` u pravé.
 */
const portal = computed(() =>
  [...portalCells(props.build)].flatMap(([key, plane]) => {
    const v = parseVoxel(key);
    if (!v) return [];

    const { left, top } = boxAt(v, levels.value);
    return [{
      key,
      style: {
        ...frame(left, top),
        zIndex: String(10 + depth(v) * 2),
        transform: faceTransform(plane === "y" ? "left" : "right", cell.value),
      },
    }];
  }),
);

/** Náhled toho, kam kostka spadne — při tažení pod prstem, jinak pod kurzorem. */
const ghost = computed(() => {
  if (props.wrecking) return null;

  const cell = hint.value ?? (press.value ? null : hover.value);
  const v = cell && !props.build[cell] ? parseVoxel(cell) : null;
  if (!v) return null;

  const { left, top } = boxAt(v, levels.value);
  return { ...frame(left, top), zIndex: String(11 + depth(v) * 2) };
});

function under(x: number, y: number): HTMLElement | null {
  return document.elementFromPoint(x, y) as HTMLElement | null;
}

/** Buňka, kam by kostka na daném místě spadla. */
function targetAt(x: number, y: number): Cell | null {
  const hit = under(x, y)?.closest?.("[data-target]") as HTMLElement | null;
  return hit?.dataset.target ?? null;
}

/* ---------- paleta ---------- */

function pickDown(type: Block, e: PointerEvent): void {
  if ((props.stock[type] ?? 0) <= 0) return;
  e.preventDefault();

  emit("update:wrecking", false);
  emit("update:picked", type);
  press.value = {
    type,
    from: null,
    cube: null,
    target: null,
    moved: false,
    x0: e.clientX,
    y0: e.clientY,
    x: e.clientX,
    y: e.clientY,
  };

  try {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  } catch {
    /* bez zachycení tažení nesleduje prst mimo tlačítko; klepání funguje dál */
  }
}

/* ---------- plocha ---------- */

function down(target: Cell | null, cube: Cell | null, e: PointerEvent): void {
  // bez preventDefault by druhé stisknutí nad výběrem spustilo nativní tažení,
  // které pošle pointercancel a náš přesun zruší
  e.preventDefault();

  const dragged = !props.wrecking && cube && props.build[cube] ? cube : null;

  press.value = {
    type: dragged ? (props.build[dragged] as Block) : null,
    from: dragged,
    cube,
    target,
    moved: false,
    x0: e.clientX,
    y0: e.clientY,
    x: e.clientX,
    y: e.clientY,
  };

  try {
    canvas.value?.setPointerCapture(e.pointerId);
  } catch {
    /* viz výše */
  }
}

/** Míření bez stisku: co je pod kurzorem a kam by kostka spadla. */
function look(e: PointerEvent): void {
  const hit = under(e.clientX, e.clientY)?.closest?.("[data-target], [data-cube]") as HTMLElement | null;
  hover.value = hit?.dataset.target ?? null;
  hoverCube.value = hit?.dataset.cube ?? null;
}

function move(e: PointerEvent): void {
  const p = press.value;
  if (!p) {
    look(e);
    return;
  }
  if (!p.type) return;

  p.x = e.clientX;
  p.y = e.clientY;

  // malé ujetí prstu při klepnutí ještě není tažení, jinak by kostka odskočila
  if (!p.moved && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < SLOP) return;
  p.moved = true;

  const over = targetAt(e.clientX, e.clientY);
  hint.value = over && over !== p.from && !props.build[over] ? over : null;
}

function cancel(): void {
  press.value = null;
  hint.value = null;
}

function leave(): void {
  hover.value = null;
  hoverCube.value = null;
}

function up(e: PointerEvent): void {
  const p = press.value;
  if (!p) return;

  cancel();

  if (!p.moved) {
    tap(p);
    return;
  }

  const over = targetAt(e.clientX, e.clientY);
  const onPalette = under(e.clientX, e.clientY)?.closest?.(".palette");

  if (!p.from) {
    if (over && p.type) emit("action", { kind: "place", cell: over, type: p.type });
    return;
  }

  if (over && over !== p.from && !props.build[over]) {
    emit("action", { kind: "move", from: p.from, to: over });
  } else if (onPalette) {
    emit("action", { kind: "take", cell: p.from });
  }
}

/** Klepnutí: bourání sundá kostku, jinak se staví — a s prázdnou rukou se druh vezme. */
function tap(p: Press): void {
  if (props.wrecking) {
    if (p.cube) emit("action", { kind: "take", cell: p.cube });
    return;
  }

  if (!props.picked) {
    if (p.cube) emit("update:picked", props.build[p.cube] as Block);
    return;
  }

  if (p.target && !props.build[p.target]) {
    emit("action", { kind: "place", cell: p.target, type: props.picked });
  }
}

/** Zbourání celé plochy se ptá dvakrát, ať se hotová stavba nesmaže omylem. */
const confirming = ref(false);
let confirmTimer: ReturnType<typeof setTimeout> | null = null;

function resetConfirm(): void {
  confirming.value = false;
  if (confirmTimer) clearTimeout(confirmTimer);
  confirmTimer = null;
}

function clearAll(e: MouseEvent): void {
  if (e.detail > 0) (e.currentTarget as HTMLElement | null)?.blur();

  if (!confirming.value) {
    confirming.value = true;
    confirmTimer = setTimeout(resetConfirm, 4000);
    return;
  }

  resetConfirm();
  emit("action", { kind: "clear" });
  emit("update:wrecking", false);
}

function toggleWreck(e: MouseEvent): void {
  resetConfirm();
  if (e.detail > 0) (e.currentTarget as HTMLElement | null)?.blur();
  emit("update:wrecking", !props.wrecking);
  if (!props.wrecking) emit("update:picked", null);
}

let observer: ResizeObserver | null = null;

// patro navíc mění výšku scény, takže se musí přepočítat i velikost kostky
watch(needed, () => measure());

onMounted(() => {
  measure();
  if (typeof ResizeObserver !== "undefined" && area.value) {
    // sleduju celý sloupec, ne jen rám: ten svou výšku bere od scény
    observer = new ResizeObserver(() => measure());
    observer.observe(area.value);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  if (confirmTimer) clearTimeout(confirmTimer);
});
</script>

<template>
  <div class="build" id="build" ref="area">
    <div class="canvas-wrap" ref="wrap">
      <div
        class="canvas"
        id="canvas"
        ref="canvas"
        aria-label="Plocha na stavění"
        :class="{ wrecking }"
        :style="sceneStyle"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="cancel"
        @pointerleave="leave"
        @dragstart.prevent
      >
        <div
          v-for="tile in floor"
          :key="tile.key"
          class="tile"
          :class="{ alt: tile.alt }"
          :data-target="tile.target"
          :style="tile.style"
          @pointerdown="down(tile.target, null, $event)"
        />

        <template v-for="block in blocks" :key="block.key">
          <div class="blk" :style="block.style">
            <BlockSprite :type="block.sprite" />
          </div>

          <div
            v-for="side in block.faces"
            :key="`${block.key}-${side.face}`"
            class="face"
            :class="{ on: hoverCube === block.key }"
            :data-cube="block.key"
            :data-target="side.target ?? undefined"
            :style="side.style"
            @pointerdown="down(side.target, block.key, $event)"
          />
        </template>

        <div v-for="gate in portal" :key="`portal-${gate.key}`" class="portal" :style="gate.style">
          <svg viewBox="0 0 16 16" aria-hidden="true"><use href="#portal-face" /></svg>
        </div>

        <div v-if="ghost && (press?.type || picked)" class="ghost" :style="ghost">
          <BlockSprite :type="(press?.type ?? picked) as Block" />
        </div>
      </div>
    </div>

    <div class="palette" id="palette" ref="bar">
      <div class="palette-row" id="palette-row" @pointermove="move" @pointerup="up" @pointercancel="cancel">
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

      <div class="tools">
        <button type="button" class="wreck" id="wreck" :aria-pressed="wrecking" @click="toggleWreck">
          Bourat
        </button>

        <button
          type="button"
          class="wreck clear"
          id="clear"
          :aria-pressed="confirming"
          :disabled="!Object.keys(build).length"
          @click="clearAll"
        >
          {{ confirming ? "Opravdu?" : "Zbourat vše" }}
        </button>
      </div>
    </div>

    <div
      v-if="press?.moved && press.type"
      class="drag"
      :style="{ width: `${cell}px`, height: `${cell}px`, left: `${press.x - cell / 2}px`, top: `${press.y - cell / 2}px` }"
    >
      <BlockSprite :type="press.type" />
    </div>
  </div>
</template>
