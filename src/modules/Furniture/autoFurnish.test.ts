import { describe, expect, it } from 'vitest';
import { orientedRect, pointInPolygon } from '@/core/geometry';
import { degToRad } from '@/core/units';
import { createEmptyProject } from '@/modules/FloorPlan/defaults';
import { createOpening } from '@/modules/FloorPlan/factory';
import type { RoomType } from '@/modules/FloorPlan/types';
import { addRectRoom } from '@/modules/Rooms/ops';
import { _internals } from './analysis';
import { furnishRoom } from './autoFurnish';

function roomWithDoor(type: RoomType, w: number, h: number) {
  const doc = createEmptyProject();
  const l = Object.keys(doc.levels)[0];
  const id = addRectRoom(doc, l, { x: 0, y: 0 }, { x: w, y: h }, type, true)!;
  const bottom = Object.values(doc.walls).find((x) => Math.abs(x.start.y - h) < 1e-6 && Math.abs(x.end.y - h) < 1e-6)!;
  const len = Math.abs(bottom.end.x - bottom.start.x);
  const door = createOpening(l, bottom.id, 'door', len * 0.25);
  doc.openings[door.id] = door;
  return { doc, id };
}

describe('amueblado automático', () => {
  const cases: [RoomType, number, number, string[]][] = [
    ['dormitorio', 4, 3.6, ['bed-double', 'nightstand', 'wardrobe-3']],
    ['salon', 6, 5, ['sofa-3', 'tv-stand', 'tv-55']],
    ['cocina', 4, 3, ['fridge', 'kitchen-sink', 'kitchen-hob']],
    ['bano', 2.6, 2.2, ['toilet', 'vanity']],
    ['despacho', 3, 3, ['desk', 'office-chair']],
    ['garaje', 4, 6, ['car']],
  ];
  for (const [type, w, h, expected] of cases) {
    it(`amuebla ${type}`, () => {
      const { doc, id } = roomWithDoor(type, w, h);
      const res = furnishRoom(doc, id);
      const ids = res.added.map((f) => f.catalogId);
      for (const e of expected) expect(ids).toContain(e);
      const room = doc.rooms[id];
      // Todo dentro de la estancia (con 3 cm de tolerancia).
      for (const f of res.added) {
        const poly = orientedRect(f.position, Math.max(0.01, f.width - 0.06), Math.max(0.01, f.depth - 0.06), degToRad(f.rotation));
        expect(poly.every((p) => pointInPolygon(p, room.points))).toBe(true);
      }
      // Sin choques entre muebles a la misma altura (salvo alfombras y objetos apoyados encima).
      const solid = res.added.filter((f) => f.height > 0.03);
      for (let i = 0; i < solid.length; i++)
        for (let j = i + 1; j < solid.length; j++) {
          const a = solid[i];
          const b = solid[j];
          const v = Math.min(a.elevation + a.height, b.elevation + b.height) - Math.max(a.elevation, b.elevation);
          if (v <= 0.02) continue;
          expect(_internals.convexOverlap(orientedRect(a.position, a.width, a.depth, degToRad(a.rotation)), orientedRect(b.position, b.width, b.depth, degToRad(b.rotation)))).toBe(false);
        }
    });
  }
});
