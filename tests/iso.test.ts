import { describe, expect, it } from "vitest";
import {
  FACES,
  ISO_COLS,
  ISO_DEPTH,
  ISO_LEVELS,
  boxAt,
  depth,
  faceTransform,
  floorAt,
  inScene,
  neighbor,
  parseVoxel,
  sceneSize,
  voxelKey,
  type Face,
  type Voxel,
} from "../app/src/lib/iso";

/** Všechny buňky scény. */
function everyVoxel(): Voxel[] {
  const out: Voxel[] = [];
  for (let x = 0; x < ISO_COLS; x++) {
    for (let y = 0; y < ISO_DEPTH; y++) {
      for (let z = 0; z < ISO_LEVELS; z++) out.push({ x, y, z });
    }
  }
  return out;
}

type Point = { x: number; y: number };

/** Rohy stěny v souřadnicích scény — čte se přímo z matice pro `transform`. */
function corners(face: Face, at: { left: number; top: number }, size = 1): Point[] {
  const m = /^matrix\(([^)]*)\)$/.exec(faceTransform(face, size));
  const [a, b, c, d, e, f] = (m?.[1] ?? "").split(",").map(Number) as number[];

  return [
    [0, 0],
    [size, 0],
    [size, size],
    [0, size],
  ].map(([lx, ly]) => ({
    x: at.left * size + (a as number) * (lx as number) + (c as number) * (ly as number) + (e as number),
    y: at.top * size + (b as number) * (lx as number) + (d as number) * (ly as number) + (f as number),
  }));
}

function area(poly: Point[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i] as Point;
    const q = poly[(i + 1) % poly.length] as Point;
    sum += p.x * q.y - q.x * p.y;
  }
  return Math.abs(sum) / 2;
}

const near = (a: Point, b: Point): boolean => Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
const shared = (p: Point[], q: Point[]): number => p.filter((a) => q.some((b) => near(a, b))).length;

describe("izometrie", () => {
  it("klíč buňky se rozebere a mimo scénu se zahodí", () => {
    expect(parseVoxel("0,0,0")).toEqual({ x: 0, y: 0, z: 0 });
    expect(parseVoxel(voxelKey(1, 2, 3))).toEqual({ x: 1, y: 2, z: 3 });

    expect(parseVoxel(`${ISO_COLS},0,0`)).toBeNull();
    expect(parseVoxel(`0,${ISO_DEPTH},0`)).toBeNull();
    expect(parseVoxel(`0,0,${ISO_LEVELS}`)).toBeNull();
    expect(parseVoxel("-1,0,0")).toBeNull();
    expect(parseVoxel("1,1")).toBeNull();
    expect(parseVoxel("a,b,c")).toBeNull();

    expect(inScene({ x: 0, y: 0, z: 0 })).toBe(true);
    expect(inScene({ x: 0.5, y: 0, z: 0 })).toBe(false);
  });

  it("osy míří tam, kam mají", () => {
    const o = boxAt({ x: 2, y: 2, z: 2 });

    expect(boxAt({ x: 3, y: 2, z: 2 })).toEqual({ left: o.left + 0.5, top: o.top + 0.25 });
    expect(boxAt({ x: 2, y: 3, z: 2 })).toEqual({ left: o.left - 0.5, top: o.top + 0.25 });
    expect(boxAt({ x: 2, y: 2, z: 3 })).toEqual({ left: o.left, top: o.top - 0.5 });
  });

  it("kostka nad kostkou na ni sedne, sousedi se stýkají hranou", () => {
    const v = { x: 3, y: 4, z: 1 };

    // svisle: horní stěna spodní kostky je zároveň spodek té nad ní
    expect(boxAt({ ...v, z: v.z + 1 }).top + 0.5).toBe(boxAt(v).top);

    // vodorovně: každá sousední stěna má s tou naší dvě společné vrcholy
    const mine = corners("top", boxAt(v));
    expect(shared(mine, corners("top", boxAt({ ...v, x: v.x + 1 })))).toBe(2);
    expect(shared(mine, corners("top", boxAt({ ...v, y: v.y + 1 })))).toBe(2);
  });

  it("podlaha je celistvá mřížka bez mezer", () => {
    const tile = (x: number, y: number): Point[] => corners("top", floorAt(x, y));

    expect(shared(tile(0, 0), tile(1, 0))).toBe(2);
    expect(shared(tile(0, 0), tile(0, 1))).toBe(2);
    expect(shared(tile(2, 3), tile(3, 3))).toBe(2);

    // políčko podlahy má stejnou plochu jako horní stěna kostky
    expect(area(tile(0, 0))).toBeCloseTo(0.25, 12);

    // podlaha pod kostkou na zemi leží přesně o půl kostky níž
    expect(floorAt(1, 2).top - boxAt({ x: 1, y: 2, z: 0 }).top).toBeCloseTo(0.5, 12);
  });

  it("tři stěny pokryjí celou kostku a nepřekrývají se", () => {
    const at = boxAt({ x: 1, y: 1, z: 1 });
    const total = FACES.reduce((sum, face) => sum + area(corners(face, at)), 0);

    // šestiúhelník kostky jsou tři kosočtverce o ploše 1/4
    expect(total).toBeCloseTo(0.75, 12);

    // stěny se stýkají v předním vrcholu horní stěny
    expect(shared(corners("top", at), corners("right", at))).toBe(2);
    expect(shared(corners("top", at), corners("left", at))).toBe(2);
    expect(shared(corners("right", at), corners("left", at))).toBe(2);
  });

  it("klepnutí na stěnu položí kostku tam, kam je stěna otočená", () => {
    const v = { x: 2, y: 3, z: 1 };

    expect(neighbor(v, "top")).toEqual({ x: 2, y: 3, z: 2 });
    expect(neighbor(v, "right")).toEqual({ x: 3, y: 3, z: 1 });
    expect(neighbor(v, "left")).toEqual({ x: 2, y: 4, z: 1 });

    // boční stěny kladou dopředu, tedy mezi kostku a diváka
    for (const face of ["right", "left"] as Face[]) {
      expect(depth(neighbor(v, face))).toBeGreaterThan(depth(v));
    }
  });

  it("hloubka určuje pořadí kreslení správně", () => {
    const v = { x: 2, y: 2, z: 2 };

    // kostka přímo před námi padne na stejné místo a musí se kreslit později
    const front = { x: v.x + 1, y: v.y + 1, z: v.z + 1 };
    expect(boxAt(front)).toEqual(boxAt(v));
    expect(depth(front)).toBeGreaterThan(depth(v));

    // co může zakrývat, má větší hloubku; kostka pod tou naší menší (nezakrývá)
    expect(depth({ ...v, x: v.x + 1 })).toBeGreaterThan(depth(v));
    expect(depth({ ...v, y: v.y + 1 })).toBeGreaterThan(depth(v));
    expect(depth({ ...v, z: v.z - 1 })).toBeLessThan(depth(v));
  });

  it("celá scéna i s podlahou se vejde do svého rámce", () => {
    const { w, h } = sceneSize();

    for (const v of everyVoxel()) {
      const { left, top } = boxAt(v);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(left + 1).toBeLessThanOrEqual(w);
      expect(top + 1).toBeLessThanOrEqual(h);
    }

    for (let x = 0; x < ISO_COLS; x++) {
      for (let y = 0; y < ISO_DEPTH; y++) {
        for (const p of corners("top", floorAt(x, y))) {
          expect(p.x).toBeGreaterThanOrEqual(-1e-9);
          expect(p.y).toBeGreaterThanOrEqual(-1e-9);
          expect(p.x).toBeLessThanOrEqual(w + 1e-9);
          expect(p.y).toBeLessThanOrEqual(h + 1e-9);
        }
      }
    }

    // rámec není zbytečně velký: krajní kostky se ho dotýkají
    expect(Math.min(...everyVoxel().map((v) => boxAt(v).top))).toBe(0);
    expect(Math.min(...everyVoxel().map((v) => boxAt(v).left))).toBe(0);
    expect(Math.max(...everyVoxel().map((v) => boxAt(v).left)) + 1).toBe(w);
  });
});
