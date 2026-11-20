/**
 * Selección geométrica en el plano. Prioridad: huecos > muebles > cotas >
 * muros > estancias (la más pequeña primero).
 */
import { type Vec2, add, distanceToSegment, normalize, perp, pointInPolygon, polygonArea, scale, sub, orientedRect } from '@/core/geometry';
import { degToRad } from '@/core/units';
import type { ElementRef, ID, ProjectDoc } from '@/modules/FloorPlan/types';
import { wallFrame } from '@/modules/Walls/geometry';

export interface HitOptions {
  furniture: boolean;
  dimensions: boolean;
  /** Tolerancia en metros. */
  tol: number;
}

export function hitTest(doc: ProjectDoc, levelId: ID, p: Vec2, o: HitOptions): ElementRef | null {
  // Huecos
  for (const op of Object.values(doc.openings)) {
    if (op.levelId !== levelId) continue;
    const w = doc.walls[op.wallId];
    if (!w) continue;
    const f = wallFrame(w);
    const c = add(w.start, scale(f.dir, op.offset));
    if (pointInPolygon(p, orientedRect(c, op.width, w.thickness + o.tol * 2, f.angle))) return { kind: 'opening', id: op.id };
  }
  // Muebles (los más altos primero)
  if (o.furniture) {
    const items = Object.values(doc.furniture)
      .filter((f) => f.levelId === levelId)
      .sort((a, b) => b.elevation + b.height - (a.elevation + a.height));
    for (const f of items) {
      if (pointInPolygon(p, orientedRect(f.position, f.width + o.tol, f.depth + o.tol, degToRad(f.rotation)))) return { kind: 'furniture', id: f.id };
    }
  }
  // Cotas
  if (o.dimensions) {
    for (const d of Object.values(doc.dimensions)) {
      if (d.levelId !== levelId) continue;
      const n = perp(normalize(sub(d.end, d.start)));
      const a = add(d.start, scale(n, d.offset));
      const b = add(d.end, scale(n, d.offset));
      if (distanceToSegment(p, a, b) < o.tol * 1.2) return { kind: 'dimension', id: d.id };
    }
  }
  // Muros
  let bestWall: { id: ID; d: number } | null = null;
  for (const w of Object.values(doc.walls)) {
    if (w.levelId !== levelId) continue;
    const dist = distanceToSegment(p, w.start, w.end);
    if (dist <= w.thickness / 2 + o.tol && (!bestWall || dist < bestWall.d)) bestWall = { id: w.id, d: dist };
  }
  if (bestWall) return { kind: 'wall', id: bestWall.id };
  // Estancias
  const rooms = Object.values(doc.rooms)
    .filter((r) => r.levelId === levelId && pointInPolygon(p, r.points))
    .sort((a, b) => polygonArea(a.points) - polygonArea(b.points));
  if (rooms.length) return { kind: 'room', id: rooms[0].id };
  return null;
}
