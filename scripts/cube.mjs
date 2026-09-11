/**
 * Dřevěná kostka na jednom místě: favicona v `index.html` i ikony PWA jsou ta samá
 * kresba, ať se nemohou rozejít. Kostka je izometrická krychle jako ve hře —
 * hrana 16 jednotek v obalu 32 × 32, tři stěny přes matice níž.
 */

const TOP = "matrix(1,.5,-1,.5,16,0)";
const LEFT = "matrix(1,.5,0,1,0,8)";
const RIGHT = "matrix(1,-.5,0,1,16,16)";

function face(mat, base, pixels) {
  const rects = pixels.flatMap(([color, cells]) =>
    cells.map(([u, v]) => `<rect x="${u}" y="${v}" width="4" height="4" fill="${color}"/>`),
  );
  return `<g transform="${mat}"><rect width="16" height="16" fill="${base}"/>${rects.join("")}</g>`;
}

/**
 * Dubová prkna: čtyři pásy po 4 px, spára dole u každého a **jedna** krátká svislá
 * spára na stěnu. Žilky jsou dlouhé a tenké, aby to čtlo jako dřevo — svislá spára
 * v každém pásu a krátké tahy vypadaly jako cihlová zeď.
 */
function plankFace(mat, tones, seam, grain) {
  const parts = [`<rect width="16" height="16" fill="${tones.base}"/>`];

  for (let row = 0; row < 4; row++) {
    parts.push(`<rect x="0" y="${row * 4 + 3}" width="16" height="1" fill="${tones.seam}"/>`);
  }
  parts.push(`<rect x="${seam[0]}" y="${seam[1] * 4}" width="1" height="3" fill="${tones.seam}"/>`);
  for (const [x, y, w] of grain) {
    parts.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${tones.grain}"/>`);
  }

  return `<g transform="${mat}">${parts.join("")}</g>`;
}

/** Odstíny stěn: horní nejsvětlejší, pravá nejtmavší — stejně jako kostky ve hře. */
export function plank() {
  return (
    plankFace(TOP, { base: "#B08B54", seam: "#8A6A3C", grain: "#A88049" }, [6, 1], [[1, 1, 9], [7, 5, 7], [3, 9, 10], [8, 13, 6]]) +
    plankFace(LEFT, { base: "#9A7748", seam: "#775A32", grain: "#906C3E" }, [10, 2], [[2, 1, 8], [6, 6, 8], [1, 10, 7], [9, 14, 6]]) +
    plankFace(RIGHT, { base: "#7E5C31", seam: "#5E4420", grain: "#745229" }, [4, 0], [[5, 2, 9], [1, 5, 7], [7, 10, 8], [2, 13, 9]])
  );
}

/** Favicona: ta samá kostka bez podkladu, jako datová URL. */
export function faviconHref() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${plank()}</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg).replace(/%2F/g, "/").replace(/%3A/g, ":").replace(/%3D/g, "=");
}

/** Podklad ikon je stejný jako `background_color` v manifestu. */
export const ICON_BACKGROUND = "#EEF2F8";

/**
 * Největší kostka, která se vejde do bezpečné zóny maskovatelné ikony 512 × 512.
 *
 * Systém takovou ikonu obřezává podle svého tvaru a zaručená je jen kružnice
 * o průměru 80 % plátna, tedy poloměr 204,8 px. Vrchol kostky je od středu
 * 0,559 × její šířky — proto ještě rezerva, jinak kruhová maska vrchol seřízne.
 */
export const SAFE_BOX = Math.floor(((0.4 * 512) / 0.559 - 12) / 4) * 4;

/**
 * Ikona: kostka o šířce `box` vycentrovaná na svůj šestiúhelník v plátně `size`.
 * Centruje se obal kostky, který je na výšku i na šířku symetrický, takže kresba
 * sedí na střed plátna.
 */
export function iconSvg(size, box) {
  const scale = box / 32;
  const off = (size - box) / 2;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="${ICON_BACKGROUND}"/>` +
    `<g transform="translate(${off},${off}) scale(${scale})">${plank()}</g></svg>`
  );
}

/** Ikony, které vyžaduje manifest. */
export const ICONS = [
  { file: "icon-192.png", size: 192, box: 176 },
  { file: "icon-512.png", size: 512, box: 470 },
  { file: "icon-maskable-512.png", size: 512, box: SAFE_BOX },
];
