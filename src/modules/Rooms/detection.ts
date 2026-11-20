/**
 * Detección automática de estancias: construye el grafo plano formado por los
 * ejes de los muros (partidos en sus intersecciones), recorre sus caras y
 * devuelve la cara más pequeña que contiene el punto indicado. El polígono se
 * retranquea medio grosor de muro para obtener la superficie útil.
 */
import {
  type Vec2,
  distance,
  insetPolygon,
  pointInPolygon,
  segmentIntersection,
  signedArea,
  simplifyPolygon,
} from '@/core/geometry';
import type { Wall } from '@/modules/FloorPlan/types';

interface Edge {
  a: number;
  b: number;
  half: number;
}

const MERGE = 1e-3;

export interface DetectedFace {
  /** Polígono por los ejes de los muros. */
  axis: Vec2[];
  /** Polígono interior (descontando medio grosor de cada muro). */
  inner: Vec2[];
  area: number;
}

function buildGraph(walls: readonly Wall[]) {
  const verts: Vec2[] = [];
  const vid = (p: Vec2): number => {
    for (let i = 0; i < verts.length; i++) if (distance(verts[i], p) < MERGE) return i;
    verts.push({ x: p.x, y: p.y });
    return verts.length - 1;
  };
  // Parámetros de corte de cada muro.
  const cuts: number[][] = walls.map(() => [0, 1]);
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const hit = segmentIntersection(walls[i].start, walls[i].end, walls[j].start, walls[j].end, 1e-6);
      if (hit) {
        cuts[i].push(hit.t);
        cuts[j].push(hit.u);
      }
    }
  }
  const edges: Edge[] = [];
  const seen = new Set<string>();
  walls.forEach((w, i) => {
    const ts = [...new Set(cuts[i].map((t) => Math.round(t * 1e6) / 1e6))].sort((a, b) => a - b);
    for (let k = 0; k + 1 < ts.length; k++) {
      const p = { x: w.start.x + (w.end.x - w.start.x) * ts[k], y: w.start.y + (w.end.y - w.start.y) * ts[k] };
      const q = { x: w.start.x + (w.end.x - w.start.x) * ts[k + 1], y: w.start.y + (w.end.y - w.start.y) * ts[k + 1] };
      if (distance(p, q) < MERGE) continue;
      const a = vid(p);
      const b = vid(q);
      if (a === b) continue;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a, b, half: w.thickness / 2 });
    }
  });
  return { verts, edges };
}

/** Todas las caras acotadas del grafo de muros. */
export function findFaces(walls: readonly Wall[]): DetectedFace[] {
  const { verts, edges } = buildGraph(walls);
  // Lista de adyacencia ordenada por ángulo.
  const adj: { to: number; angle: number; half: number }[][] = verts.map(() => []);
  for (const e of edges) {
    const pa = verts[e.a];
    const pb = verts[e.b];
    adj[e.a].push({ to: e.b, angle: Math.atan2(pb.y - pa.y, pb.x - pa.x), half: e.half });
    adj[e.b].push({ to: e.a, angle: Math.atan2(pa.y - pb.y, pa.x - pb.x), half: e.half });
  }
  adj.forEach((l) => l.sort((m, n) => m.angle - n.angle));

  const visited = new Set<string>();
  const faces: DetectedFace[] = [];
  for (let u = 0; u < verts.length; u++) {
    for (const start of adj[u]) {
      const key0 = `${u}>${start.to}`;
      if (visited.has(key0)) continue;
      const cycle: number[] = [];
      const halves: number[] = [];
      let from = u;
      let cur = start;
      let guard = 0;
      while (guard++ < 10000) {
        const key = `${from}>${cur.to}`;
        if (visited.has(key)) break;
        visited.add(key);
        cycle.push(from);
        halves.push(cur.half);
        const v = cur.to;
        const list = adj[v];
        // Ángulo de vuelta (v → from); siguiente arista: la primera en sentido horario.
        const back = Math.atan2(verts[from].y - verts[v].y, verts[from].x - verts[v].x);
        let idx = list.findIndex((n) => n.to === from && Math.abs(n.angle - back) < 1e-9);
        if (idx < 0) idx = list.findIndex((n) => n.to === from);
        const next = list[(idx - 1 + list.length) % list.length];
        from = v;
        cur = next;
      }
      if (cycle.length < 3) continue;
      const poly = cycle.map((i) => verts[i]);
      const area = signedArea(poly);
      if (area <= 1e-4) continue; // cara exterior o degenerada
      // Elimina "espuelas" (muros sueltos que entran y salen de la cara).
      const pts: Vec2[] = [];
      const hs: number[] = [];
      for (let i = 0; i < poly.length; i++) {
        pts.push(poly[i]);
        hs.push(halves[i]);
        while (pts.length >= 3 && distance(pts[pts.length - 1], pts[pts.length - 3]) < MERGE) {
          pts.splice(pts.length - 2, 2);
          hs.splice(hs.length - 2, 2);
        }
      }
      if (pts.length < 3) continue;
      const inner = simplifyPolygon(insetPolygon(pts, hs));
      faces.push({ axis: pts, inner, area: Math.abs(signedArea(inner)) });
    }
  }
  return faces;
}

/** Cara más pequeña que contiene el punto p, o null si el punto no está cerrado por muros. */
export function detectRoomAt(p: Vec2, walls: readonly Wall[]): DetectedFace | null {
  const faces = findFaces(walls).filter((f) => pointInPolygon(p, f.axis));
  if (!faces.length) return null;
  faces.sort((a, b) => Math.abs(signedArea(a.axis)) - Math.abs(signedArea(b.axis)));
  return faces[0];
}
