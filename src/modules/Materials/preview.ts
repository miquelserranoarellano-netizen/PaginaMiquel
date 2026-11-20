/**
 * Miniaturas de materiales para la interfaz. En la fase 5 se generan a partir
 * de las texturas procedurales; aquí un degradado sencillo como respaldo.
 */
import type { MaterialDef } from './library';

const cache = new Map<string, string>();

export function materialPreview(def: MaterialDef, color: string): string {
  const key = `${def.id}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="${color}"/></svg>`)}`;
  cache.set(key, url);
  return url;
}
