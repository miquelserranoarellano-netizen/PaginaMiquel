/**
 * Materiales Three.js a partir de las referencias { materialId, color }.
 * Se cachean por clave para compartirlos entre todas las mallas.
 */
import { Color, DoubleSide, FrontSide, MeshPhysicalMaterial, MeshStandardMaterial, Plane, Vector3, type Material } from 'three';
import type { SurfaceMaterial } from '@/modules/FloorPlan/types';
import { getMaterialDef } from './library';
import { getMaterialMaps } from './textures';

const cache = new Map<string, Material>();

export interface MaterialOptions {
  doubleSide?: boolean;
  /** Recorta todo lo que quede por encima de esta cota (vista de maqueta). */
  clipY?: number;
}

export function getMaterial(ref: SurfaceMaterial, opts: MaterialOptions = {}): Material {
  const key = `${ref.materialId}|${ref.color}|${opts.doubleSide ? 1 : 0}|${opts.clipY ?? ''}`;
  let m = cache.get(key);
  if (m) return m;
  const def = getMaterialDef(ref.materialId);
  const maps = getMaterialMaps(def, ref.color);
  if (def.pattern === 'glass' || def.pattern === 'water') {
    m = new MeshPhysicalMaterial({
      color: new Color(ref.color),
      roughness: def.roughness,
      metalness: def.metalness,
      transparent: true,
      opacity: def.opacity ?? 0.3,
      depthWrite: false,
      side: DoubleSide,
      envMapIntensity: 1.2,
    });
  } else {
    const std = new MeshStandardMaterial({
      color: maps.map ? new Color('#ffffff') : new Color(ref.color),
      roughness: def.roughness,
      metalness: def.metalness,
      side: opts.doubleSide ? DoubleSide : FrontSide,
      envMapIntensity: def.metalness > 0.5 ? 1 : 0.55,
    });
    if (maps.map) std.map = maps.map;
    if (maps.bumpMap) {
      std.bumpMap = maps.bumpMap;
      std.bumpScale = maps.bumpScale ?? 1;
    }
    if (maps.roughnessMap) std.roughnessMap = maps.roughnessMap;
    if (def.emissive) {
      std.emissive = new Color(ref.color);
      std.emissiveIntensity = 1.6;
      std.toneMapped = false;
    }
    m = std;
  }
  if (opts.clipY !== undefined) {
    m.clippingPlanes = [new Plane(new Vector3(0, -1, 0), opts.clipY)];
    m.clipShadows = true;
  }
  m.name = `${def.name} ${ref.color}`;
  cache.set(key, m);
  return m;
}

/** Material de resaltado para la selección. */
export const highlightColor = '#2563eb';
