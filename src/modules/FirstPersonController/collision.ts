/**
 * Colisiones del recorrido: el visitante es un círculo (radio 0,25 m) que no
 * puede atravesar tramos de muro, ventanas cerradas ni muebles altos.
 * Las puertas no colisionan (se abren al acercarse).
 */
import { type BBox, type Vec2, add, bboxOf, closestPointOnPolygon, orientedRect, pointInPolygon, scale, sub, distance } from '@/core/geometry';
import { degToRad } from '@/core/units';
import type { ID, ProjectDoc } from '@/modules/FloorPlan/types';
import { getOpeningDef } from '@/modules/DoorsAndWindows/catalog';
import { getCatalogItem } from '@/modules/Furniture/catalog';
import { buildWallPieces, computeFootprints, wallFrame } from '@/modules/Walls/geometry';

export const PLAYER_RADIUS = 0.25;
export const EYE_HEIGHT = 1.65;
const HEAD_TOP = 1.8;
const STEP = 0.3;

export interface Collider {
  poly: Vec2[];
  box: BBox;
  kind: 'wall' | 'window' | 'furniture';
}

export function buildColliders(doc: ProjectDoc, levelId: ID): Collider[] {
  const out: Collider[] = [];
  const walls = Object.values(doc.walls).filter((w) => w.levelId === levelId);
  const openings = Object.values(doc.openings).filter((o) => o.levelId === levelId);
  const fps = computeFootprints(walls);
  for (const w of walls) {
    const own = openings.filter((o) => o.wallId === w.id);
    for (const piece of buildWallPieces(w, fps.get(w.id)!, own)) {
      if (piece.y0 < HEAD_TOP && piece.y1 > STEP) out.push({ poly: piece.quad, box: bboxOf(piece.quad), kind: 'wall' });
    }
    // Huecos que no se pueden atravesar (ventanas cuyo antepecho no bloquea por sí mismo).
    for (const o of own) {
      if (getOpeningDef(o.kind).passable || o.sill > STEP) continue;
      const f = wallFrame(w);
      const poly = orientedRect(add(w.start, scale(f.dir, o.offset)), o.width, w.thickness, f.angle);
      out.push({ poly, box: bboxOf(poly), kind: 'window' });
    }
  }
  for (const f of Object.values(doc.furniture)) {
    if (f.levelId !== levelId) continue;
    const cat = getCatalogItem(f.catalogId);
    const blocks = cat?.blocks ?? true;
    if (!blocks || f.height < 0.4 || f.elevation > 1.0) continue;
    const poly = orientedRect(f.position, f.width, f.depth, degToRad(f.rotation));
    out.push({ poly, box: bboxOf(poly), kind: 'furniture' });
  }
  return out;
}

/** Empuja el círculo fuera de los colisionadores (varias iteraciones para esquinas). */
export function resolveCollisions(p: Vec2, colliders: readonly Collider[], r = PLAYER_RADIUS): Vec2 {
  let pos = { ...p };
  for (let iter = 0; iter < 4; iter++) {
    let moved = false;
    for (const c of colliders) {
      if (pos.x < c.box.minX - r || pos.x > c.box.maxX + r || pos.y < c.box.minY - r || pos.y > c.box.maxY + r) continue;
      const inside = pointInPolygon(pos, c.poly);
      const cp = closestPointOnPolygon(pos, c.poly);
      if (inside) {
        // Dentro: se saca por el punto del contorno más cercano.
        const d = sub(cp.point, pos);
        const len = Math.max(1e-6, distance(cp.point, pos));
        pos = add(cp.point, scale(d, r / len));
        moved = true;
      } else if (cp.distance < r) {
        const d = sub(pos, cp.point);
        const len = Math.max(1e-6, cp.distance);
        pos = add(cp.point, scale(d, r / len));
        moved = true;
      }
    }
    if (!moved) break;
  }
  return pos;
}

/** Movimiento con sub-pasos para no atravesar muros finos a velocidad alta. */
export function moveWithCollisions(from: Vec2, delta: Vec2, colliders: readonly Collider[]): Vec2 {
  const len = Math.hypot(delta.x, delta.y);
  const steps = Math.max(1, Math.ceil(len / 0.08));
  let pos = { ...from };
  for (let i = 0; i < steps; i++) pos = resolveCollisions({ x: pos.x + delta.x / steps, y: pos.y + delta.y / steps }, colliders);
  return pos;
}
