/**
 * Miniaturas de materiales para la interfaz, recortadas de las texturas
 * procedurales (o un color liso para pinturas, vidrio, etc.).
 */
import type { MaterialDef } from './library';
import { getPatternCanvas } from './patterns';

const cache = new Map<string, string>();

export function materialPreview(def: MaterialDef, color: string): string {
  const key = `${def.id}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let url: string;
  const src = getPatternCanvas(def, color);
  if (src) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    // Recorte que representa ~60 cm reales.
    const frac = Math.min(1, 0.6 / def.tileSize);
    g.drawImage(src, 0, 0, src.width * frac, src.height * frac, 0, 0, 64, 64);
    url = c.toDataURL('image/png');
  } else {
    const glass = def.pattern === 'glass' || def.pattern === 'water';
    const svg = glass
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${color}"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><path d="M10 50 L50 10" stroke="#fff" stroke-width="4" opacity=".7"/></svg>`
      : def.pattern === 'emissive'
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><radialGradient id="g"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${color}"/></radialGradient></defs><rect width="64" height="64" fill="url(#g)"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="${def.metalness > 0.5 ? 0.45 : 0.12}"/><stop offset="1" stop-color="#000000" stop-opacity="${def.metalness > 0.5 ? 0.25 : 0.06}"/></linearGradient></defs><rect width="64" height="64" fill="${color}"/><rect width="64" height="64" fill="url(#g)"/></svg>`;
    url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
  cache.set(key, url);
  return url;
}
