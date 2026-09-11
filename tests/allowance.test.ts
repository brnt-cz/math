import { describe, expect, it } from "vitest";
import {
  BUILD_SECONDS,
  TASKS_TO_EARN,
  canBuild,
  clockText,
  fullAllowance,
  remainingTasks,
  sanitizeAllowance,
  solved,
  spend,
  type Allowance,
} from "../app/src/lib/allowance";

describe("zásoba času na stavění", () => {
  it("nová zásoba je deset minut", () => {
    const a = fullAllowance();
    expect(a.left).toBe(BUILD_SECONDS);
    expect(a.left).toBe(600);
    expect(canBuild(a)).toBe(true);
    expect(remainingTasks(a)).toBe(0);
  });

  it("stavění zásobu ubírá a pod nulu nejde", () => {
    let a = fullAllowance();

    a = spend(a, 90);
    expect(a.left).toBe(510);

    a = spend(a, 10_000);
    expect(a.left).toBe(0);
    expect(canBuild(a)).toBe(false);
    expect(remainingTasks(a)).toBe(TASKS_TO_EARN);

    // ani záporný nebo nesmyslný krok zásobu nezvětší
    expect(spend(a, -5).left).toBe(0);
    expect(spend(fullAllowance(), -5).left).toBe(BUILD_SECONDS);
    expect(spend(fullAllowance(), Number.NaN).left).toBe(BUILD_SECONDS);
  });

  it("třicátý příklad odemkne dalších deset minut", () => {
    let a = spend(fullAllowance(), BUILD_SECONDS);
    expect(canBuild(a)).toBe(false);

    for (let i = 1; i < TASKS_TO_EARN; i++) {
      a = solved(a);
      expect(canBuild(a), `po ${i} příkladech`).toBe(false);
      expect(remainingTasks(a)).toBe(TASKS_TO_EARN - i);
    }

    a = solved(a);
    expect(a).toEqual(fullAllowance());
    expect(canBuild(a)).toBe(true);
  });

  it("čas se nedá střádat dopředu", () => {
    // se zásobou se příklady nesbírají, takže 60 příkladů nedá 20 minut
    let a = fullAllowance();
    for (let i = 0; i < 100; i++) a = solved(a);

    expect(a).toEqual(fullAllowance());

    // a ani po dočerpání se nasbírané příklady nepřenášejí přes hranici
    a = spend(a, BUILD_SECONDS);
    for (let i = 0; i < TASKS_TO_EARN + 5; i++) a = solved(a);
    expect(a.left).toBe(BUILD_SECONDS);
    expect(a.solved).toBeLessThan(TASKS_TO_EARN);
  });

  it("nedočerpaná zásoba zůstává", () => {
    const a = spend(fullAllowance(), 3 * 60);
    expect(a.left).toBe(7 * 60);
    expect(spend(a, 0).left).toBe(7 * 60);
  });

  it("uložená zásoba se očistí, stará data dostanou plnou", () => {
    // starý stav zásobu neznal — nesmí zůstat bez stavění
    expect(sanitizeAllowance(undefined, undefined)).toEqual(fullAllowance());

    expect(sanitizeAllowance(120, 5)).toEqual({ left: 120, solved: 5 });
    expect(sanitizeAllowance(0, 0)).toEqual({ left: 0, solved: 0 });

    // poškozená data nesmí zásobu nafouknout
    expect(sanitizeAllowance(99999, 99999)).toEqual({ left: BUILD_SECONDS, solved: TASKS_TO_EARN - 1 });
    expect(sanitizeAllowance("nesmysl", -3)).toEqual({ left: 0, solved: 0 });
  });

  it("zbývající čas se píše jako na hodinách", () => {
    const at = (left: number): Allowance => ({ left, solved: 0 });

    expect(clockText(at(600))).toBe("10:00");
    expect(clockText(at(583))).toBe("9:43");
    expect(clockText(at(60))).toBe("1:00");
    expect(clockText(at(9))).toBe("0:09");
    expect(clockText(at(0))).toBe("0:00");
  });
});
