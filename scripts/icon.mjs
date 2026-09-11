/**
 * Vypíše SVG jedné ikony PWA. PNG se z něj udělá vykreslením v prohlížeči
 * na stejný rozměr, viz README.
 *
 *   node scripts/icon.mjs icon-maskable-512.png > icon.svg
 *   node scripts/icon.mjs 512 352 > icon.svg
 */

import { ICONS, iconSvg } from "./cube.mjs";

const [a, b] = process.argv.slice(2);
const named = ICONS.find((i) => i.file === a);
const size = named ? named.size : Number(a);
const box = named ? named.box : Number(b);

if (!size || !box) {
  const names = ICONS.map((i) => `${i.file} (${i.size} px, kostka ${i.box} px)`).join("\n  ");
  console.error(`Použití: node scripts/icon.mjs <jméno ikony | velikost kostka>\n\n  ${names}`);
  process.exit(1);
}

process.stdout.write(iconSvg(size, box) + "\n");
