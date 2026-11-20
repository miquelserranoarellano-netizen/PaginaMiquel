/**
 * Texturas three.js a partir de los lienzos procedurales de patterns.ts.
 * Cada textura cubre `tileSize` metros reales (las UV están en metros).
 */
import { CanvasTexture, LinearSRGBColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import type { MaterialDef } from './library';
import { getPattern } from './patterns';

export interface MaterialMaps {
  map?: Texture;
  bumpMap?: Texture;
  bumpScale?: number;
  roughnessMap?: Texture;
}

const cache = new Map<string, MaterialMaps>();

function toTexture(img: HTMLCanvasElement, def: MaterialDef, srgb: boolean): Texture {
  const t = new CanvasTexture(img);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(1 / def.tileSize, 1 / def.tileSize);
  t.colorSpace = srgb ? SRGBColorSpace : LinearSRGBColorSpace;
  t.anisotropy = 16;
  // Al exportar a GLB/GLTF las texturas de color se guardan en JPEG (mucho más ligeras).
  if (srgb) t.userData.mimeType = 'image/jpeg';
  t.needsUpdate = true;
  return t;
}

export function getMaterialMaps(def: MaterialDef, color: string): MaterialMaps {
  const key = `${def.id}|${color}`;
  let maps = cache.get(key);
  if (!maps) {
    maps = {};
    const gen = getPattern(def, color);
    if (gen) {
      maps.map = toTexture(gen.color, def, true);
      if (gen.bump) {
        maps.bumpMap = toTexture(gen.bump, def, false);
        maps.bumpScale = gen.bumpScale ?? 1;
      }
    }
    cache.set(key, maps);
  }
  return maps;
}
