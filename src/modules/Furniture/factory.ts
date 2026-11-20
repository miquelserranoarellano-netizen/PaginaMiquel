import { uid } from '@/core/ids';
import { cleanVec } from '@/core/geometry';
import type { FurnitureItem, ID, SurfaceMaterial, Vec2 } from '@/modules/FloorPlan/types';
import type { CatalogItem } from './types';
import { defaultParams } from './params';

export function createFurniture(levelId: ID, item: CatalogItem, position: Vec2, rotation = 0, overrides: Partial<FurnitureItem> = {}): FurnitureItem {
  const materials: Record<string, SurfaceMaterial> = {};
  const params = defaultParams(item);
  const size = { w: item.w, d: item.d, h: item.h, ...(item.derive ? item.derive(params, { w: item.w, d: item.d, h: item.h }) : {}) };
  for (const [k, s] of Object.entries(item.slots)) materials[k] = { materialId: s.materialId, color: s.color };
  return {
    id: uid('furn'),
    levelId,
    catalogId: item.id,
    name: item.name,
    position: cleanVec(position),
    rotation,
    elevation: item.elevation ?? 0,
    width: size.w,
    depth: size.d,
    height: size.h,
    materials,
    ...(item.params?.length ? { params } : {}),
    ...(item.light ? { light: { on: true, intensity: 1, color: item.light.color } } : {}),
    ...overrides,
  };
}
