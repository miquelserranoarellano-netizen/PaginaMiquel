import { type Vec2, cleanVec, insetPolygon, polygonArea, signedArea } from '@/core/geometry';
import { createRoom } from '@/modules/FloorPlan/factory';
import type { ID, ProjectDoc, Room, RoomType } from '@/modules/FloorPlan/types';
import { addWallMerged, wallsOnLevel } from '@/modules/Walls/ops';
import { detectRoomAt } from './detection';

export const roomArea = (r: Pick<Room, 'points'>): number => polygonArea(r.points);

/** Orienta el polígono en sentido positivo (coherente con el resto del modelo). */
export function normalizeRoomPoints(points: Vec2[]): Vec2[] {
  const pts = points.map(cleanVec);
  return signedArea(pts) < 0 ? pts.reverse() : pts;
}

/**
 * Crea una estancia rectangular. Si `withWalls` es true también levanta los
 * cuatro muros (sin duplicar los que ya existan) y el suelo se ajusta a la cara
 * interior de los muros.
 */
export function addRectRoom(doc: ProjectDoc, levelId: ID, a: Vec2, b: Vec2, type: RoomType, withWalls: boolean): ID | null {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  if (maxX - minX < 0.3 || maxY - minY < 0.3) return null;
  const corners = [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
  let points = corners;
  if (withWalls) {
    for (let i = 0; i < 4; i++) addWallMerged(doc, levelId, corners[i], corners[(i + 1) % 4]);
    const t = doc.settings.defaultWallThickness / 2;
    points = insetPolygon(normalizeRoomPoints(corners), [t, t, t, t]);
  }
  const room = createRoom(levelId, type, normalizeRoomPoints(points));
  doc.rooms[room.id] = room;
  return room.id;
}

export function addPolygonRoom(doc: ProjectDoc, levelId: ID, points: Vec2[], type: RoomType, withWalls: boolean): ID | null {
  if (points.length < 3 || polygonArea(points) < 0.05) return null;
  const pts = normalizeRoomPoints(points);
  let floor = pts;
  if (withWalls) {
    for (let i = 0; i < pts.length; i++) addWallMerged(doc, levelId, pts[i], pts[(i + 1) % pts.length]);
    const t = doc.settings.defaultWallThickness / 2;
    floor = insetPolygon(pts, pts.map(() => t));
  }
  const room = createRoom(levelId, type, floor);
  doc.rooms[room.id] = room;
  return room.id;
}

/** Crea una estancia detectando el recinto cerrado por muros que contiene p. */
export function addDetectedRoom(doc: ProjectDoc, levelId: ID, p: Vec2, type: RoomType): ID | null {
  const face = detectRoomAt(p, wallsOnLevel(doc, levelId));
  if (!face || face.inner.length < 3) return null;
  const room = createRoom(levelId, type, normalizeRoomPoints(face.inner));
  doc.rooms[room.id] = room;
  return room.id;
}
