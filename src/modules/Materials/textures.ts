/**
 * Texturas de los materiales (se generan proceduralmente en la fase 5).
 */
import type { Texture } from 'three';
import type { MaterialDef } from './library';

export interface MaterialMaps {
  map?: Texture;
  bumpMap?: Texture;
  bumpScale?: number;
  roughnessMap?: Texture;
}

export function getMaterialMaps(_def: MaterialDef, _color: string): MaterialMaps {
  return {};
}
