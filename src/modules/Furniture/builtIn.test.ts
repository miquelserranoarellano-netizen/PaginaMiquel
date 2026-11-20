import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '@/modules/FloorPlan/defaults';
import { addRectRoom } from '@/modules/Rooms/ops';
import { getCatalogItem } from './catalog';
import { createFurniture } from './factory';
import { fitFullHeight } from './ceiling';
import { resolveParams } from './params';

const parts = (id: string, w: number, h: number, p: Record<string, number | boolean> = {}) => {
  const item = getCatalogItem(id)!;
  return item.build(w, item.d, h, { ...resolveParams(item, undefined), ...p });
};
const doors = (ps: ReturnType<typeof parts>) => ps.filter((x) => x.m === 'primary' && x.d[2] < 0.03 && x.d[1] > 1);

describe('armarios empotrados', () => {
  it('reparte las puertas según el ancho y cabe en su caja', () => {
    for (const [w, h] of [[1.2, 2.5], [1.8, 2.6], [3.0, 2.7]] as const) {
      const ps = parts('wardrobe-built-in', w, h);
      expect(doors(ps).length).toBe(Math.max(1, Math.round((w - 2 * Math.min(0.05, w * 0.05)) / 0.5)));
      for (const x of ps) {
        expect(Math.abs(x.p[0]) + x.d[0] / 2).toBeLessThanOrEqual(w / 2 + 0.031);
        expect(x.p[1] + x.d[1] / 2).toBeLessThanOrEqual(h + 1e-6);
      }
    }
  });

  it('respeta el número de puertas elegido y las correderas', () => {
    expect(doors(parts('wardrobe-built-in', 2, 2.6, { doors: 3 })).length).toBe(3);
    expect(doors(parts('wardrobe-built-in-sliding', 1.6, 2.6)).length).toBe(2);
    expect(doors(parts('wardrobe-built-in-sliding', 2.4, 2.6)).length).toBe(3);
    expect(parts('wardrobe-built-in', 1.8, 2.6, { mirror: true }).some((x) => x.m === 'mirror')).toBe(true);
  });

  it('se ajusta al techo de la estancia', () => {
    const doc = createEmptyProject('t');
    const L = Object.keys(doc.levels)[0];
    const room = addRectRoom(doc, L, { x: 0, y: 0 }, { x: 4, y: 3 }, 'dormitorio', true)!;
    doc.rooms[room].ceilingHeight = 2.45;
    const f = createFurniture(L, getCatalogItem('wardrobe-built-in')!, { x: 1, y: 0.4 });
    expect(fitFullHeight(doc, f)).toBe(true);
    expect(f.height).toBeCloseTo(2.445, 3);
    const normal = createFurniture(L, getCatalogItem('wardrobe-2')!, { x: 2, y: 0.4 });
    expect(fitFullHeight(doc, normal)).toBe(false);
  });
});
