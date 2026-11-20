import { BoxGeometry, type BufferGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Part } from './types';

/** Geometrías unitarias compartidas (se escalan por pieza). */
export const UNIT = {
  box: new BoxGeometry(1, 1, 1),
  cyl: new CylinderGeometry(0.5, 0.5, 1, 28),
  sphere: new SphereGeometry(0.5, 24, 16),
  cone: new ConeGeometry(0.5, 1, 28),
};

const rounded = new Map<string, BufferGeometry>();

export function roundedBox(w: number, h: number, d: number, r: number): BufferGeometry {
  const radius = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${radius.toFixed(3)}`;
  let g = rounded.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 3, radius);
    if (rounded.size > 800) rounded.clear();
    rounded.set(key, g);
  }
  return g;
}

/** Geometría y escala de una pieza. */
export function partGeometry(part: Part): { geometry: BufferGeometry; scale: [number, number, number] } {
  if (part.s === 'rbox') return { geometry: roundedBox(part.d[0], part.d[1], part.d[2], part.radius ?? 0.03), scale: [1, 1, 1] };
  return { geometry: UNIT[part.s], scale: part.d };
}
