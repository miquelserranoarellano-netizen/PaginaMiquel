/**
 * Losas (suelos y techos) a partir del polígono de una estancia.
 * Grupos: 0 = cara superior, 1 = cara inferior, 2 = cantos. UV en metros (planta).
 */
import { type BufferGeometry, ShapeUtils, Vector2 } from 'three';
import type { Vec2 } from '@/core/geometry';
import { GroupBuffer, mergeGroups } from '@/modules/Walls/wallMesh';

export function buildSlabGeometry(points: readonly Vec2[], yTop: number, thickness: number, holes: readonly (readonly Vec2[])[] = []): BufferGeometry {
  const top = new GroupBuffer();
  const bottom = new GroupBuffer();
  const sides = new GroupBuffer();
  const contour = points.map((p) => new Vector2(p.x, p.y));
  if (ShapeUtils.isClockWise(contour)) contour.reverse();
  const holeLoops = holes.map((h) => {
    const loop = h.map((p) => new Vector2(p.x, p.y));
    return ShapeUtils.isClockWise(loop) ? loop : loop.reverse();
  });
  const tris = ShapeUtils.triangulateShape(contour, holeLoops);
  const all = contour.concat(...holeLoops);
  const yb = yTop - thickness;
  for (const [i, j, k] of tris) {
    const a = all[i];
    const b = all[j];
    const c = all[k];
    top.tri([a.x, yTop, a.y], [b.x, yTop, b.y], [c.x, yTop, c.y], [a.x, a.y], [b.x, b.y], [c.x, c.y], [0, 1, 0]);
    if (thickness > 0) bottom.tri([a.x, yb, a.y], [b.x, yb, b.y], [c.x, yb, c.y], [a.x, a.y], [b.x, b.y], [c.x, c.y], [0, -1, 0]);
  }
  if (thickness > 0) {
    // Contorno de área positiva: normal exterior (dy, -dx). Los huecos (en sentido
    // contrario) usan la misma fórmula y quedan orientados hacia el hueco.
    let u = 0;
    for (const loop of [contour, ...holeLoops])
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      const len = a.distanceTo(b);
      const nx = b.y - a.y;
      const nz = -(b.x - a.x);
      sides.quad(
        [
          [a.x, yb, a.y],
          [b.x, yb, b.y],
          [b.x, yTop, b.y],
          [a.x, yTop, a.y],
        ],
        [
          [u, yb],
          [u + len, yb],
          [u + len, yTop],
          [u, yTop],
        ],
        [nx, 0, nz],
      );
      u += len;
    }
  }
  return mergeGroups([top, bottom, sides]);
}
