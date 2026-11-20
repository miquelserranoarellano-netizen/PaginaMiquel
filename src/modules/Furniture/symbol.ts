/**
 * Símbolo en planta generado a partir de las piezas 3D del mueble: cada pieza
 * se proyecta sobre el plano horizontal (elipse para cilindros/esferas
 * verticales, envolvente convexa para el resto).
 */
import { convexHull } from '@/core/geometry';
import type { CatalogItem, ParamValues, Part } from './types';
import { resolveParams } from './params';

export type SymbolShape =
  | { kind: 'poly'; points: string; slot: string; top: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rot: number; slot: string; top: number };

function rotatePoint(x: number, y: number, z: number, r: [number, number, number]): [number, number, number] {
  // Orden XYZ (igual que Euler por defecto de Three.js).
  const [a, b, c] = r;
  // Rz
  let x1 = x * Math.cos(c) - y * Math.sin(c);
  let y1 = x * Math.sin(c) + y * Math.cos(c);
  let z1 = z;
  // Ry
  const x2 = x1 * Math.cos(b) + z1 * Math.sin(b);
  const z2 = -x1 * Math.sin(b) + z1 * Math.cos(b);
  x1 = x2;
  z1 = z2;
  // Rx
  const y3 = y1 * Math.cos(a) - z1 * Math.sin(a);
  const z3 = y1 * Math.sin(a) + z1 * Math.cos(a);
  y1 = y3;
  z1 = z3;
  return [x1, y1, z1];
}

function partShape(p: Part): SymbolShape | null {
  const [w, h, d] = p.d;
  const r = p.r ?? [0, 0, 0];
  const top = p.p[1] + h / 2;
  const vertical = Math.abs(r[0]) < 1e-6 && Math.abs(r[2]) < 1e-6;
  if ((p.s === 'cyl' || p.s === 'sphere' || p.s === 'cone') && vertical) {
    return { kind: 'ellipse', cx: p.p[0], cy: p.p[2], rx: w / 2, ry: d / 2, rot: (-r[1] * 180) / Math.PI, slot: p.m, top };
  }
  const corners: { x: number; y: number }[] = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        const [x, , z] = rotatePoint((sx * w) / 2, (sy * h) / 2, (sz * d) / 2, r);
        corners.push({ x: x + p.p[0], y: z + p.p[2] });
      }
  const hull = convexHull(corners);
  if (hull.length < 3) return null;
  return { kind: 'poly', points: hull.map((q) => `${q.x.toFixed(4)},${q.y.toFixed(4)}`).join(' '), slot: p.m, top };
}

const cache = new Map<string, SymbolShape[]>();

export function furnitureSymbol(item: CatalogItem, w: number, d: number, h: number, params?: ParamValues): SymbolShape[] {
  const p = resolveParams(item, params);
  const key = `${item.id}|${w.toFixed(3)}|${d.toFixed(3)}|${h.toFixed(3)}|${JSON.stringify(p)}`;
  let shapes = cache.get(key);
  if (!shapes) {
    shapes = item
      .build(w, d, h, p)
      .filter((p) => !p.noPlan)
      .map(partShape)
      .filter((s): s is SymbolShape => !!s)
      .sort((a, b) => a.top - b.top);
    if (cache.size > 500) cache.clear();
    cache.set(key, shapes);
  }
  return shapes;
}
