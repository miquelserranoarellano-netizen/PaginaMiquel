/** Construcción imperativa de un mueble (miniaturas y exportación). */
import { Group, Mesh } from 'three';
import type { SurfaceMaterial } from '@/modules/FloorPlan/types';
import { getMaterial } from '@/modules/Materials/materials3d';
import type { CatalogItem, ParamValues } from './types';
import { resolveParams } from './params';
import { partGeometry } from './geometries';

export function buildCatalogObject(item: CatalogItem, w: number, d: number, h: number, materials: Record<string, SurfaceMaterial> = {}, params?: ParamValues): Group {
  const g = new Group();
  g.name = item.name;
  for (const part of item.build(w, d, h, resolveParams(item, params))) {
    if (part.noMesh) continue;
    const ref = materials[part.m] ?? item.slots[part.m] ?? { materialId: 'plastico', color: '#cccccc' };
    const { geometry, scale } = partGeometry(part);
    const mesh = new Mesh(geometry, getMaterial(ref));
    mesh.position.set(...part.p);
    if (part.r) mesh.rotation.set(...part.r);
    mesh.scale.set(...scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  return g;
}
