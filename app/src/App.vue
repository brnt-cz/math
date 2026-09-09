<!-- Celá stránka. Struktura DOM i názvy tříd jsou stejné jako ve staré verzi,
     aby přenesené CSS sedělo. -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useGame } from "./composables/useGame";
import { usePointerTip } from "./composables/usePointerTip";
import { useSideLayout } from "./composables/useSideLayout";
import { BANK_SIZE, CHEST_SLOTS } from "./lib/chest";
import { usedSlots } from "./lib/blocks";
import BlockDefs from "./components/BlockDefs.vue";
import SetupPanel from "./components/SetupPanel.vue";
import TaskSheet from "./components/TaskSheet.vue";
import Keypad from "./components/Keypad.vue";
import RoundProgress from "./components/RoundProgress.vue";
import RoundDone from "./components/RoundDone.vue";
import BrickWall from "./components/BrickWall.vue";
import ChestColumn from "./components/ChestColumn.vue";
import BuildArea from "./components/BuildArea.vue";

const game = useGame();
const { state, chests, inStock, buildUnlocked, summary } = game;

const { sideLayout, pageWidth, page } = useSideLayout();
const { tip, tipText, tipVisible } = usePointerTip();

const chestCol = ref<InstanceType<typeof ChestColumn> | null>(null);

/** Po chybě rámeček krátce zacuká. */
const shake = ref(false);
watch(
  () => [state.tries, state.noteKind],
  (now, before) => {
    if (state.noteKind === "bad" && now[0] !== before?.[0]) {
      shake.value = true;
      setTimeout(() => void (shake.value = false), 380);
    }
  },
);

const showChest = computed(() => state.banked >= BANK_SIZE);

const modeLabel = computed(() => {
  if (state.building) return "Počítání";
  if (buildUnlocked.value) return "Stavění";

  const first = chests.value[0];
  const used = first ? usedSlots(first.counts) : 0;
  return `🔒 Stavění ${used}/${first?.slots ?? CHEST_SLOTS}`;
});

const modeTip = computed(() => {
  if (state.building) return "Zpátky k příkladům";
  if (buildUnlocked.value) return "Postav si něco z nasbíraných kostek";
  return "Stavění se otevře, až bude truhla plná";
});

function toggleMode(e: MouseEvent): void {
  if (e.detail > 0) (e.currentTarget as HTMLElement | null)?.blur();
  if (!buildUnlocked.value) return;

  chestCol.value?.close();
  game.setMode(!state.building);
}

function onKey(e: KeyboardEvent): void {
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.key === "Escape") {
    chestCol.value?.close();
    return;
  }
  if (state.building) return;

  if (/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    game.typeDigit(e.key);
  } else if (e.key === "Backspace") {
    e.preventDefault();
    game.backspace();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (state.done) game.startRound();
    else game.check();
  }
}

function onClickOutside(e: MouseEvent): void {
  const inside = (e.target as HTMLElement | null)?.closest?.(".chest-col");
  if (!inside) chestCol.value?.close();
}

onMounted(() => {
  document.addEventListener("keydown", onKey);
  document.addEventListener("click", onClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  document.removeEventListener("click", onClickOutside);
});
</script>

<template>
  <div class="mc-tip" id="mc-tip" aria-hidden="true" :class="{ on: tipVisible }" :style="tip">
    {{ tipText }}
  </div>

  <BlockDefs />

  <div
    class="page"
    id="page"
    ref="page"
    :class="{ 'has-chest': showChest && !state.building, building: state.building }"
  >
    <div class="top">
      <h1>Matika do dvaceti</h1>

      <button
        v-if="showChest"
        type="button"
        class="mode"
        id="mode"
        :class="{ locked: !buildUnlocked }"
        :aria-pressed="state.building"
        :aria-disabled="!buildUnlocked"
        :data-name="modeTip"
        @click="toggleMode"
      >
        <span id="mode-label">{{ modeLabel }}</span>
      </button>

      <div class="best">
        série <b id="streak">{{ state.streak }}</b> · nejlepší <b id="best">{{ state.best }}</b>
      </div>
    </div>

    <div v-show="!state.building" class="wrap">
      <SetupPanel
        :range="state.range"
        :terms="state.terms"
        :ops="state.ops"
        @update:range="state.range = $event; game.startRound()"
        @update:terms="state.terms = $event; game.startRound()"
        @update:ops="state.ops = $event; game.startRound()"
      />

      <TaskSheet
        v-show="!state.done"
        :task="state.task"
        :answer="state.answer"
        :locked="state.locked"
        :note="state.note"
        :note-kind="state.noteKind"
        :shake="shake"
      />

      <Keypad
        v-show="!state.done"
        @digit="game.typeDigit"
        @backspace="game.backspace"
        @check="game.check"
      />

      <RoundProgress :results="state.results" />

      <RoundDone
        v-if="state.done"
        :first="summary.first"
        :stars="summary.stars"
        :text="summary.text"
        @again="game.startRound"
      />

      <p class="foot">
        Enter zkontroluje, Backspace maže. Za 50 kostek se zeď uloží do truhly — co je
        v truhle, už nespadne.
      </p>
    </div>

    <BuildArea
      v-if="state.building"
      :build="state.build"
      :stock="inStock"
      :picked="state.picked"
      :wrecking="state.wrecking"
      :side-layout="sideLayout"
      @action="game.buildAction"
      @update:picked="state.picked = $event"
      @update:wrecking="state.wrecking = $event"
    />

    <BrickWall
      v-show="!state.building"
      :tower="state.tower"
      :banked="state.banked"
      :side-layout="sideLayout"
      :page-width="pageWidth"
    />

    <ChestColumn
      v-show="showChest && !state.building"
      ref="chestCol"
      :chests="chests"
      :banked="state.banked"
    />
  </div>
</template>
