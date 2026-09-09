/** Rozvržení podle orientace — stejná podmínka jako v CSS: pruh vpravo jen na šířku. */
import { onBeforeUnmount, onMounted, ref } from "vue";

export function useSideLayout() {
  const page = ref<HTMLElement | null>(null);
  const sideLayout = ref(true);
  const pageWidth = ref(1024);

  const query =
    typeof matchMedia === "undefined"
      ? null
      : matchMedia("(min-width: 30rem) and (orientation: landscape)");

  function update(): void {
    sideLayout.value = query ? query.matches : true;
    pageWidth.value = page.value?.clientWidth ?? pageWidth.value;
  }

  onMounted(() => {
    update();
    addEventListener("resize", update);
    query?.addEventListener("change", update);
  });

  onBeforeUnmount(() => {
    removeEventListener("resize", update);
    query?.removeEventListener("change", update);
  });

  return { sideLayout, pageWidth, page };
}
