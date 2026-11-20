import { type Vec2, add, dot, scale, sub } from '@/core/geometry';
import { normalizeDeg } from '@/core/units';
import type { ID, ProjectDoc } from '@/modules/FloorPlan/types';
import { nearestWall, wallFrame } from '@/modules/Walls/geometry';

/**
 * Si el punto está cerca de un muro, devuelve la posición/rotación para que el
 * mueble apoye su parte trasera en la cara del muro, mirando hacia la estancia.
 */
export function placeAgainstWall(doc: ProjectDoc, levelId: ID, p: Vec2, _width: number, depth: number, _rotation: number): { position: Vec2; rotation: number } | null {
  const walls = Object.values(doc.walls).filter((w) => w.levelId === levelId);
  const hit = nearestWall(p, walls, depth / 2 + 0.25);
  if (!hit) return null;
  const f = wallFrame(hit.wall);
  const side = dot(sub(p, hit.point), f.normal) >= 0 ? 1 : -1;
  const n = scale(f.normal, side);
  // El frente del mueble (eje +y local en planta) apunta según n.
  const rotation = normalizeDeg((Math.atan2(-n.x, n.y) * 180) / Math.PI);
  const position = add(hit.point, scale(n, hit.wall.thickness / 2 + depth / 2 + 0.005));
  return { position: { x: Math.round(position.x * 1000) / 1000, y: Math.round(position.y * 1000) / 1000 }, rotation: Math.round(rotation * 10) / 10 };
}
