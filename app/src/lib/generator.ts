/**
 * Generátor příkladů.
 *
 * Příklad se skládá z bloků: blok je jedno číslo nebo řetězec `× ÷`, bloky se pak
 * sčítají a odčítají. Přednost `× ÷` před `+ −` je tím zaručená konstrukcí — zápis
 * nikdy nemusíme dodatečně parsovat.
 *
 * Průběžně se hlídá, že každý mezivýsledek zůstane celé číslo v rozsahu 1..max:
 * žádné minus, žádné přetečení, dělení beze zbytku.
 */

export const OP_KEYS = ["add", "sub", "mul", "div"] as const;
export type OpKey = (typeof OP_KEYS)[number];

type Family = "sum" | "prod";

const OPS: Record<OpKey, { sym: string; fam: Family }> = {
  add: { sym: "+", fam: "sum" },
  sub: { sym: "−", fam: "sum" },
  mul: { sym: "×", fam: "prod" },
  div: { sym: "÷", fam: "prod" },
};

/** "do 20" má cvičit přechod přes desítku... */
const HIGH_FROM = 11;
/** ...ale každý pátý příklad může zůstat pod deseti. */
const EASY_SHARE = 20;

export type Ops = Record<OpKey, boolean>;

export type Config = {
  /** horní hranice rozsahu: 10 nebo 20 */
  range: number;
  /** kolik čísel je v příkladu: 2–4 */
  terms: number;
  ops: Ops;
};

export type Task = {
  /** čísla v pořadí, jak jsou v zápise */
  terms: number[];
  /** znaménka mezi nimi, délka `terms.length - 1` */
  ops: string[];
  result: number;
};

export type Rng = () => number;

const defaultRng: Rng = Math.random;

function rnd(n: number, rng: Rng): number {
  return Math.floor(rng() * n);
}

function shuffled<T>(arr: readonly T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1, rng);
    const ai = a[i] as T;
    a[i] = a[j] as T;
    a[j] = ai;
  }
  return a;
}

/**
 * Čísla, kterými lze operaci provést, aby mezivýsledek zůstal v rozsahu.
 * `relaxed` navíc povolí dělení sebou samým (x÷x=1) — jen když jinak příklad
 * vůbec nejde sestavit, třeba „do 10, jen ÷, 4 čísla“.
 */
export function candidates(op: OpKey, running: number, max: number, relaxed = false): number[] {
  const list: number[] = [];

  if (op === "add") {
    for (let n = 1; n <= max - running; n++) list.push(n);
  } else if (op === "sub") {
    for (let n = 1; n <= running - 1; n++) list.push(n);
  } else if (op === "mul") {
    for (let n = 2; n * running <= max; n++) list.push(n);
  } else {
    for (let n = 2; n < running; n++) if (running % n === 0) list.push(n);
    if (relaxed && running >= 2) list.push(running);
  }
  return list;
}

export function applyOp(op: OpKey, running: number, n: number): number {
  if (op === "add") return running + n;
  if (op === "sub") return running - n;
  if (op === "mul") return running * n;
  return running / n;
}

function activeOps(ops: Ops): OpKey[] {
  const on = OP_KEYS.filter((k) => ops[k]);
  return on.length ? on : ["add"];
}

function pickOp(
  pool: OpKey[],
  running: number,
  max: number,
  relaxed: boolean,
  rng: Rng,
): { op: OpKey; n: number } | null {
  for (const op of shuffled(pool, rng)) {
    const c = candidates(op, running, max, relaxed);
    if (c.length) return { op, n: c[rnd(c.length, rng)] as number };
  }
  return null;
}

type Blok = { value: number; nums: number[]; syms: string[] };

/** Blok o délce `len`, jehož hodnota padne do [lo, hi]. */
function makeBlock(
  len: number,
  lo: number,
  hi: number,
  prodPool: OpKey[],
  cfg: Config,
  relaxed: boolean,
  rng: Rng,
): Blok | null {
  if (lo > hi) return null;
  if (len === 1) return { value: lo + rnd(hi - lo + 1, rng), nums: [], syms: [] };

  for (let attempt = 0; attempt < 60; attempt++) {
    let value = 1 + rnd(cfg.range, rng);
    const nums = [value];
    const syms: string[] = [];
    let ok = true;

    for (let i = 1; i < len; i++) {
      const picked = pickOp(prodPool, value, cfg.range, relaxed, rng);
      if (!picked) {
        ok = false;
        break;
      }
      value = applyOp(picked.op, value, picked.n);
      nums.push(picked.n);
      syms.push(OPS[picked.op].sym);
    }

    if (ok && value >= lo && value <= hi) return { value, nums, syms };
  }
  return null;
}

/** Náhodné rozdělení počtu čísel na bloky. */
function composition(n: number, canGroup: boolean, rng: Rng): number[] {
  if (!canGroup) return Array.from({ length: n }, () => 1);

  const parts: number[] = [];
  let left = n;
  while (left > 0) {
    const len = 1 + rnd(left, rng);
    parts.push(len);
    left -= len;
  }
  return parts;
}

function pushBlock(terms: number[], syms: string[], blk: Blok, joinSym: string | null): void {
  const nums = blk.nums.length ? blk.nums : [blk.value];
  if (joinSym) syms.push(joinSym);

  terms.push(nums[0] as number);
  for (let i = 1; i < nums.length; i++) {
    syms.push(blk.syms[i - 1] as string);
    terms.push(nums[i] as number);
  }
}

type Pass = {
  /** povolit dělení sebou samým (x÷x) */
  selfDivision: boolean;
  /** vyžadovat, aby příklad šel přes desítku (jen v rozsahu do 20) */
  preferHigh: boolean;
};

function buildTask(cfg: Config, pass: Pass, rng: Rng): Task | null {
  const relaxed = pass.selfDivision;
  const on = activeOps(cfg.ops);
  const sumPool = on.filter((k) => OPS[k].fam === "sum");
  const prodPool = on.filter((k) => OPS[k].fam === "prod");

  for (let attempt = 0; attempt < 300; attempt++) {
    // bez + a − musí být všechna čísla v jednom bloku, bez × a ÷ naopak každé samo
    const comp = sumPool.length
      ? composition(cfg.terms, prodPool.length > 0, rng)
      : [cfg.terms];

    const first = makeBlock(comp[0] as number, 1, cfg.range, prodPool, cfg, relaxed, rng);
    if (!first) continue;

    const terms: number[] = [];
    const syms: string[] = [];
    let running = first.value;
    let peak = first.value;
    let ok = true;

    pushBlock(terms, syms, first, null);

    for (let b = 1; b < comp.length; b++) {
      let added = false;

      for (const op of shuffled(sumPool, rng)) {
        const hi = op === "add" ? cfg.range - running : running - 1;
        const blk = makeBlock(comp[b] as number, 1, hi, prodPool, cfg, relaxed, rng);
        if (!blk) continue;

        running = applyOp(op, running, blk.value);
        peak = Math.max(peak, running, blk.value);
        pushBlock(terms, syms, blk, OPS[op].sym);
        added = true;
        break;
      }

      if (!added) {
        ok = false;
        break;
      }
    }

    if (!ok || terms.length !== cfg.terms) continue;

    // v rozsahu do 20 chceme převážně příklady, které se přes desítku dostanou
    if (pass.preferHigh && cfg.range > 10 && peak < HIGH_FROM && rnd(100, rng) >= EASY_SHARE) {
      continue;
    }

    return { terms, ops: syms, result: running };
  }
  return null;
}

/**
 * Tři průchody, každý povolí o jednu věc víc. Dělení sebou samým je až v posledním,
 * takže se `x÷x` objeví jen tam, kde příklad jinak sestavit nejde — nespojuje se
 * to s tím, že se nepovedl příklad přes desítku.
 */
export function makeTask(cfg: Config, rng: Rng = defaultRng): Task {
  return (
    buildTask(cfg, { selfDivision: false, preferHigh: true }, rng) ??
    buildTask(cfg, { selfDivision: false, preferHigh: false }, rng) ??
    buildTask(cfg, { selfDivision: true, preferHigh: false }, rng) ?? {
      terms: [1, 1],
      ops: ["+"],
      result: 2,
    }
  );
}

/** Zápis příkladu, jak ho dítě vidí. */
export function taskText(task: Task): string {
  return task.terms.reduce(
    (text, n, i) => (i === 0 ? String(n) : text + task.ops[i - 1] + n),
    "",
  );
}
