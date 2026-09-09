/** Minecraftový popisek s názvem kostky pod kurzorem. */
import { onBeforeUnmount, onMounted, ref } from "vue";

export function usePointerTip() {
  const tipText = ref("");
  const tipVisible = ref(false);
  const tip = ref<Record<string, string>>({});

  let host: HTMLElement | null = null;

  function onMove(e: MouseEvent): void {
    const found = (e.target as HTMLElement | null)?.closest?.("[data-name]") as HTMLElement | null;

    if (!found) {
      host = null;
      tipVisible.value = false;
      return;
    }

    if (found !== host) {
      host = found;
      tipText.value = found.dataset.name ?? "";
      tipVisible.value = true;
    }

    const pad = 14;
    tip.value = { transform: `translate(${Math.max(4, e.clientX + pad)}px,${Math.max(4, e.clientY + pad + 4)}px)` };
  }

  onMounted(() => document.addEventListener("mousemove", onMove));
  onBeforeUnmount(() => document.removeEventListener("mousemove", onMove));

  return { tip, tipText, tipVisible };
}
