import { BoxGeometry, BufferGeometry, ConeGeometry, CylinderGeometry, Float32BufferAttribute, SphereGeometry } from 'three';
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

const tapers = new Map<string, BufferGeometry>();

/**
 * Tronco de pirámide de base rectangular (w × d) y cara superior (tw × td)
 * desplazada dz en Z; centrado en el origen como una caja. Caras planas.
 */
export function taperGeometry(w: number, h: number, d: number, tw: number, td: number, dz: number): BufferGeometry {
  const key = [w, h, d, tw, td, dz].map((v) => v.toFixed(3)).join('|');
  let g = tapers.get(key);
  if (g) return g;
  const y0 = -h / 2;
  const y1 = h / 2;
  const b = [
    [-w / 2, y0, -d / 2],
    [w / 2, y0, -d / 2],
    [w / 2, y0, d / 2],
    [-w / 2, y0, d / 2],
  ];
  const t = [
    [-tw / 2, y1, dz - td / 2],
    [tw / 2, y1, dz - td / 2],
    [tw / 2, y1, dz + td / 2],
    [-tw / 2, y1, dz + td / 2],
  ];
  const quads = [
    [t[0], t[3], t[2], t[1]], // arriba
    [b[0], b[1], b[2], b[3]], // abajo
    [b[3], b[2], t[2], t[3]], // frente (+z)
    [b[1], b[0], t[0], t[1]], // trasera (-z)
    [b[2], b[1], t[1], t[2]], // derecha
    [b[0], b[3], t[3], t[0]], // izquierda
  ];
  const pos: number[] = [];
  const uv: number[] = [];
  for (const [a, c1, c2, c3] of quads) {
    for (const v of [a, c1, c2, a, c2, c3]) pos.push(v[0], v[1], v[2]);
    uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
  }
  g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  if (tapers.size > 300) tapers.clear();
  tapers.set(key, g);
  return g;
}

/** Geometría y escala de una pieza. */
export function partGeometry(part: Part): { geometry: BufferGeometry; scale: [number, number, number] } {
  if (part.s === 'rbox') return { geometry: roundedBox(part.d[0], part.d[1], part.d[2], part.radius ?? 0.03), scale: [1, 1, 1] };
  if (part.s === 'taper') {
    const [tw, td, dz] = part.taper ?? [part.d[0], part.d[2], 0];
    return { geometry: taperGeometry(part.d[0], part.d[1], part.d[2], tw, td, dz), scale: [1, 1, 1] };
  }
  return { geometry: UNIT[part.s as keyof typeof UNIT], scale: part.d };
}
