/**
 * Odpočet času na stavění.
 *
 * Měří se **rozdíly časových značek**, ne tikání intervalu: prohlížeč interval na
 * pozadí přiškrtí a syn by o čas přišel — nebo naopak. Interval je tu jen proto, aby
 * se obnovoval nápis na obrazovce.
 *
 * Odpočet stojí, když se nestaví nebo appka není vidět (`visibilitychange`), takže
 * o čas nepřijde tím, že mu někdo zavolá.
 */

import { onBeforeUnmount, onMounted, watch } from "vue";
import type { Game } from "./useGame";

/** Jak často se obnovuje zbývající čas na obrazovce. */
const TICK_MS = 1000;

export function useBuildClock(game: Game) {
  const { state } = game;

  /** začátek běžícího úseku; `null` znamená, že odpočet stojí */
  let since: number | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  function now(): number {
    return Date.now();
  }

  /** Odečte, co uběhlo od poslední značky. Zbytek pod sekundu se do značky vrací. */
  function settle(): void {
    if (since === null) return;

    const passed = now() - since;
    const seconds = Math.floor(passed / 1000);
    if (seconds <= 0) return;

    since += seconds * 1000;
    game.spendBuildTime(seconds);
  }

  function stop(): void {
    settle();
    since = null;

    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function start(): void {
    if (since !== null) return;

    since = now();
    timer = setInterval(settle, TICK_MS);
  }

  function sync(): void {
    const running = state.building && (typeof document === "undefined" || !document.hidden);
    if (running) start();
    else stop();
  }

  watch(() => state.building, sync);

  onMounted(() => {
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pagehide", stop);
    sync();
  });

  onBeforeUnmount(() => {
    document.removeEventListener("visibilitychange", sync);
    window.removeEventListener("pagehide", stop);
    stop();
  });
}
