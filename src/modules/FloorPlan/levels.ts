import { uid } from '@/core/ids';
import { createLevel } from './defaults';
import { sortedLevels } from './queries';
import type { ID, ProjectDoc } from './types';

/** Añade una planta encima de la más alta. Opcionalmente copia los muros de otra planta. */
export function addLevel(doc: ProjectDoc, copyWallsFrom?: ID): ID {
  const levels = sortedLevels(doc);
  const top = levels[levels.length - 1];
  const elevation = top ? top.elevation + top.height + top.slabThickness : 0;
  const n = levels.length;
  const level = createLevel({
    name: n === 0 ? 'Planta baja' : n === 1 ? 'Planta primera' : `Planta ${n}`,
    elevation: Math.round(elevation * 1000) / 1000,
    height: top?.height ?? doc.settings.defaultWallHeight,
    order: (top?.order ?? -1) + 1,
  });
  doc.levels[level.id] = level;
  if (copyWallsFrom) {
    for (const w of Object.values(doc.walls)) {
      if (w.levelId !== copyWallsFrom) continue;
      const copy = { ...structuredClone(w), id: uid('wall'), levelId: level.id, height: level.height };
      doc.walls[copy.id] = copy;
    }
  }
  return level.id;
}

/** Elimina una planta con todo su contenido (siempre debe quedar al menos una). */
export function removeLevel(doc: ProjectDoc, levelId: ID): boolean {
  if (Object.keys(doc.levels).length <= 1) return false;
  for (const key of ['walls', 'rooms', 'openings', 'furniture', 'dimensions'] as const) {
    for (const el of Object.values(doc[key])) if (el.levelId === levelId) delete doc[key][el.id];
  }
  delete doc.levels[levelId];
  return true;
}

/** Recalcula las cotas de las plantas apiladas tras cambiar alturas. */
export function restackLevels(doc: ProjectDoc): void {
  let z: number | null = null;
  for (const l of sortedLevels(doc)) {
    if (z === null) z = l.elevation;
    else l.elevation = Math.round(z * 1000) / 1000;
    z = l.elevation + l.height + l.slabThickness;
  }
}
