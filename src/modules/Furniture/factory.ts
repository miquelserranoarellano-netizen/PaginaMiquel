import { uid } from '@/core/ids';
import { cleanVec } from '@/core/geometry';
import type { FurnitureItem, ID, SurfaceMaterial, Vec2 } from '@/modules/FloorPlan/types';
import type { CatalogItem } from './types';

export function createFurniture(levelId: ID, item: CatalogItem, position: Vec2, rotation = 0, overrides: Partial<FurnitureItem> = {}): FurnitureItem {
  const materials: Record<string, SurfaceMaterial> = {};
  for (const [k, s] of Object.entries(item.slots)) materials[k] = { materialId: s.materialId, color: s.color };
  return {
    id: uid('furn'),
    levelId,
    catalogId: item.id,
    name: item.name,
    position: cleanVec(position),
    rotation,
    elevation: item.elevation ?? 0,
    width: item.w,
    depth: item.d,
    height: item.h,
    materials,
    ...(item.light ? { light: { on: true, intensity: 1, color: item.light.color } } : {}),
    ...overrides,
  };
}
