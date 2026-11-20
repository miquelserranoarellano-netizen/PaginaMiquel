import { createEmptyProject } from '@/modules/FloorPlan/defaults';
import type { ProjectDoc } from '@/modules/FloorPlan/types';

/** Casa de ejemplo (se completa en la fase 4). */
export function createSampleHouse(): ProjectDoc {
  return createEmptyProject('Casa de ejemplo');
}
