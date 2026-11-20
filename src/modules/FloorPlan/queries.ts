/**
 * Consultas y operaciones genéricas sobre elementos del documento
 * (seleccionar, borrar en cascada, duplicar, trasladar, resumen de superficies).
 */
import { type BBox, type Vec2, add, bboxIntersects, bboxOf, cleanVec, mergeBBox, orientedRect, polygonArea } from '@/core/geometry';
import { uid } from '@/core/ids';
import { degToRad } from '@/core/units';
import { translateWalls } from '@/modules/Walls/ops';
import { wallFrame } from '@/modules/Walls/geometry';
import type { ElementKind, ElementRef, ID, ProjectDoc } from './types';
import { COLLECTION } from './types';

export function getElement(doc: ProjectDoc, ref: ElementRef) {
  return doc[COLLECTION[ref.kind]][ref.id] as unknown;
}

export const elementExists = (doc: ProjectDoc, ref: ElementRef): boolean => !!doc[COLLECTION[ref.kind]][ref.id];

export const levelElements = <K extends 'walls' | 'rooms' | 'openings' | 'furniture' | 'dimensions'>(
  doc: ProjectDoc,
  key: K,
  levelId: ID,
): ProjectDoc[K][string][] => Object.values(doc[key]).filter((e) => e.levelId === levelId) as ProjectDoc[K][string][];

/** Borra elementos; al borrar un muro se borran sus puertas y ventanas. */
export function deleteElements(doc: ProjectDoc, refs: readonly ElementRef[]): void {
  for (const ref of refs) {
    if (ref.kind === 'wall') {
      for (const o of Object.values(doc.openings)) if (o.wallId === ref.id) delete doc.openings[o.id];
    }
    delete doc[COLLECTION[ref.kind]][ref.id];
  }
}

/** Huella aproximada de cualquier elemento (para selección por recuadro y encuadres). */
export function elementBBox(doc: ProjectDoc, ref: ElementRef): BBox | null {
  switch (ref.kind) {
    case 'wall': {
      const w = doc.walls[ref.id];
      return w ? bboxOf([w.start, w.end]) : null;
    }
    case 'room': {
      const r = doc.rooms[ref.id];
      return r ? bboxOf(r.points) : null;
    }
    case 'opening': {
      const o = doc.openings[ref.id];
      const w = o && doc.walls[o.wallId];
      if (!o || !w) return null;
      const f = wallFrame(w);
      const c = add(w.start, { x: f.dir.x * o.offset, y: f.dir.y * o.offset });
      return bboxOf(orientedRect(c, o.width, w.thickness, f.angle));
    }
    case 'furniture': {
      const it = doc.furniture[ref.id];
      return it ? bboxOf(orientedRect(it.position, it.width, it.depth, degToRad(it.rotation))) : null;
    }
    case 'dimension': {
      const d = doc.dimensions[ref.id];
      return d ? bboxOf([d.start, d.end]) : null;
    }
  }
}

/** Elementos de la planta cuya huella cae dentro (o toca) el recuadro. */
export function elementsInBox(doc: ProjectDoc, levelId: ID, box: BBox, fullyInside: boolean): ElementRef[] {
  const res: ElementRef[] = [];
  const kinds: ElementKind[] = ['wall', 'room', 'opening', 'furniture', 'dimension'];
  for (const kind of kinds) {
    for (const el of Object.values(doc[COLLECTION[kind]])) {
      if (el.levelId !== levelId) continue;
      const ref = { kind, id: el.id };
      const b = elementBBox(doc, ref);
      if (!b) continue;
      const inside = b.minX >= box.minX && b.maxX <= box.maxX && b.minY >= box.minY && b.maxY <= box.maxY;
      if (fullyInside ? inside : bboxIntersects(b, box)) res.push(ref);
    }
  }
  return res;
}

export function levelBBox(doc: ProjectDoc, levelId: ID): BBox | null {
  let box: BBox | null = null;
  for (const w of Object.values(doc.walls)) if (w.levelId === levelId) box = mergeBBox(box, bboxOf([w.start, w.end]));
  for (const r of Object.values(doc.rooms)) if (r.levelId === levelId) box = mergeBBox(box, bboxOf(r.points));
  for (const f of Object.values(doc.furniture))
    if (f.levelId === levelId) box = mergeBBox(box, bboxOf(orientedRect(f.position, f.width, f.depth, degToRad(f.rotation))));
  return box;
}

/** Traslada elementos. Puertas/ventanas se desplazan a lo largo de su muro. */
export function translateElements(doc: ProjectDoc, refs: readonly ElementRef[], delta: Vec2, keepConnections = true): void {
  const wallIds = refs.filter((r) => r.kind === 'wall').map((r) => r.id);
  if (wallIds.length) translateWalls(doc, wallIds, delta, keepConnections);
  const movedWalls = new Set(wallIds);
  for (const ref of refs) {
    switch (ref.kind) {
      case 'room': {
        const r = doc.rooms[ref.id];
        if (r) r.points = r.points.map((p) => cleanVec(add(p, delta)));
        break;
      }
      case 'furniture': {
        const f = doc.furniture[ref.id];
        if (f) f.position = cleanVec(add(f.position, delta));
        break;
      }
      case 'dimension': {
        const d = doc.dimensions[ref.id];
        if (d) {
          d.start = cleanVec(add(d.start, delta));
          d.end = cleanVec(add(d.end, delta));
        }
        break;
      }
      case 'opening': {
        const o = doc.openings[ref.id];
        const w = o && doc.walls[o.wallId];
        if (!o || !w || movedWalls.has(w.id)) break;
        const f = wallFrame(w);
        const len = f.length;
        const along = delta.x * f.dir.x + delta.y * f.dir.y;
        o.offset = Math.min(len - o.width / 2 - 0.02, Math.max(o.width / 2 + 0.02, o.offset + along));
        break;
      }
      default:
        break;
    }
  }
}

/** Duplica elementos desplazados. Devuelve las referencias nuevas. */
export function duplicateElements(doc: ProjectDoc, refs: readonly ElementRef[], delta: Vec2): ElementRef[] {
  const out: ElementRef[] = [];
  const wallMap = new Map<ID, ID>();
  for (const ref of refs) {
    if (ref.kind !== 'wall') continue;
    const w = doc.walls[ref.id];
    if (!w) continue;
    const copy = { ...structuredClone(w), id: uid('wall'), start: cleanVec(add(w.start, delta)), end: cleanVec(add(w.end, delta)) };
    doc.walls[copy.id] = copy;
    wallMap.set(w.id, copy.id);
    out.push({ kind: 'wall', id: copy.id });
  }
  // Los huecos de muros duplicados se copian con su muro.
  for (const o of Object.values(doc.openings)) {
    const nw = wallMap.get(o.wallId);
    if (nw) {
      const copy = { ...structuredClone(o), id: uid('open'), wallId: nw };
      doc.openings[copy.id] = copy;
      out.push({ kind: 'opening', id: copy.id });
    }
  }
  for (const ref of refs) {
    if (ref.kind === 'room') {
      const r = doc.rooms[ref.id];
      if (!r) continue;
      const copy = { ...structuredClone(r), id: uid('room'), points: r.points.map((p) => cleanVec(add(p, delta))) };
      doc.rooms[copy.id] = copy;
      out.push({ kind: 'room', id: copy.id });
    } else if (ref.kind === 'furniture') {
      const f = doc.furniture[ref.id];
      if (!f) continue;
      const copy = { ...structuredClone(f), id: uid('furn'), position: cleanVec(add(f.position, delta)) };
      doc.furniture[copy.id] = copy;
      out.push({ kind: 'furniture', id: copy.id });
    } else if (ref.kind === 'dimension') {
      const d = doc.dimensions[ref.id];
      if (!d) continue;
      const copy = { ...structuredClone(d), id: uid('dim'), start: cleanVec(add(d.start, delta)), end: cleanVec(add(d.end, delta)) };
      doc.dimensions[copy.id] = copy;
      out.push({ kind: 'dimension', id: copy.id });
    }
  }
  return out;
}

export interface LevelSummary {
  rooms: number;
  /** Superficie útil (suma de estancias interiores). */
  usefulArea: number;
  /** Superficie de estancias exteriores (terraza, jardín…). */
  outdoorArea: number;
  walls: number;
  wallLength: number;
  openings: number;
  furniture: number;
}

const OUTDOOR = new Set(['terraza', 'jardin', 'piscina']);

export function summarize(doc: ProjectDoc, levelId?: ID): LevelSummary {
  const s: LevelSummary = { rooms: 0, usefulArea: 0, outdoorArea: 0, walls: 0, wallLength: 0, openings: 0, furniture: 0 };
  for (const r of Object.values(doc.rooms)) {
    if (levelId && r.levelId !== levelId) continue;
    s.rooms++;
    if (OUTDOOR.has(r.type)) s.outdoorArea += polygonArea(r.points);
    else s.usefulArea += polygonArea(r.points);
  }
  for (const w of Object.values(doc.walls)) {
    if (levelId && w.levelId !== levelId) continue;
    s.walls++;
    s.wallLength += Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
  }
  for (const o of Object.values(doc.openings)) if (!levelId || o.levelId === levelId) s.openings++;
  for (const f of Object.values(doc.furniture)) if (!levelId || f.levelId === levelId) s.furniture++;
  return s;
}

export const sortedLevels = (doc: ProjectDoc) => Object.values(doc.levels).sort((a, b) => a.order - b.order);
