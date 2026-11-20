import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '@/modules/FloorPlan/defaults';
import { createOpening, createWall } from '@/modules/FloorPlan/factory';
import { buildWallPieces, computeFootprints } from './geometry';
import { addWallMerged, moveWallEndpoint, splitWall, translateWalls } from './ops';

const doc = createEmptyProject();
const lvl = Object.keys(doc.levels)[0];
const S = doc.settings;

describe('huellas de muros', () => {
  it('une dos muros en L con inglete', () => {
    const a = createWall(lvl, { x: 0, y: 0 }, { x: 4, y: 0 }, S, { thickness: 0.2 });
    const b = createWall(lvl, { x: 4, y: 0 }, { x: 4, y: 3 }, S, { thickness: 0.2 });
    const fps = computeFootprints([a, b]);
    const fa = fps.get(a.id)!;
    // a va hacia +x; su lado A (normal (0,1)) es el interior de la L.
    expect(fa.el.x).toBeCloseTo(3.9);
    expect(fa.el.y).toBeCloseTo(0.1);
    expect(fa.er.x).toBeCloseTo(4.1);
    expect(fa.er.y).toBeCloseTo(-0.1);
    // extremo libre: recto
    expect(fa.sl).toEqual({ x: 0, y: 0.1 });
  });

  it('divide un muro alrededor de una ventana', () => {
    const w = createWall(lvl, { x: 0, y: 0 }, { x: 5, y: 0 }, S, { height: 2.7 });
    const o = createOpening(lvl, w.id, 'window', 2.5, { width: 1, height: 1.2, sill: 1 });
    const fp = computeFootprints([w]).get(w.id)!;
    const pieces = buildWallPieces(w, fp, [o]);
    expect(pieces.map((p) => p.role)).toEqual(['solid', 'below', 'above', 'solid']);
    const below = pieces[1];
    expect(below.y1).toBeCloseTo(1);
    expect(pieces[2].y0).toBeCloseTo(2.2);
    expect(pieces[0].quad[1].x).toBeCloseTo(2);
    expect(pieces[3].quad[0].x).toBeCloseTo(3);
  });

  it('una puerta no deja antepecho', () => {
    const w = createWall(lvl, { x: 0, y: 0 }, { x: 5, y: 0 }, S, { height: 2.7 });
    const o = createOpening(lvl, w.id, 'door', 1, { width: 0.8, height: 2.05, sill: 0 });
    const pieces = buildWallPieces(w, computeFootprints([w]).get(w.id)!, [o]);
    expect(pieces.map((p) => p.role)).toEqual(['solid', 'above', 'solid']);
  });
});

describe('operaciones de muros', () => {
  it('no duplica tramos colineales', () => {
    const d = createEmptyProject();
    const l = Object.keys(d.levels)[0];
    addWallMerged(d, l, { x: 0, y: 0 }, { x: 4, y: 0 });
    const ids = addWallMerged(d, l, { x: 2, y: 0 }, { x: 6, y: 0 });
    expect(ids).toHaveLength(1);
    const w = d.walls[ids[0]];
    expect(w.start.x).toBeCloseTo(4);
    expect(w.end.x).toBeCloseTo(6);
    expect(addWallMerged(d, l, { x: 1, y: 0 }, { x: 3, y: 0 })).toHaveLength(0);
  });

  it('mueve extremos conectados', () => {
    const d = createEmptyProject();
    const l = Object.keys(d.levels)[0];
    const [a] = addWallMerged(d, l, { x: 0, y: 0 }, { x: 4, y: 0 });
    const [b] = addWallMerged(d, l, { x: 4, y: 0 }, { x: 4, y: 3 });
    moveWallEndpoint(d, a, 'end', { x: 5, y: 0 });
    expect(d.walls[b].start).toEqual({ x: 5, y: 0 });
    translateWalls(d, [b], { x: 1, y: 0 });
    expect(d.walls[a].end).toEqual({ x: 6, y: 0 });
  });

  it('divide un muro y reparte sus huecos', () => {
    const d = createEmptyProject();
    const l = Object.keys(d.levels)[0];
    const [a] = addWallMerged(d, l, { x: 0, y: 0 }, { x: 6, y: 0 });
    const o = createOpening(l, a, 'door', 4.5);
    d.openings[o.id] = o;
    const b = splitWall(d, a, 3)!;
    expect(d.openings[o.id].wallId).toBe(b);
    expect(d.openings[o.id].offset).toBeCloseTo(1.5);
  });
});
