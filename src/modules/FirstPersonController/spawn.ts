import { type Vec2, labelPoint, pointInPolygon, polygonArea } from '@/core/geometry';
import type { ID, ProjectDoc } from '@/modules/FloorPlan/types';
import { levelBBox } from '@/modules/FloorPlan/queries';
import { wallFrame } from '@/modules/Walls/geometry';

const OUTDOOR = new Set(['terraza', 'jardin', 'piscina']);

/**
 * Punto de inicio del recorrido: estancia seleccionada, recibidor/salón o la
 * estancia interior más grande de la planta.
 */
export function spawnPoint(doc: ProjectDoc, levelId: ID, preferredRoom?: ID | null): { pos: Vec2; yaw: number } {
  const rooms = Object.values(doc.rooms).filter((r) => r.levelId === levelId);
  const indoor = rooms.filter((r) => !OUTDOOR.has(r.type));
  const room =
    (preferredRoom && doc.rooms[preferredRoom]?.levelId === levelId ? doc.rooms[preferredRoom] : null) ??
    indoor.find((r) => r.type === 'recibidor') ??
    indoor.find((r) => r.type === 'salon') ??
    [...indoor].sort((a, b) => polygonArea(b.points) - polygonArea(a.points))[0] ??
    rooms[0];
  if (room) {
    const p = labelPoint(room.points);
    // Mirar hacia la puerta o ventana más cercana de la estancia para orientarse.
    let yaw = 0;
    let best = Infinity;
    for (const o of Object.values(doc.openings)) {
      const w = doc.walls[o.wallId];
      if (!w || o.levelId !== levelId) continue;
      const f = wallFrame(w);
      const c = { x: w.start.x + f.dir.x * o.offset, y: w.start.y + f.dir.y * o.offset };
      const d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < best && pointInPolygon({ x: (c.x + p.x) / 2, y: (c.y + p.y) / 2 }, room.points)) {
        best = d;
        yaw = Math.atan2(-(c.x - p.x), -(c.y - p.y));
      }
    }
    return { pos: p, yaw };
  }
  const b = levelBBox(doc, levelId);
  return { pos: b ? { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 } : { x: 0, y: 0 }, yaw: 0 };
}

export function roomAt(doc: ProjectDoc, levelId: ID, p: Vec2) {
  return Object.values(doc.rooms)
    .filter((r) => r.levelId === levelId && pointInPolygon(p, r.points))
    .sort((a, b) => polygonArea(a.points) - polygonArea(b.points))[0];
}
