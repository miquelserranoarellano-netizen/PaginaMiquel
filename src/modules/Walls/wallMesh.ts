/**
 * Geometría 3D de un muro a partir de sus tramos (ver geometry.ts).
 * Grupos de material: 0 = cara A, 1 = cara B, 2 = cantos (testas, jambas, coronación).
 * UV en metros: u a lo largo del muro, v en altura.
 */
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { type Vec2, dot, sub } from '@/core/geometry';
import type { WallFrame, WallPiece } from './geometry';

type V3 = [number, number, number];

class GroupBuffer {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  tri(a: V3, b: V3, c: V3, ua: [number, number], ub: [number, number], uc: [number, number], hint: V3) {
    // Normal geométrica; si no coincide con la orientación deseada se invierte el triángulo.
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-12) return;
    nx /= len;
    ny /= len;
    nz /= len;
    if (nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) {
      [b, c] = [c, b];
      [ub, uc] = [uc, ub];
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    this.pos.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) this.nor.push(nx, ny, nz);
    this.uv.push(...ua, ...ub, ...uc);
  }
  quad(v: [V3, V3, V3, V3], uv: [[number, number], [number, number], [number, number], [number, number]], hint: V3) {
    this.tri(v[0], v[1], v[2], uv[0], uv[1], uv[2], hint);
    this.tri(v[0], v[2], v[3], uv[0], uv[2], uv[3], hint);
  }
}

export function mergeGroups(groups: GroupBuffer[]): BufferGeometry {
  const g = new BufferGeometry();
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  let start = 0;
  groups.forEach((gb, i) => {
    const count = gb.pos.length / 3;
    pos.push(...gb.pos);
    nor.push(...gb.nor);
    uv.push(...gb.uv);
    if (count) g.addGroup(start, count, i);
    start += count;
  });
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

export { GroupBuffer };

export function buildWallGeometry(pieces: readonly WallPiece[], f: WallFrame, elevation: number, cutHeight?: number): BufferGeometry {
  const A = new GroupBuffer();
  const B = new GroupBuffer();
  const C = new GroupBuffer();
  const n: V3 = [f.normal.x, 0, f.normal.y];
  const nB: V3 = [-f.normal.x, 0, -f.normal.y];
  const d: V3 = [f.dir.x, 0, f.dir.y];
  const dB: V3 = [-f.dir.x, 0, -f.dir.y];
  const along = (p: Vec2) => dot(sub(p, f.start), f.dir);
  const across = (p: Vec2) => dot(sub(p, f.start), f.normal);
  const P = (p: Vec2, y: number): V3 => [p.x, elevation + y, p.y];

  for (const piece of pieces) {
    let y0 = piece.y0;
    let y1 = piece.y1;
    if (cutHeight !== undefined) {
      if (y0 >= cutHeight) continue;
      y1 = Math.min(y1, cutHeight);
    }
    if (y1 - y0 < 1e-4) continue;
    const [p0, p1, p2, p3] = piece.quad;
    // Cara A
    A.quad([P(p0, y0), P(p1, y0), P(p1, y1), P(p0, y1)], [[along(p0), y0], [along(p1), y0], [along(p1), y1], [along(p0), y1]], n);
    // Cara B
    B.quad([P(p2, y0), P(p3, y0), P(p3, y1), P(p2, y1)], [[along(p2), y0], [along(p3), y0], [along(p3), y1], [along(p2), y1]], nB);
    // Testas / jambas
    C.quad([P(p3, y0), P(p0, y0), P(p0, y1), P(p3, y1)], [[across(p3), y0], [across(p0), y0], [across(p0), y1], [across(p3), y1]], dB);
    C.quad([P(p1, y0), P(p2, y0), P(p2, y1), P(p1, y1)], [[across(p1), y0], [across(p2), y0], [across(p2), y1], [across(p1), y1]], d);
    // Coronación y base
    const uvTop = (p: Vec2): [number, number] => [along(p), across(p)];
    C.quad([P(p0, y1), P(p1, y1), P(p2, y1), P(p3, y1)], [uvTop(p0), uvTop(p1), uvTop(p2), uvTop(p3)], [0, 1, 0]);
    C.quad([P(p0, y0), P(p1, y0), P(p2, y0), P(p3, y0)], [uvTop(p0), uvTop(p1), uvTop(p2), uvTop(p3)], [0, -1, 0]);
  }
  return mergeGroups([A, B, C]);
}
