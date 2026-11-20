/**
 * Utilidades de vectores 2D. Todas las coordenadas del plano están en metros:
 * x hacia la derecha (este) e y hacia abajo (sur).
 */
export interface Vec2 {
  x: number;
  y: number;
}

export const EPS = 1e-9;

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;
export const length = (a: Vec2): number => Math.hypot(a.x, a.y);
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const midpoint = (a: Vec2, b: Vec2): Vec2 => lerp(a, b, 0.5);
/** Perpendicular (rotación de 90° en el sentido matemático positivo). */
export const perp = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });
export const negate = (a: Vec2): Vec2 => ({ x: -a.x, y: -a.y });
export const angleOf = (a: Vec2): number => Math.atan2(a.y, a.x);
export const fromAngle = (rad: number, len = 1): Vec2 => ({ x: Math.cos(rad) * len, y: Math.sin(rad) * len });

export function normalize(a: Vec2): Vec2 {
  const l = length(a);
  return l < EPS ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

export function rotate(p: Vec2, rad: number, origin: Vec2 = { x: 0, y: 0 }): Vec2 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return { x: origin.x + dx * c - dy * s, y: origin.y + dx * s + dy * c };
}

export const almostEqual = (a: Vec2, b: Vec2, eps = 1e-4): boolean =>
  Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;

export const roundTo = (value: number, step: number): number => Math.round(value / step) * step;

/** Redondea a 4 decimales (0,1 mm) para evitar acumulación de errores de coma flotante. */
export const clean = (n: number): number => Math.round(n * 10000) / 10000;
export const cleanVec = (p: Vec2): Vec2 => ({ x: clean(p.x), y: clean(p.y) });

export interface SegmentProjection {
  /** Parámetro 0..1 sobre el segmento (sin recortar si clamp = false). */
  t: number;
  point: Vec2;
  distance: number;
}

/** Proyecta p sobre el segmento ab. */
export function projectOnSegment(p: Vec2, a: Vec2, b: Vec2, clamp = true): SegmentProjection {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  let t = l2 < EPS ? 0 : dot(sub(p, a), ab) / l2;
  if (clamp) t = Math.max(0, Math.min(1, t));
  const point = add(a, scale(ab, t));
  return { t, point, distance: distance(p, point) };
}

/** Intersección de dos rectas infinitas p + s·d y q + u·e. */
export function lineIntersection(p: Vec2, d: Vec2, q: Vec2, e: Vec2): Vec2 | null {
  const den = cross(d, e);
  if (Math.abs(den) < 1e-10) return null;
  const s = cross(sub(q, p), e) / den;
  return add(p, scale(d, s));
}

export interface SegmentHit {
  t: number;
  u: number;
  point: Vec2;
}

/** Intersección de los segmentos ab y cd (incluye extremos, con tolerancia). */
export function segmentIntersection(a: Vec2, b: Vec2, c: Vec2, d: Vec2, eps = 1e-7): SegmentHit | null {
  const r = sub(b, a);
  const s = sub(d, c);
  const den = cross(r, s);
  if (Math.abs(den) < 1e-12) return null;
  const qp = sub(c, a);
  const t = cross(qp, s) / den;
  const u = cross(qp, r) / den;
  if (t < -eps || t > 1 + eps || u < -eps || u > 1 + eps) return null;
  return { t: Math.max(0, Math.min(1, t)), u: Math.max(0, Math.min(1, u)), point: add(a, scale(r, t)) };
}

export function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  return projectOnSegment(p, a, b).distance;
}
