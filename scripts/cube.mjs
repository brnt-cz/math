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

/** Dubová prkna, stejné odstíny jako kostka ve zdi. */
export function plank() {
  return (
    face(TOP, "#B08B54", [["#9E7A45", [[0, 4], [4, 4], [8, 4], [12, 4], [0, 12], [4, 12], [8, 12], [12, 12]]]]) +
    face(LEFT, "#9A7748", [["#89673B", [[0, 4], [4, 4], [8, 4], [12, 4]]], ["#A58453", [[8, 0], [0, 8], [12, 12]]]]) +
    face(RIGHT, "#7E5C31", [["#6E4F29", [[0, 4], [4, 4], [8, 4], [12, 4]]], ["#8B6839", [[4, 0], [12, 8], [0, 12]]]])
  );
}

/** Obrys šestiúhelníku a tří vnitřních hran — kostka se tím oddělí od podkladu. */
const OUTLINE =
  '<g fill="none" stroke="#3F2D13" stroke-width="1" stroke-linejoin="miter">' +
  '<path d="M16 0L32 8V24L16 32L0 24V8Z"/><path d="M0 8L16 16L32 8"/><path d="M16 16V32"/></g>';

/** Favicona: kostka bez podkladu a bez obrysu, jako datová URL. */
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
 * 0,559 × její šířky, a do šířky se musí vejít i obrys — proto ještě rezerva,
 * jinak kruhová maska vrchol seřízne.
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
    `<g transform="translate(${off},${off}) scale(${scale})">${plank()}${OUTLINE}</g></svg>`
  );
}

/** Ikony, které vyžaduje manifest. */
export const ICONS = [
  { file: "icon-192.png", size: 192, box: 176 },
  { file: "icon-512.png", size: 512, box: 470 },
  { file: "icon-maskable-512.png", size: 512, box: SAFE_BOX },
];
