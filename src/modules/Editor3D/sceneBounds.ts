import { type BBox, mergeBBox } from '@/core/geometry';
import { levelBBox, sortedLevels } from '@/modules/FloorPlan/queries';
import type { ProjectDoc } from '@/modules/FloorPlan/types';

export interface SceneBounds {
  box: BBox;
  minY: number;
  maxY: number;
  center: [number, number, number];
  radius: number;
}

/** Caja que envuelve toda la vivienda (todas las plantas). */
export function sceneBounds(doc: ProjectDoc): SceneBounds {
  let box: BBox | null = null;
  let maxY = 3;
  let minY = 0;
  for (const l of sortedLevels(doc)) {
    const b = levelBBox(doc, l.id);
    if (b) {
      box = mergeBBox(box, b);
      maxY = Math.max(maxY, l.elevation + l.height);
      minY = Math.min(minY, l.elevation);
    }
  }
  const bx = box ?? { minX: -5, minY: -5, maxX: 5, maxY: 5 };
  const cx = (bx.minX + bx.maxX) / 2;
  const cz = (bx.minY + bx.maxY) / 2;
  const radius = Math.max(4, Math.hypot(bx.maxX - bx.minX, bx.maxY - bx.minY, maxY - minY) / 2);
  return { box: bx, minY, maxY, center: [cx, (minY + maxY) / 2, cz], radius };
}
