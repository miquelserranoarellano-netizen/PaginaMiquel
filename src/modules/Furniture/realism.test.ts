import { describe, expect, it } from 'vitest';
import { Euler, Matrix4 } from 'three';
import { yawTilt, plantParts } from './catalog/parts';
import { taperGeometry } from './geometries';
import { getCatalogItem } from './catalog';
import { furnitureSymbol } from './symbol';

describe('modelos más realistas', () => {
  it('yawTilt equivale a inclinar sobre X y girar sobre el eje vertical', () => {
    for (const [yaw, tilt] of [[0.3, -0.8], [2.4, 0.2], [-1.1, -1.3], [3.0, 0.9]]) {
      const m = new Matrix4().makeRotationY(yaw).multiply(new Matrix4().makeRotationX(tilt));
      const e = new Euler().setFromRotationMatrix(m, 'XYZ');
      const [x, y, z] = yawTilt(yaw, tilt);
      const ours = new Matrix4().makeRotationFromEuler(new Euler(x, y, z, 'XYZ'));
      for (let i = 0; i < 16; i++) expect(ours.elements[i]).toBeCloseTo(m.elements[i], 6);
      expect(e.x).toBeCloseTo(x, 5);
    }
  });

  it('el tronco de pirámide tiene la base y la tapa pedidas', () => {
    const g = taperGeometry(1.6, 0.6, 2.4, 1.4, 1.2, -0.1);
    g.computeBoundingBox();
    const b = g.boundingBox!;
    expect(b.max.x - b.min.x).toBeCloseTo(1.6, 5);
    expect(b.max.y - b.min.y).toBeCloseTo(0.6, 5);
    expect(b.max.z - b.min.z).toBeCloseTo(2.4, 5);
    expect(g.getAttribute('position').count).toBe(36);
  });

  it('las hojas de las plantas no ensucian el plano y caben en su medida', () => {
    const parts = plantParts(0.55, 1.3, 0.38);
    const leaves = parts.filter((p) => p.m === 'primary' && !p.noMesh);
    expect(leaves.length).toBeGreaterThan(15);
    expect(leaves.every((p) => p.noPlan)).toBe(true);
    for (const p of leaves) expect(p.p[1] + p.d[2] / 2).toBeLessThanOrEqual(1.3 + 0.25);
    const symbol = furnitureSymbol(getCatalogItem('plant')!, 0.55, 0.55, 1.3);
    expect(symbol.length).toBeLessThanOrEqual(3);
  });

  it('coche, cama y sofá usan sus ranuras de material', () => {
    for (const id of ['car', 'bed-double', 'bed-single', 'bed-king', 'sofa-3', 'sofa-2', 'sofa-l', 'armchair']) {
      const item = getCatalogItem(id)!;
      for (const part of item.build(item.w, item.d, item.h, {})) expect(item.slots[part.m], `${id}: ${part.m}`).toBeDefined();
    }
  });
});
