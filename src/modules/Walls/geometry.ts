/**
 * Geometría de muros:
 *  - Huella (polígono en planta) con uniones a inglete entre muros conectados.
 *  - División en tramos alrededor de puertas y ventanas (sin CSG): tramos
 *    macizos, antepechos y dinteles. Se usa para el 3D y las colisiones.
 */
import {
  type Vec2,
  add,
  almostEqual,
  cross,
  distance,
  dot,
  length,
  lineIntersection,
  normalize,
  perp,
  projectOnSegment,
  scale,
  sub,
} from '@/core/geometry';
import type { Opening, Wall } from '@/modules/FloorPlan/types';

const JOIN_EPS = 0.005;

export interface WallFrame {
  start: Vec2;
  end: Vec2;
  /** Dirección unitaria start→end. */
  dir: Vec2;
  /** Normal unitaria (lado A). */
  normal: Vec2;
  length: number;
  angle: number;
}

export function wallFrame(w: Pick<Wall, 'start' | 'end'>): WallFrame {
  const d = sub(w.end, w.start);
  const len = length(d);
  const dir = len > 1e-9 ? scale(d, 1 / len) : { x: 1, y: 0 };
  return { start: w.start, end: w.end, dir, normal: perp(dir), length: len, angle: Math.atan2(dir.y, dir.x) };
}

/** Punto del eje del muro a una distancia u desde el inicio. */
export const pointAlong = (f: WallFrame, u: number): Vec2 => add(f.start, scale(f.dir, u));

export interface WallFootprint {
  wallId: string;
  /** Esquinas: inicio-izquierda (A), fin-izquierda, fin-derecha (B), inicio-derecha. */
  sl: Vec2;
  el: Vec2;
  er: Vec2;
  sr: Vec2;
  polygon: Vec2[];
}

interface EndCorners {
  plus: Vec2;
  minus: Vec2;
}

function squareEnd(j: Vec2, a: Vec2, t: number, back = 0): EndCorners {
  const n = perp(a);
  const base = sub(j, scale(a, back));
  return { plus: add(base, scale(n, t)), minus: sub(base, scale(n, t)) };
}

/**
 * Calcula las esquinas de un extremo de muro.
 * @param j punto de unión
 * @param a dirección (unitaria) desde j hacia el interior del muro
 * @param t medio grosor
 */
function endCorners(j: Vec2, a: Vec2, t: number, others: { dir: Vec2; half: number }[]): EndCorners {
  if (others.length === 1) {
    const { dir: b, half: tb } = others[0];
    if (Math.abs(cross(a, b)) < 1e-6) return squareEnd(j, a, t);
    const na = perp(a);
    const nb = perp(b);
    const plus = lineIntersection(add(j, scale(na, t)), a, sub(j, scale(nb, tb)), b);
    const minus = lineIntersection(sub(j, scale(na, t)), a, add(j, scale(nb, tb)), b);
    const limit = 4 * Math.max(t, tb);
    if (!plus || !minus || distance(plus, j) > limit || distance(minus, j) > limit) return squareEnd(j, a, t);
    return { plus, minus };
  }
  if (others.length >= 2) {
    const ext = Math.max(...others.map((o) => o.half)) * 0.96;
    return squareEnd(j, a, t, ext);
  }
  return squareEnd(j, a, t);
}

/** Muros (distintos de `self`) con un extremo en j, con la dirección que se aleja de j. */
function wallsAt(j: Vec2, self: Wall, walls: readonly Wall[]): { dir: Vec2; half: number }[] {
  const res: { dir: Vec2; half: number }[] = [];
  for (const w of walls) {
    if (w.id === self.id) continue;
    if (almostEqual(w.start, j, JOIN_EPS)) res.push({ dir: normalize(sub(w.end, w.start)), half: w.thickness / 2 });
    else if (almostEqual(w.end, j, JOIN_EPS)) res.push({ dir: normalize(sub(w.start, w.end)), half: w.thickness / 2 });
  }
  return res;
}

export function computeFootprint(wall: Wall, walls: readonly Wall[]): WallFootprint {
  const f = wallFrame(wall);
  const t = wall.thickness / 2;
  const s = endCorners(wall.start, f.dir, t, wallsAt(wall.start, wall, walls));
  const e = endCorners(wall.end, scale(f.dir, -1), t, wallsAt(wall.end, wall, walls));
  let sl = s.plus;
  let sr = s.minus;
  let el = e.minus;
  let er = e.plus;
  // Si las esquinas se cruzan (muro muy corto y grueso) se usan extremos rectos.
  if (dot(sub(el, sl), f.dir) <= 0 || dot(sub(er, sr), f.dir) <= 0) {
    const ss = squareEnd(wall.start, f.dir, t);
    const ee = squareEnd(wall.end, scale(f.dir, -1), t);
    sl = ss.plus;
    sr = ss.minus;
    el = ee.minus;
    er = ee.plus;
  }
  return { wallId: wall.id, sl, el, er, sr, polygon: [sl, el, er, sr] };
}

export function computeFootprints(walls: readonly Wall[]): Map<string, WallFootprint> {
  const map = new Map<string, WallFootprint>();
  for (const w of walls) map.set(w.id, computeFootprint(w, walls));
  return map;
}

/** Muros que comparten algún extremo con `wall` (para recalcular solo lo necesario). */
export function connectedWalls(wall: Wall, walls: readonly Wall[]): Wall[] {
  return walls.filter(
    (w) =>
      w.id !== wall.id &&
      (almostEqual(w.start, wall.start, JOIN_EPS) ||
        almostEqual(w.start, wall.end, JOIN_EPS) ||
        almostEqual(w.end, wall.start, JOIN_EPS) ||
        almostEqual(w.end, wall.end, JOIN_EPS)),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tramos del muro (para 3D y colisiones)

export type PieceRole = 'solid' | 'below' | 'above';

export interface WallPiece {
  role: PieceRole;
  /** Cuadrilátero en planta: [inicio-A, fin-A, fin-B, inicio-B]. */
  quad: [Vec2, Vec2, Vec2, Vec2];
  /** Alturas relativas al suelo de la planta. */
  y0: number;
  y1: number;
  openingId?: string;
}

export interface OpeningSpan {
  id: string;
  u0: number;
  u1: number;
  sill: number;
  top: number;
}

/** Intervalos ocupados por huecos a lo largo del muro (ordenados y recortados). */
export function openingSpans(wall: Wall, openings: readonly Opening[]): OpeningSpan[] {
  const len = wallFrame(wall).length;
  return openings
    .filter((o) => o.wallId === wall.id)
    .map((o) => ({
      id: o.id,
      u0: Math.max(0.001, o.offset - o.width / 2),
      u1: Math.min(len - 0.001, o.offset + o.width / 2),
      sill: Math.max(0, o.sill),
      top: Math.min(wall.height, o.sill + o.height),
    }))
    .filter((s) => s.u1 - s.u0 > 0.01)
    .sort((a, b) => a.u0 - b.u0);
}

export function buildWallPieces(wall: Wall, fp: WallFootprint, openings: readonly Opening[]): WallPiece[] {
  const f = wallFrame(wall);
  const t = wall.thickness / 2;
  const L = (u: number) => add(pointAlong(f, u), scale(f.normal, t));
  const R = (u: number) => sub(pointAlong(f, u), scale(f.normal, t));
  const spans = openingSpans(wall, openings);
  const pieces: WallPiece[] = [];
  const h = wall.height;

  // Los huecos solapados se fusionan para que los tramos macizos nunca se crucen.
  let cursor = 0;
  let startL = fp.sl;
  let startR = fp.sr;
  let any = false;
  for (const s of spans) {
    const u0 = Math.max(s.u0, cursor);
    if (u0 >= s.u1) continue;
    any = true;
    if (u0 - cursor > 0.0005) pieces.push({ role: 'solid', quad: [startL, L(u0), R(u0), startR], y0: 0, y1: h });
    if (s.sill > 0.001) pieces.push({ role: 'below', quad: [L(u0), L(s.u1), R(s.u1), R(u0)], y0: 0, y1: s.sill, openingId: s.id });
    if (h - s.top > 0.001) pieces.push({ role: 'above', quad: [L(u0), L(s.u1), R(s.u1), R(u0)], y0: s.top, y1: h, openingId: s.id });
    cursor = s.u1;
    startL = L(cursor);
    startR = R(cursor);
  }
  if (!any) pieces.push({ role: 'solid', quad: [fp.sl, fp.el, fp.er, fp.sr], y0: 0, y1: h });
  else if (f.length - cursor > 0.0005) pieces.push({ role: 'solid', quad: [startL, fp.el, fp.er, startR], y0: 0, y1: h });
  return pieces;
}

// ─────────────────────────────────────────────────────────────────────────────
// Consultas

export interface WallHit {
  wall: Wall;
  /** Distancia desde el inicio del muro al punto proyectado. */
  offset: number;
  point: Vec2;
  distance: number;
}

/** Muro más cercano a p dentro de la tolerancia (en metros). */
export function nearestWall(p: Vec2, walls: readonly Wall[], tolerance: number): WallHit | null {
  let best: WallHit | null = null;
  for (const w of walls) {
    const pr = projectOnSegment(p, w.start, w.end);
    const limit = tolerance + w.thickness / 2;
    if (pr.distance <= limit && (!best || pr.distance < best.distance)) {
      best = { wall: w, offset: pr.t * distance(w.start, w.end), point: pr.point, distance: pr.distance };
    }
  }
  return best;
}

export const wallLength = (w: Pick<Wall, 'start' | 'end'>): number => distance(w.start, w.end);
