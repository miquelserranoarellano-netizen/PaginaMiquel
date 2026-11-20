/**
 * Operaciones sobre muros. Todas reciben el *draft* de Immer del documento y lo
 * modifican; se ejecutan dentro de projectStore.apply / updateGesture.
 */
import {
  type Vec2,
  add,
  almostEqual,
  cleanVec,
  cross,
  distance,
  dot,
  normalize,
  scale,
  sub,
} from '@/core/geometry';
import { createWall } from '@/modules/FloorPlan/factory';
import type { ID, ProjectDoc, Wall } from '@/modules/FloorPlan/types';
import { LIMITS } from '@/modules/FloorPlan/defaults';
import { wallFrame, wallLength } from './geometry';

const EPS = 0.005;

export const wallsOnLevel = (doc: ProjectDoc, levelId: ID): Wall[] =>
  Object.values(doc.walls).filter((w) => w.levelId === levelId);

/**
 * Añade un muro de a a b evitando duplicar tramos que ya existen: se descartan
 * las partes que se solapan con muros colineales de la misma planta.
 * Devuelve los ids de los muros creados.
 */
export function addWallMerged(doc: ProjectDoc, levelId: ID, a: Vec2, b: Vec2, overrides: Partial<Wall> = {}): ID[] {
  const len = distance(a, b);
  if (len < LIMITS.wallLength.min) return [];
  const dir = normalize(sub(b, a));
  const covered: [number, number][] = [];
  for (const w of wallsOnLevel(doc, levelId)) {
    const ds = sub(w.start, a);
    const de = sub(w.end, a);
    // Ambos extremos sobre la recta a-b → colineal.
    if (Math.abs(cross(dir, ds)) > EPS || Math.abs(cross(dir, de)) > EPS) continue;
    const t0 = dot(ds, dir);
    const t1 = dot(de, dir);
    covered.push([Math.min(t0, t1), Math.max(t0, t1)]);
  }
  covered.sort((m, n) => m[0] - n[0]);
  const free: [number, number][] = [];
  let cur = 0;
  for (const [c0, c1] of covered) {
    if (c1 <= cur + EPS) continue;
    if (c0 > cur + EPS) free.push([cur, Math.min(c0, len)]);
    cur = Math.max(cur, c1);
    if (cur >= len) break;
  }
  if (cur < len - EPS) free.push([cur, len]);
  const ids: ID[] = [];
  for (const [t0, t1] of free) {
    if (t1 - t0 < LIMITS.wallLength.min) continue;
    const w = createWall(levelId, add(a, scale(dir, t0)), add(a, scale(dir, t1)), doc.settings, overrides);
    doc.walls[w.id] = w;
    ids.push(w.id);
  }
  return ids;
}

/** Extremos de otros muros que coinciden con el punto p (para arrastrarlos juntos). */
export function endpointsAt(doc: ProjectDoc, levelId: ID, p: Vec2, exclude: ReadonlySet<ID> = new Set()) {
  const res: { id: ID; end: 'start' | 'end' }[] = [];
  for (const w of Object.values(doc.walls)) {
    if (w.levelId !== levelId || exclude.has(w.id)) continue;
    if (almostEqual(w.start, p, EPS)) res.push({ id: w.id, end: 'start' });
    if (almostEqual(w.end, p, EPS)) res.push({ id: w.id, end: 'end' });
  }
  return res;
}

/**
 * Mueve un extremo de un muro. Los extremos de otros muros conectados en ese
 * punto le acompañan para que las uniones no se rompan.
 */
export function moveWallEndpoint(doc: ProjectDoc, wallId: ID, which: 'start' | 'end', to: Vec2, keepConnections = true): void {
  const wall = doc.walls[wallId];
  if (!wall) return;
  const from = { ...wall[which] };
  const target = cleanVec(to);
  const other = which === 'start' ? wall.end : wall.start;
  if (distance(target, other) < LIMITS.wallLength.min) return;
  if (keepConnections) {
    for (const ep of endpointsAt(doc, wall.levelId, from, new Set([wallId]))) {
      const w = doc.walls[ep.id];
      const otherEnd = ep.end === 'start' ? w.end : w.start;
      if (distance(target, otherEnd) >= LIMITS.wallLength.min) w[ep.end] = { ...target };
    }
  }
  wall[which] = target;
  clampOpenings(doc, wallId);
}

/** Traslada un conjunto de muros; los extremos conectados de muros no seleccionados les siguen. */
export function translateWalls(doc: ProjectDoc, ids: readonly ID[], delta: Vec2, keepConnections = true): void {
  const set = new Set(ids);
  const moves: { id: ID; end: 'start' | 'end'; to: Vec2 }[] = [];
  for (const id of ids) {
    const w = doc.walls[id];
    if (!w) continue;
    if (keepConnections) {
      for (const end of ['start', 'end'] as const) {
        for (const ep of endpointsAt(doc, w.levelId, w[end], set)) {
          const ow = doc.walls[ep.id];
          moves.push({ id: ep.id, end: ep.end, to: cleanVec(add(ow[ep.end], delta)) });
        }
      }
    }
  }
  for (const id of ids) {
    const w = doc.walls[id];
    if (!w) continue;
    w.start = cleanVec(add(w.start, delta));
    w.end = cleanVec(add(w.end, delta));
  }
  const done = new Set<string>();
  for (const m of moves) {
    const key = `${m.id}:${m.end}`;
    if (done.has(key)) continue;
    done.add(key);
    doc.walls[m.id][m.end] = m.to;
    clampOpenings(doc, m.id);
  }
}

/** Fija la longitud exacta de un muro moviendo el extremo indicado. */
export function setWallLength(doc: ProjectDoc, wallId: ID, newLength: number, anchor: 'start' | 'end' = 'start'): void {
  const w = doc.walls[wallId];
  if (!w) return;
  const len = Math.min(LIMITS.wallLength.max, Math.max(LIMITS.wallLength.min, newLength));
  const f = wallFrame(w);
  if (anchor === 'start') moveWallEndpoint(doc, wallId, 'end', add(w.start, scale(f.dir, len)));
  else moveWallEndpoint(doc, wallId, 'start', sub(w.end, scale(f.dir, len)));
}

/** Fija el ángulo del muro (grados, horario en planta) manteniendo el inicio. */
export function setWallAngle(doc: ProjectDoc, wallId: ID, deg: number): void {
  const w = doc.walls[wallId];
  if (!w) return;
  const len = wallLength(w);
  const rad = (deg * Math.PI) / 180;
  moveWallEndpoint(doc, wallId, 'end', { x: w.start.x + Math.cos(rad) * len, y: w.start.y + Math.sin(rad) * len });
}

/** Divide un muro en dos en el punto indicado (a una distancia `at` del inicio). */
export function splitWall(doc: ProjectDoc, wallId: ID, at: number): ID | null {
  const w = doc.walls[wallId];
  if (!w) return null;
  const f = wallFrame(w);
  if (at < LIMITS.wallLength.min || at > f.length - LIMITS.wallLength.min) return null;
  const mid = cleanVec(add(w.start, scale(f.dir, at)));
  const second: Wall = { ...structuredClone(w), id: createWall(w.levelId, mid, w.end, doc.settings).id, start: mid, end: { ...w.end } };
  w.end = mid;
  doc.walls[second.id] = second;
  for (const o of Object.values(doc.openings)) {
    if (o.wallId !== wallId) continue;
    if (o.offset > at) {
      o.wallId = second.id;
      o.offset -= at;
    }
  }
  clampOpenings(doc, wallId);
  clampOpenings(doc, second.id);
  return second.id;
}

/** Invierte el sentido del muro (intercambia caras A/B) conservando la posición de los huecos. */
export function flipWall(doc: ProjectDoc, wallId: ID): void {
  const w = doc.walls[wallId];
  if (!w) return;
  const len = wallLength(w);
  [w.start, w.end] = [w.end, w.start];
  [w.sideA, w.sideB] = [w.sideB, w.sideA];
  for (const o of Object.values(doc.openings)) {
    if (o.wallId !== wallId) continue;
    o.offset = len - o.offset;
    o.swing = o.swing === 'a' ? 'b' : 'a';
    o.hinge = o.hinge === 'left' ? 'right' : 'left';
  }
}

/** Mantiene los huecos de un muro dentro de su longitud. */
export function clampOpenings(doc: ProjectDoc, wallId: ID): void {
  const w = doc.walls[wallId];
  if (!w) return;
  const len = wallLength(w);
  for (const o of Object.values(doc.openings)) {
    if (o.wallId !== wallId) continue;
    const margin = 0.02;
    if (o.width > len - 2 * margin) o.width = Math.max(0.1, len - 2 * margin);
    const half = o.width / 2;
    o.offset = Math.min(len - margin - half, Math.max(margin + half, o.offset));
    if (o.sill + o.height > w.height) o.height = Math.max(0.1, w.height - o.sill);
  }
}
