import {
  type Vec2,
  add,
  cross,
  distance,
  lineIntersection,
  normalize,
  perp,
  projectOnSegment,
  scale,
  sub,
} from './vec';

/** Área con signo (fórmula de Gauss / shoelace). */
export function signedArea(points: readonly Vec2[]): number {
  let sum = 0;
  for (let i = 0, n = points.length; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export const polygonArea = (points: readonly Vec2[]): number => Math.abs(signedArea(points));

export function perimeter(points: readonly Vec2[]): number {
  let p = 0;
  for (let i = 0, n = points.length; i < n; i++) p += distance(points[i], points[(i + 1) % n]);
  return p;
}

export function centroid(points: readonly Vec2[]): Vec2 {
  const a = signedArea(points);
  if (Math.abs(a) < 1e-9) {
    const s = points.reduce((acc, p) => add(acc, p), { x: 0, y: 0 });
    return scale(s, 1 / Math.max(1, points.length));
  }
  let cx = 0;
  let cy = 0;
  for (let i = 0, n = points.length; i < n; i++) {
    const p = points[i];
    const q = points[(i + 1) % n];
    const f = p.x * q.y - q.x * p.y;
    cx += (p.x + q.x) * f;
    cy += (p.y + q.y) * f;
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

export function pointInPolygon(p: Vec2, points: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function bboxOf(points: readonly Vec2[]): BBox {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const p of points) {
    if (p.x < b.minX) b.minX = p.x;
    if (p.y < b.minY) b.minY = p.y;
    if (p.x > b.maxX) b.maxX = p.x;
    if (p.y > b.maxY) b.maxY = p.y;
  }
  return b;
}

export function mergeBBox(a: BBox | null, b: BBox): BBox {
  if (!a) return { ...b };
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/**
 * Punto adecuado para colocar la etiqueta de un polígono: el centroide si cae
 * dentro; si no (polígonos en L, U…), el centro del tramo interior más ancho
 * de una línea horizontal que pasa por el centroide.
 */
export function labelPoint(points: readonly Vec2[]): Vec2 {
  const c = centroid(points);
  if (pointInPolygon(c, points)) return c;
  const b = bboxOf(points);
  let best: Vec2 = c;
  let bestWidth = -1;
  for (let k = 1; k < 10; k++) {
    const y = b.minY + ((b.maxY - b.minY) * k) / 10;
    const xs: number[] = [];
    for (let i = 0, n = points.length; i < n; i++) {
      const a = points[i];
      const d = points[(i + 1) % n];
      if (a.y > y !== d.y > y) xs.push(a.x + ((y - a.y) * (d.x - a.x)) / (d.y - a.y));
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const w = xs[i + 1] - xs[i];
      if (w > bestWidth) {
        bestWidth = w;
        best = { x: (xs[i] + xs[i + 1]) / 2, y };
      }
    }
  }
  return best;
}

/**
 * Desplaza cada arista hacia el interior la distancia indicada (una por arista).
 * Requiere que el polígono no sea autointersecante.
 */
export function insetPolygon(points: readonly Vec2[], distances: readonly number[]): Vec2[] {
  const n = points.length;
  if (n < 3) return points.slice();
  const orientation = Math.sign(signedArea(points)) || 1;
  const lines = points.map((p, i) => {
    const q = points[(i + 1) % n];
    const d = normalize(sub(q, p));
    const inward = scale(perp(d), orientation);
    return { p: add(p, scale(inward, distances[i] ?? 0)), d };
  });
  return points.map((p, i) => {
    const prev = lines[(i - 1 + n) % n];
    const cur = lines[i];
    return lineIntersection(prev.p, prev.d, cur.p, cur.d) ?? cur.p;
  });
}

/** Elimina vértices duplicados consecutivos y vértices colineales. */
export function simplifyPolygon(points: readonly Vec2[], eps = 1e-6): Vec2[] {
  let pts = points.filter((p, i) => distance(p, points[(i + 1) % points.length]) > eps);
  let changed = true;
  while (changed && pts.length > 3) {
    changed = false;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i - 1 + pts.length) % pts.length];
      const b = pts[i];
      const c = pts[(i + 1) % pts.length];
      if (Math.abs(cross(sub(b, a), sub(c, b))) < eps && pts.length > 3) {
        pts = pts.filter((_, k) => k !== i);
        changed = true;
        break;
      }
    }
  }
  return pts;
}

/** Envolvente convexa (algoritmo de Andrew). */
export function convexHull(points: readonly Vec2[]): Vec2[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length <= 2) return pts;
  const lower: Vec2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(sub(lower[lower.length - 1], lower[lower.length - 2]), sub(p, lower[lower.length - 1])) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(sub(upper[upper.length - 1], upper[upper.length - 2]), sub(p, upper[upper.length - 1])) <= 0)
      upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** Punto más cercano del contorno del polígono a p. */
export function closestPointOnPolygon(p: Vec2, points: readonly Vec2[]): { point: Vec2; distance: number } {
  let best = { point: points[0], distance: Infinity };
  for (let i = 0, n = points.length; i < n; i++) {
    const pr = projectOnSegment(p, points[i], points[(i + 1) % n]);
    if (pr.distance < best.distance) best = { point: pr.point, distance: pr.distance };
  }
  return best;
}

/** Rectángulo orientado (centro, ancho en X local, fondo en Y local, rotación en radianes). */
export function orientedRect(center: Vec2, width: number, depth: number, rotationRad: number): Vec2[] {
  const c = Math.cos(rotationRad);
  const s = Math.sin(rotationRad);
  const hw = width / 2;
  const hd = depth / 2;
  return [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: hd },
    { x: -hw, y: hd },
  ].map((p) => ({ x: center.x + p.x * c - p.y * s, y: center.y + p.x * s + p.y * c }));
}

export function bboxIntersects(a: BBox, b: BBox): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

export function bboxContains(outer: BBox, inner: BBox): boolean {
  return inner.minX >= outer.minX && inner.maxX <= outer.maxX && inner.minY >= outer.minY && inner.maxY <= outer.maxY;
}
