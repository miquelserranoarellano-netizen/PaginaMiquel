import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '@/modules/FloorPlan/defaults';
import { createOpening } from '@/modules/FloorPlan/factory';
import { addWallMerged } from '@/modules/Walls/ops';
import { buildColliders, moveWithCollisions, PLAYER_RADIUS } from './collision';

describe('colisiones del recorrido', () => {
  const doc = createEmptyProject();
  const l = Object.keys(doc.levels)[0];
  // Muro vertical en x = 5 (de y=0 a y=6) con una puerta centrada en y=3 y una ventana en y=1.
  const [wallId] = addWallMerged(doc, l, { x: 5, y: 0 }, { x: 5, y: 6 });
  const door = createOpening(l, wallId, 'door', 3);
  const win = createOpening(l, wallId, 'window', 1);
  doc.openings[door.id] = door;
  doc.openings[win.id] = win;
  const colliders = buildColliders(doc, l);

  it('no atraviesa el muro', () => {
    const end = moveWithCollisions({ x: 4, y: 5 }, { x: 3, y: 0 }, colliders);
    expect(end.x).toBeLessThanOrEqual(5 - 0.1 - PLAYER_RADIUS + 1e-6);
  });

  it('no atraviesa una ventana (antepecho)', () => {
    const end = moveWithCollisions({ x: 4, y: 1 }, { x: 3, y: 0 }, colliders);
    expect(end.x).toBeLessThan(5);
  });

  it('pasa por la puerta', () => {
    const end = moveWithCollisions({ x: 4, y: 3 }, { x: 3, y: 0 }, colliders);
    expect(end.x).toBeCloseTo(7, 3);
  });
});
