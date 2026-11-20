/** Aplicación de los tiradores sobre el documento (dentro de un gesto). */
import { type Vec2, add, cleanVec, dot, normalize, perp, projectOnSegment, rotate, roundTo, sub, distance } from '@/core/geometry';
import { degToRad, normalizeDeg } from '@/core/units';
import type { ID, ProjectDoc } from '@/modules/FloorPlan/types';
import { moveWallEndpoint, clampOpenings } from '@/modules/Walls/ops';
import { nearestWall, wallFrame } from '@/modules/Walls/geometry';
import type { Handle } from './handles';
import { getCatalogItem } from '@/modules/Furniture/catalog';
import { resolveParams } from '@/modules/Furniture/params';

export interface HandleInput {
  /** Punto ya ajustado (snap). */
  point: Vec2;
  raw: Vec2;
  gridSize: number;
  snap: boolean;
}

export function applyHandle(doc: ProjectDoc, h: Handle, inp: HandleInput): void {
  switch (h.kind) {
    case 'wall-start':
    case 'wall-end':
      moveWallEndpoint(doc, h.ref.id, h.kind === 'wall-start' ? 'start' : 'end', inp.point);
      break;
    case 'room-vertex': {
      const r = doc.rooms[h.ref.id];
      if (r && h.index !== undefined) r.points[h.index] = cleanVec(inp.point);
      break;
    }
    case 'furn-rotate': {
      const f = doc.furniture[h.ref.id];
      if (!f) break;
      let deg = (Math.atan2(inp.raw.y - f.position.y, inp.raw.x - f.position.x) * 180) / Math.PI + 90;
      if (inp.snap) deg = roundTo(deg, 15);
      f.rotation = Math.round(normalizeDeg(deg) * 10) / 10;
      break;
    }
    case 'furn-resize': {
      // Se mantiene fija la esquina opuesta; medidas ajustadas a 5 cm.
      const f = doc.furniture[h.ref.id];
      if (!f || h.index === undefined) break;
      const rad = degToRad(f.rotation);
      const signs = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ][h.index];
      const opp = { x: (-signs[0] * f.width) / 2, y: (-signs[1] * f.depth) / 2 };
      const local = rotate(sub(inp.raw, f.position), -rad);
      let w = Math.max(0.05, (local.x - opp.x) * signs[0]);
      let d = Math.max(0.05, (local.y - opp.y) * signs[1]);
      if (inp.snap) {
        w = Math.max(0.05, roundTo(w, 0.05));
        d = Math.max(0.05, roundTo(d, 0.05));
      }
      const cat = getCatalogItem(f.catalogId);
      if (cat?.fromSize && cat.derive) {
        const params = { ...resolveParams(cat, f.params), ...cat.fromSize({ w, d, h: f.height }, resolveParams(cat, f.params)) };
        const dims = cat.derive(params, { w, d, h: f.height });
        w = dims.w ?? w;
        d = dims.d ?? d;
        if (dims.h !== undefined) f.height = dims.h;
        f.params = params;
      }
      const centerLocal = { x: opp.x + (signs[0] * w) / 2, y: opp.y + (signs[1] * d) / 2 };
      f.position = cleanVec(add(f.position, rotate(centerLocal, rad)));
      f.width = Math.round(w * 1000) / 1000;
      f.depth = Math.round(d * 1000) / 1000;
      break;
    }
    case 'dim-start':
    case 'dim-end': {
      const d = doc.dimensions[h.ref.id];
      if (d) d[h.kind === 'dim-start' ? 'start' : 'end'] = cleanVec(inp.point);
      break;
    }
    case 'dim-offset': {
      const d = doc.dimensions[h.ref.id];
      if (!d) break;
      const n = perp(normalize(sub(d.end, d.start)));
      d.offset = Math.round(dot(sub(inp.raw, d.start), n) * 1000) / 1000;
      break;
    }
    case 'opening-left':
    case 'opening-right': {
      const o = doc.openings[h.ref.id];
      const w = o && doc.walls[o.wallId];
      if (!o || !w) break;
      const f = wallFrame(w);
      let u = projectOnSegment(inp.raw, w.start, w.end).t * f.length;
      if (inp.snap) u = roundTo(u, inp.gridSize);
      const left = o.offset - o.width / 2;
      const right = o.offset + o.width / 2;
      if (h.kind === 'opening-left') {
        const nl = Math.min(right - 0.3, Math.max(0.02, u));
        o.width = right - nl;
        o.offset = (nl + right) / 2;
      } else {
        const nr = Math.max(left + 0.3, Math.min(f.length - 0.02, u));
        o.width = nr - left;
        o.offset = (left + nr) / 2;
      }
      clampOpenings(doc, w.id);
      break;
    }
  }
}

/** Mueve una puerta/ventana a la posición p, pudiendo cambiar de muro. */
export function moveOpeningTo(doc: ProjectDoc, id: ID, p: Vec2, gridSize: number, snap: boolean): void {
  const o = doc.openings[id];
  if (!o) return;
  const walls = Object.values(doc.walls).filter((w) => w.levelId === o.levelId);
  const hit = nearestWall(p, walls, 0.5);
  if (!hit) return;
  const len = distance(hit.wall.start, hit.wall.end);
  if (len < o.width + 0.04) return;
  let u = hit.offset;
  if (snap) u = roundTo(u - o.width / 2, gridSize) + o.width / 2;
  o.wallId = hit.wall.id;
  o.offset = Math.min(len - o.width / 2 - 0.02, Math.max(o.width / 2 + 0.02, u));
}
