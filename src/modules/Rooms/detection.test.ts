import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '@/modules/FloorPlan/defaults';
import { addWallMerged, wallsOnLevel } from '@/modules/Walls/ops';
import { polygonArea } from '@/core/geometry';
import { detectRoomAt, findFaces } from './detection';
import { addRectRoom } from './ops';

describe('detección de estancias', () => {
  const d = createEmptyProject();
  const l = Object.keys(d.levels)[0];
  // Rectángulo 6×4 dividido por un tabique en x=2 (incluye unión en T).
  addWallMerged(d, l, { x: 0, y: 0 }, { x: 6, y: 0 });
  addWallMerged(d, l, { x: 6, y: 0 }, { x: 6, y: 4 });
  addWallMerged(d, l, { x: 6, y: 4 }, { x: 0, y: 4 });
  addWallMerged(d, l, { x: 0, y: 4 }, { x: 0, y: 0 });
  addWallMerged(d, l, { x: 2, y: 0 }, { x: 2, y: 4 });
  const walls = wallsOnLevel(d, l);

  it('encuentra las dos caras interiores', () => {
    const faces = findFaces(walls);
    expect(faces).toHaveLength(2);
  });

  it('detecta la estancia que contiene el punto y descuenta medio muro', () => {
    const face = detectRoomAt({ x: 4, y: 2 }, walls)!;
    expect(face).not.toBeNull();
    // Interior: (6-2-0.2) × (4-0.2) = 3.8 × 3.8
    expect(face.area).toBeCloseTo(3.8 * 3.8, 3);
    expect(detectRoomAt({ x: 10, y: 10 }, walls)).toBeNull();
  });

  it('crea habitaciones rectangulares con muros', () => {
    const d2 = createEmptyProject();
    const l2 = Object.keys(d2.levels)[0];
    const id = addRectRoom(d2, l2, { x: 0, y: 0 }, { x: 4, y: 3 }, 'dormitorio', true)!;
    expect(Object.keys(d2.walls)).toHaveLength(4);
    expect(polygonArea(d2.rooms[id].points)).toBeCloseTo(3.8 * 2.8, 3);
    // Una segunda estancia adyacente reutiliza el muro compartido.
    addRectRoom(d2, l2, { x: 4, y: 0 }, { x: 7, y: 3 }, 'bano', true);
    expect(Object.keys(d2.walls)).toHaveLength(7);
  });
});
