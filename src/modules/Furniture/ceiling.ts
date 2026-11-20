/** Altura del techo en un punto de la planta (estancia más pequeña que lo contiene). */
import { type Vec2, pointInPolygon, polygonArea } from '@/core/geometry';
import type { FurnitureItem, ID, ProjectDoc, Room } from '@/modules/FloorPlan/types';
import { getCatalogItem } from './catalog';

export function roomAt(doc: ProjectDoc, levelId: ID, p: Vec2): Room | undefined {
  return Object.values(doc.rooms)
    .filter((r) => r.levelId === levelId && pointInPolygon(p, r.points))
    .sort((a, b) => polygonArea(a.points) - polygonArea(b.points))[0];
}

export function ceilingHeightAt(doc: ProjectDoc, levelId: ID, p: Vec2): number {
  return roomAt(doc, levelId, p)?.ceilingHeight ?? doc.levels[levelId]?.height ?? 2.7;
}

/** Ajusta al techo los muebles de suelo a techo (armarios empotrados). Devuelve true si cambió. */
export function fitFullHeight(doc: ProjectDoc, f: FurnitureItem, force = false): boolean {
  if (!force && !getCatalogItem(f.catalogId)?.fullHeight) return false;
  const h = Math.round((ceilingHeightAt(doc, f.levelId, f.position) - f.elevation - 0.005) * 1000) / 1000;
  if (h < 0.3 || Math.abs(h - f.height) < 1e-4) return false;
  f.height = h;
  return true;
}
