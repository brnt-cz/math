import { describe, expect, it } from "vitest";
import defs from "../app/src/components/BlockDefs.vue?raw";
// build skript je v čistém JS a typy nemá; pro test stačí, že vrací řetězec
// @ts-expect-error
import { plank } from "../scripts/cube.mjs";

/**
 * Dubová prkna kreslí appka i ikony PWA. Jsou to dvě místa (SVG symbol v komponentě
 * a skript na ikony), a bez téhle kontroly by se dřív nebo později rozešla.
 */
describe("prkna v appce a na ikoně", () => {
  it("kostka prken je doslova jedna kresba", () => {
    const symbol = /<symbol id="blk-plank"[^>]*>([\s\S]*?)<\/symbol>/.exec(defs);
    expect(symbol, "symbol blk-plank v BlockDefs.vue").not.toBeNull();
    expect(symbol?.[1]).toBe(plank() as string);
  });

  it("prkna mají spáry a žilky, ne jen pruhy", () => {
    const drawing: string = plank();

    // spára dole u každého ze čtyř prken, na všech třech stěnách
    expect(drawing.match(/height="1"/g)?.length).toBeGreaterThanOrEqual(3 * 4);
    // a žilky do délky, ne krátké tahy jako u cihel
    expect(drawing).toMatch(/width="(9|10)" height="1"/);
  });
});
