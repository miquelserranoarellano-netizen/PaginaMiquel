/**
 * Ajuste de puntos (snap): extremos de muros y vértices de estancias, ángulos
 * (0/45/90° suaves, 15° con Mayús), alineaciones horizontales/verticales,
 * puntos sobre muros y cuadrícula.
 */
import { type Vec2, add, distance, fromAngle, length, projectOnSegment, roundTo, sub } from '@/core/geometry';
import type { ID, ProjectDoc } from '@/modules/FloorPlan/types';

export type SnapKind = 'none' | 'grid' | 'endpoint' | 'midpoint' | 'wall' | 'angle' | 'align';

export interface SnapResult {
  point: Vec2;
  kind: SnapKind;
  /** Guías a dibujar (alineaciones). */
  guides: { from: Vec2; to: Vec2 }[];
}

export interface SnapOptions {
  doc: ProjectDoc;
  levelId: ID;
  zoom: number;
  gridSize: number;
  snapGrid: boolean;
  snapObjects: boolean;
  /** Punto de referencia para ángulos (inicio del segmento en curso). */
  anchor?: Vec2 | null;
  /** Mayús: fuerza ángulos múltiplos de 15°. */
  constrain?: boolean;
  /** Alt: sin ajuste. */
  free?: boolean;
  /** Puntos que no deben usarse como destino (p. ej. el que se arrastra). */
  excludePoints?: Vec2[];
}

function candidates(o: SnapOptions): { ends: Vec2[]; mids: Vec2[] } {
  const ends: Vec2[] = [];
  const mids: Vec2[] = [];
  for (const w of Object.values(o.doc.walls)) {
    if (w.levelId !== o.levelId) continue;
    ends.push(w.start, w.end);
    mids.push({ x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 });
  }
  for (const r of Object.values(o.doc.rooms)) if (r.levelId === o.levelId) ends.push(...r.points);
  for (const d of Object.values(o.doc.dimensions)) if (d.levelId === o.levelId) ends.push(d.start, d.end);
  const ex = o.excludePoints ?? [];
  const keep = (p: Vec2) => !ex.some((e) => distance(e, p) < 1e-4);
  return { ends: ends.filter(keep), mids: mids.filter(keep) };
}

export function snapPoint(raw: Vec2, o: SnapOptions): SnapResult {
  if (o.free) return { point: raw, kind: 'none', guides: [] };
  const tol = 10 / o.zoom;
  const { ends, mids } = o.snapObjects ? candidates(o) : { ends: [], mids: [] };

  if (o.snapObjects) {
    let best: Vec2 | null = null;
    let bd = tol;
    for (const p of ends) {
      const d = distance(p, raw);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    if (best) return { point: { ...best }, kind: 'endpoint', guides: [] };
    for (const p of mids) {
      if (distance(p, raw) < tol * 0.8) return { point: { ...p }, kind: 'midpoint', guides: [] };
    }
  }

  // Ángulo respecto al punto de anclaje.
  if (o.anchor) {
    const d = sub(raw, o.anchor);
    const len = length(d);
    if (len > 1e-6) {
      const ang = Math.atan2(d.y, d.x);
      const step = o.constrain ? Math.PI / 12 : Math.PI / 4;
      const target = Math.round(ang / step) * step;
      if (o.constrain || Math.abs(ang - target) < (4 * Math.PI) / 180) {
        let L = len * Math.cos(ang - target);
        if (o.snapGrid) L = roundTo(L, o.gridSize);
        return { point: add(o.anchor, fromAngle(target, L)), kind: 'angle', guides: [] };
      }
    }
  }

  let point = o.snapGrid ? { x: roundTo(raw.x, o.gridSize), y: roundTo(raw.y, o.gridSize) } : { ...raw };
  let kind: SnapKind = o.snapGrid ? 'grid' : 'none';
  const guides: SnapResult['guides'] = [];

  if (o.snapObjects) {
    // Punto sobre el eje de un muro.
    let bestWall: { point: Vec2; d: number } | null = null;
    for (const w of Object.values(o.doc.walls)) {
      if (w.levelId !== o.levelId) continue;
      const pr = projectOnSegment(raw, w.start, w.end);
      if (pr.distance < tol * 0.8 && (!bestWall || pr.distance < bestWall.d)) {
        // Se ajusta la distancia a lo largo del muro a la cuadrícula.
        const wl = distance(w.start, w.end);
        const u = o.snapGrid ? Math.min(wl, Math.max(0, roundTo(pr.t * wl, o.gridSize))) : pr.t * wl;
        const t = wl > 0 ? u / wl : 0;
        bestWall = { point: { x: w.start.x + (w.end.x - w.start.x) * t, y: w.start.y + (w.end.y - w.start.y) * t }, d: pr.distance };
      }
    }
    if (bestWall) return { point: bestWall.point, kind: 'wall', guides: [] };

    // Alineaciones con extremos existentes.
    let ax: Vec2 | null = null;
    let ay: Vec2 | null = null;
    for (const p of ends) {
      if (Math.abs(p.x - raw.x) < tol * 0.7 && (!ax || Math.abs(p.y - raw.y) < Math.abs(ax.y - raw.y))) ax = p;
      if (Math.abs(p.y - raw.y) < tol * 0.7 && (!ay || Math.abs(p.x - raw.x) < Math.abs(ay.x - raw.x))) ay = p;
    }
    if (ax) point = { ...point, x: ax.x };
    if (ay) point = { ...point, y: ay.y };
    if (ax) guides.push({ from: ax, to: point });
    if (ay) guides.push({ from: ay, to: point });
    if (ax || ay) kind = 'align';
  }
  return { point, kind, guides };
}
