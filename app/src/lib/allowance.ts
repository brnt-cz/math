/**
 * Zásoba času na stavění.
 *
 * Stavěním se nemá strávit moc času: je na něj 10 minut, a když se vyčerpají, musí se
 * spočítat 30 příkladů, aby se odemklo znovu. Čas se nedá „nakoupit“ dopředu — příklady
 * se počítají teprve tehdy, když je zásoba na nule, takže se z toho nedá udělat
 * hodina stavění za odpoledne příkladů.
 *
 * Je to čisté účtování: **uplynulé sekundy jsou parametr**, ne `Date.now()` uvnitř,
 * jinak by se to nedalo otestovat bez čekání.
 */

/** Kolik času je na stavění. */
export const BUILD_SECONDS = 10 * 60;
/** Kolik příkladů odemkne další zásobu. */
export const TASKS_TO_EARN = 30;

export type Allowance = {
  /** zbývající sekundy stavění */
  left: number;
  /** spočítané příklady od vyčerpání zásoby */
  solved: number;
};

export function fullAllowance(): Allowance {
  return { left: BUILD_SECONDS, solved: 0 };
}

function whole(raw: unknown, max: number): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
}

/**
 * Očistí uloženou zásobu. Starší data ji neznají — těm patří plná zásoba, ne nula,
 * aby syn po aktualizaci nepřišel o stavění.
 */
export function sanitizeAllowance(left: unknown, solved: unknown): Allowance {
  if (left === undefined && solved === undefined) return fullAllowance();
  return { left: whole(left, BUILD_SECONDS), solved: whole(solved, TASKS_TO_EARN - 1) };
}

/** Odečte odestavěné sekundy; pod nulu to nejde. */
export function spend(a: Allowance, seconds: number): Allowance {
  if (!(seconds > 0) || a.left <= 0) return a;
  return { ...a, left: Math.max(0, a.left - Math.floor(seconds)) };
}

/**
 * Spočítaný příklad. Sbírá se jen s prázdnou zásobou, takže se čas nedá střádat
 * dopředu; třicátý příklad zásobu dorovná na plnou.
 */
export function solved(a: Allowance, n = 1): Allowance {
  if (a.left > 0 || !(n > 0)) return a;

  const count = a.solved + Math.floor(n);
  return count >= TASKS_TO_EARN ? fullAllowance() : { ...a, solved: count };
}

/** Zbývá čas na stavění? */
export function canBuild(a: Allowance): boolean {
  return a.left > 0;
}

/** Kolik příkladů ještě zbývá spočítat; se zásobou je to nula. */
export function remainingTasks(a: Allowance): number {
  return a.left > 0 ? 0 : TASKS_TO_EARN - a.solved;
}

/** Zbývající čas, jak ho vidí dítě: „9:43“. */
export function clockText(a: Allowance): string {
  const total = Math.max(0, Math.ceil(a.left));
  const min = Math.floor(total / 60);
  return `${min}:${String(total - min * 60).padStart(2, "0")}`;
}
