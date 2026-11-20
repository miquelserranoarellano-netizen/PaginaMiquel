import { type Vec2, add, distance, normalize, perp, rotate, scale, sub } from '@/core/geometry';
import { degToRad } from '@/core/units';
import type { ElementRef, ProjectDoc } from '@/modules/FloorPlan/types';
import { wallFrame } from '@/modules/Walls/geometry';

export type HandleKind = 'wall-start' | 'wall-end' | 'room-vertex' | 'furn-rotate' | 'dim-start' | 'dim-end' | 'dim-offset' | 'opening-left' | 'opening-right';

export interface Handle {
  kind: HandleKind;
  ref: ElementRef;
  index?: number;
  pos: Vec2;
}

/** Tiradores del elemento seleccionado (solo con un único elemento). */
export function getHandles(doc: ProjectDoc, selection: readonly ElementRef[], zoom: number): Handle[] {
  if (selection.length !== 1) return [];
  const ref = selection[0];
  switch (ref.kind) {
    case 'wall': {
      const w = doc.walls[ref.id];
      return w ? [{ kind: 'wall-start', ref, pos: w.start }, { kind: 'wall-end', ref, pos: w.end }] : [];
    }
    case 'room': {
      const r = doc.rooms[ref.id];
      return r ? r.points.map((pos, index) => ({ kind: 'room-vertex' as const, ref, index, pos })) : [];
    }
    case 'furniture': {
      const f = doc.furniture[ref.id];
      if (!f) return [];
      const off = f.depth / 2 + Math.max(0.25, 26 / zoom);
      return [{ kind: 'furn-rotate', ref, pos: add(f.position, rotate({ x: 0, y: -off }, degToRad(f.rotation))) }];
    }
    case 'dimension': {
      const d = doc.dimensions[ref.id];
      if (!d) return [];
      const n = perp(normalize(sub(d.end, d.start)));
      const mid = scale(add(d.start, d.end), 0.5);
      return [
        { kind: 'dim-start', ref, pos: d.start },
        { kind: 'dim-end', ref, pos: d.end },
        { kind: 'dim-offset', ref, pos: add(mid, scale(n, d.offset)) },
      ];
    }
    case 'opening': {
      const o = doc.openings[ref.id];
      const w = o && doc.walls[o.wallId];
      if (!o || !w) return [];
      const f = wallFrame(w);
      return [
        { kind: 'opening-left', ref, pos: add(w.start, scale(f.dir, o.offset - o.width / 2)) },
        { kind: 'opening-right', ref, pos: add(w.start, scale(f.dir, o.offset + o.width / 2)) },
      ];
    }
  }
}

export function hitHandle(handles: readonly Handle[], p: Vec2, zoom: number): Handle | null {
  const tol = 8 / zoom;
  let best: Handle | null = null;
  let bd = tol;
  for (const h of handles) {
    const d = distance(h.pos, p);
    if (d <= bd) {
      bd = d;
      best = h;
    }
  }
  return best;
}
