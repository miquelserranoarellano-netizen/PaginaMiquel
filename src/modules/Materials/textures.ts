/**
 * Texturas procedurales (sin ficheros externos): se generan en un canvas a
 * partir del patrón y del color elegido, son repetibles sin costuras y se
 * cachean. Cada textura cubre `tileSize` metros reales (las UV están en metros).
 */
import { CanvasTexture, LinearSRGBColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { hexToRgb } from '@/core/color';
import type { MaterialDef, MaterialPattern } from './library';

export interface MaterialMaps {
  map?: Texture;
  bumpMap?: Texture;
  bumpScale?: number;
  roughnessMap?: Texture;
}

const SIZE = 512;
type RGB = [number, number, number];

// ── Utilidades ─────────────────────────────────────────────────────────────
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Ruido de valor periódico (se repite cada `period` celdas). */
function makeNoise(seed: number, period: number) {
  const r = rng(seed);
  const grid = new Float32Array(period * period).map(() => r());
  const at = (x: number, y: number) => grid[((y % period) + period) % period * period + (((x % period) + period) % period)];
  return (u: number, v: number) => {
    const x = u * period;
    const y = v * period;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const sx = xf * xf * (3 - 2 * xf);
    const sy = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * sx;
    const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * sx;
    return a + (b - a) * sy;
  };
}

function fbm(seed: number, basePeriod: number, octaves: number) {
  const layers = Array.from({ length: octaves }, (_, i) => makeNoise(seed + i * 97, basePeriod * 2 ** i));
  return (u: number, v: number) => {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    for (const n of layers) {
      sum += n(u, v) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return sum / norm;
  };
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const shade = (c: RGB, f: number): string => `rgb(${clamp255(c[0] * f)},${clamp255(c[1] * f)},${clamp255(c[2] * f)})`;

function canvas(size = SIZE) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return { c, g: c.getContext('2d')! };
}

/** Rellena píxel a píxel: fn(u, v) devuelve [r,g,b] y altura 0..1. */
function pixels(fn: (u: number, v: number) => [number, number, number, number], size = SIZE) {
  const col = canvas(size);
  const bump = canvas(size);
  const img = col.g.createImageData(size, size);
  const bimg = bump.g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, h] = fn(x / size, y / size);
      const i = (y * size + x) * 4;
      img.data[i] = clamp255(r);
      img.data[i + 1] = clamp255(g);
      img.data[i + 2] = clamp255(b);
      img.data[i + 3] = 255;
      const hv = clamp255(h * 255);
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = hv;
      bimg.data[i + 3] = 255;
    }
  }
  col.g.putImageData(img, 0, 0);
  bump.g.putImageData(bimg, 0, 0);
  return { color: col.c, bump: bump.c };
}

// ── Patrones ───────────────────────────────────────────────────────────────
interface Generated {
  color: HTMLCanvasElement;
  bump?: HTMLCanvasElement;
  bumpScale?: number;
}

function woodGrain(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, base: RGB, r: () => number, alongX = true) {
  const tint = 0.86 + r() * 0.24;
  g.fillStyle = shade(base, tint);
  g.fillRect(x, y, w, h);
  const lines = Math.round((alongX ? h : w) / 2.2);
  for (let i = 0; i < lines; i++) {
    g.strokeStyle = shade(base, tint * (0.78 + r() * 0.3));
    g.globalAlpha = 0.18 + r() * 0.25;
    g.lineWidth = 0.6 + r() * 1.4;
    g.beginPath();
    if (alongX) {
      const yy = y + r() * h;
      g.moveTo(x, yy);
      const amp = 1 + r() * 2.5;
      for (let k = 0; k <= 8; k++) g.lineTo(x + (w * k) / 8, yy + Math.sin(k * 0.9 + r() * 6) * amp);
    } else {
      const xx = x + r() * w;
      g.moveTo(xx, y);
      const amp = 1 + r() * 2.5;
      for (let k = 0; k <= 8; k++) g.lineTo(xx + Math.sin(k * 0.9 + r() * 6) * amp, y + (h * k) / 8);
    }
    g.stroke();
  }
  // nudos ocasionales
  if (r() < 0.25) {
    g.globalAlpha = 0.35;
    g.fillStyle = shade(base, tint * 0.6);
    g.beginPath();
    g.ellipse(x + r() * w, y + r() * h, 2 + r() * 5, 1.5 + r() * 2.5, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}

function planks(base: RGB, seed: number, rows: number, cols: number, gap: number, stagger: boolean): Generated {
  const { c, g } = canvas();
  const bump = canvas();
  bump.g.fillStyle = '#fff';
  bump.g.fillRect(0, 0, SIZE, SIZE);
  const r = rng(seed);
  const ph = SIZE / rows;
  const pw = SIZE / cols;
  for (let row = 0; row < rows; row++) {
    const offset = stagger ? Math.floor(r() * cols) * pw * 0.5 + (row % 2) * pw * 0.37 : 0;
    for (let k = -1; k <= cols; k++) {
      const x = ((k * pw + offset) % SIZE + SIZE) % SIZE - pw;
      for (const dx of [0, SIZE]) {
        woodGrain(g, x + dx, row * ph, pw, ph, base, rng(seed + row * 131 + ((k + cols) % cols) * 17));
      }
      // juntas
      for (const dx of [0, SIZE]) {
        g.fillStyle = shade(base, 0.45);
        g.fillRect(x + dx, row * ph, gap, ph);
        bump.g.fillStyle = '#333';
        bump.g.fillRect(x + dx, row * ph, gap, ph);
      }
    }
    g.fillStyle = shade(base, 0.45);
    g.fillRect(0, row * ph, SIZE, gap);
    bump.g.fillStyle = '#333';
    bump.g.fillRect(0, row * ph, SIZE, gap);
  }
  return { color: c, bump: bump.c, bumpScale: 1.2 };
}

function herringbone(base: RGB, seed: number): Generated {
  // Lamas de L = 4w; periodo del canvas = 8w (ver documentación de arquitectura).
  const { c, g } = canvas();
  const bump = canvas();
  bump.g.fillStyle = '#fff';
  bump.g.fillRect(0, 0, SIZE, SIZE);
  const w = SIZE / 8;
  const L = 4 * w;
  const r = rng(seed);
  const plank = (x: number, y: number, pw: number, ph: number, alongX: boolean) => {
    for (const ox of [-SIZE, 0, SIZE])
      for (const oy of [-SIZE, 0, SIZE]) {
        const px = x + ox;
        const py = y + oy;
        if (px > SIZE || py > SIZE || px + pw < 0 || py + ph < 0) continue;
        woodGrain(g, px, py, pw, ph, base, rng(Math.floor(r() * 1e6)), alongX);
        g.strokeStyle = shade(base, 0.45);
        g.lineWidth = 2;
        g.strokeRect(px, py, pw, ph);
        bump.g.strokeStyle = '#333';
        bump.g.lineWidth = 2;
        bump.g.strokeRect(px, py, pw, ph);
      }
  };
  for (let m = -3; m <= 3; m++) {
    for (let k = -12; k <= 12; k++) {
      const ox = m * L;
      const oy = -m * L;
      plank(ox + k * w, oy + k * w, L, w, true);
      plank(ox + k * w + L, oy + k * w + w - L, w, L, false);
    }
  }
  return { color: c, bump: bump.c, bumpScale: 1.2 };
}

function marble(base: RGB, vein: RGB, seed: number): Generated {
  const n = fbm(seed, 4, 5);
  const n2 = fbm(seed + 7, 8, 3);
  return pixels((u, v) => {
    const t = n(u, v);
    const s = Math.sin((u * 2 + v * 3 + t * 6) * Math.PI * 2);
    const veinAmt = Math.pow(1 - Math.abs(s), 14) * 0.85 + Math.pow(1 - Math.abs(Math.sin((u * 3 - v + n2(u, v) * 4) * Math.PI * 2)), 30) * 0.5;
    const cloud = 0.94 + (n2(u, v) - 0.5) * 0.12;
    const k = Math.min(1, veinAmt);
    // juntas de losa 60×60 (2×2 por textura)
    const edge = Math.min(u % 0.5, 0.5 - (u % 0.5), v % 0.5, 0.5 - (v % 0.5)) < 0.0025;
    const f = edge ? 0.88 : 1;
    return [(base[0] * cloud * (1 - k) + vein[0] * k) * f, (base[1] * cloud * (1 - k) + vein[1] * k) * f, (base[2] * cloud * (1 - k) + vein[2] * k) * f, edge ? 0.2 : 1];
  });
}

function tiles(base: RGB, grout: RGB, seed: number, count: number, groutPx: number): Generated {
  const n = fbm(seed, 8, 3);
  const r = rng(seed);
  const tint = Array.from({ length: count * count }, () => 0.95 + r() * 0.1);
  const cell = SIZE / count;
  return pixels((u, v) => {
    const x = u * SIZE;
    const y = v * SIZE;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    const lx = x - cx * cell;
    const ly = y - cy * cell;
    const g = lx < groutPx / 2 || ly < groutPx / 2 || lx > cell - groutPx / 2 || ly > cell - groutPx / 2;
    if (g) return [grout[0], grout[1], grout[2], 0.1];
    const f = tint[cy * count + cx] * (0.97 + (n(u, v) - 0.5) * 0.08);
    return [base[0] * f, base[1] * f, base[2] * f, 1];
  });
}

function hydraulic(base: RGB, motif: RGB, seed: number): Generated {
  const n = fbm(seed, 8, 2);
  return pixels((u, v) => {
    const lu = (u * 2) % 1;
    const lv = (v * 2) % 1;
    const dx = lu - 0.5;
    const dy = lv - 0.5;
    const d = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    const petal = Math.abs(Math.cos(ang * 4)) * 0.22 + 0.12;
    const corner = Math.min(Math.hypot(lu, lv), Math.hypot(1 - lu, lv), Math.hypot(lu, 1 - lv), Math.hypot(1 - lu, 1 - lv));
    const isMotif = d < petal || (corner < 0.22 && corner > 0.14) || Math.abs(d - 0.36) < 0.02;
    const edge = Math.min(lu, 1 - lu, lv, 1 - lv) < 0.006;
    const f = 0.96 + (n(u, v) - 0.5) * 0.08;
    const c = isMotif ? motif : base;
    return [c[0] * f * (edge ? 0.8 : 1), c[1] * f * (edge ? 0.8 : 1), c[2] * f * (edge ? 0.8 : 1), edge ? 0.2 : 1];
  });
}

function concrete(base: RGB, seed: number, rough: boolean): Generated {
  const n = fbm(seed, 4, 6);
  const speck = makeNoise(seed + 3, 128);
  return pixels((u, v) => {
    const t = n(u, v);
    const s = speck(u, v);
    const f = 0.9 + (t - 0.5) * 0.28 + (s > 0.92 ? -0.12 : s < 0.05 ? 0.06 : 0);
    return [base[0] * f, base[1] * f, base[2] * f, rough ? t : 0.5 + t * 0.2];
  });
}

function plaster(base: RGB, seed: number): Generated {
  const n = fbm(seed, 3, 5);
  return pixels((u, v) => {
    const f = 0.96 + (n(u, v) - 0.5) * 0.1;
    return [base[0] * f, base[1] * f, base[2] * f, n(u, v)];
  });
}

function brick(base: RGB, mortar: RGB, seed: number): Generated {
  const rows = 14;
  const cols = 4;
  const n = fbm(seed, 16, 3);
  const r = rng(seed);
  const tint = Array.from({ length: rows * cols * 2 }, () => 0.8 + r() * 0.35);
  const mh = 0.012 * SIZE;
  return pixels((u, v) => {
    const y = v * rows;
    const row = Math.floor(y);
    const off = row % 2 ? 0.5 : 0;
    const x = u * cols + off;
    const col = Math.floor(x);
    const ly = (y - row) * (SIZE / rows);
    const lx = (x - col) * (SIZE / cols);
    if (ly < mh || lx < mh) return [mortar[0], mortar[1], mortar[2], 0.15];
    const f = tint[(row * cols + (col % cols)) % tint.length] * (0.93 + (n(u, v) - 0.5) * 0.2);
    return [base[0] * f, base[1] * f, base[2] * f, 0.8 + n(u, v) * 0.2];
  });
}

/** Piedra irregular (Voronoi periódico). */
function stone(base: RGB, seed: number, cells: number): Generated {
  const r = rng(seed);
  const grid = cells;
  const pts: { x: number; y: number; t: number }[][] = [];
  for (let i = 0; i < grid * grid; i++) pts.push([{ x: (i % grid + 0.15 + r() * 0.7) / grid, y: (Math.floor(i / grid) + 0.15 + r() * 0.7) / grid, t: 0.78 + r() * 0.4 }]);
  const n = fbm(seed, 8, 3);
  return pixels((u, v) => {
    const gx = Math.floor(u * grid);
    const gy = Math.floor(v * grid);
    let d1 = 9;
    let d2 = 9;
    let tint = 1;
    for (let oy = -1; oy <= 1; oy++)
      for (let ox = -1; ox <= 1; ox++) {
        const cx = gx + ox;
        const cy = gy + oy;
        const wx = ((cx % grid) + grid) % grid;
        const wy = ((cy % grid) + grid) % grid;
        const p = pts[wy * grid + wx][0];
        const px = p.x + (cx - wx) / grid;
        const py = p.y + (cy - wy) / grid;
        const d = Math.hypot(u - px, v - py);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          tint = p.t;
        } else if (d < d2) d2 = d;
      }
    const border = (d2 - d1) * grid;
    const f = (border < 0.06 ? 0.45 : tint) * (0.92 + (n(u, v) - 0.5) * 0.25);
    return [base[0] * f, base[1] * f, base[2] * f, border < 0.06 ? 0.1 : 0.7 + n(u, v) * 0.3];
  });
}

function wood(base: RGB, seed: number, panels: boolean): Generated {
  const { c, g } = canvas();
  const r = rng(seed);
  if (panels) {
    const count = 6;
    const pw = SIZE / count;
    for (let i = 0; i < count; i++) {
      woodGrain(g, i * pw, 0, pw, SIZE, base, rng(seed + i * 31), false);
      g.fillStyle = shade(base, 0.5);
      g.fillRect(i * pw, 0, 3, SIZE);
    }
  } else {
    woodGrain(g, 0, 0, SIZE, SIZE, base, r);
    for (let i = 0; i < 40; i++) woodGrain(g, 0, r() * SIZE, SIZE, 6 + r() * 20, base, rng(seed + i), true);
  }
  const bump = canvas();
  bump.g.drawImage(c, 0, 0);
  return { color: c, bump: bump.c, bumpScale: 0.4 };
}

function grass(base: RGB, seed: number): Generated {
  const n = fbm(seed, 4, 5);
  const blades = makeNoise(seed + 9, 256);
  return pixels((u, v) => {
    const t = n(u, v);
    const b = blades(u, v);
    const f = 0.78 + t * 0.4 + (b - 0.5) * 0.25;
    return [base[0] * f * (0.95 + b * 0.1), base[1] * f, base[2] * f * 0.9, b];
  });
}

function gravel(base: RGB, seed: number): Generated {
  const { c, g } = canvas();
  const r = rng(seed);
  g.fillStyle = shade(base, 0.7);
  g.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 2600; i++) {
    const x = r() * SIZE;
    const y = r() * SIZE;
    const rad = 2 + r() * 5;
    g.fillStyle = shade(base, 0.75 + r() * 0.45);
    for (const ox of [-SIZE, 0, SIZE])
      for (const oy of [-SIZE, 0, SIZE]) {
        g.beginPath();
        g.ellipse(x + ox, y + oy, rad, rad * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2);
        g.fill();
      }
  }
  return { color: c, bump: c, bumpScale: 2 };
}

function fabric(base: RGB, seed: number): Generated {
  const n = fbm(seed, 8, 3);
  return pixels((u, v) => {
    const wx = Math.sin(u * SIZE * Math.PI * 0.5) * 0.5 + 0.5;
    const wy = Math.sin(v * SIZE * Math.PI * 0.5) * 0.5 + 0.5;
    const f = 0.9 + (wx * wy) * 0.12 + (n(u, v) - 0.5) * 0.08;
    return [base[0] * f, base[1] * f, base[2] * f, wx * wy];
  });
}

function brushed(base: RGB, seed: number): Generated {
  const n = makeNoise(seed, 256);
  return pixels((u, v) => {
    const f = 0.94 + (n(u * 0.02, v) - 0.5) * 0.12;
    return [base[0] * f, base[1] * f, base[2] * f, 0.5];
  });
}

// ── API ────────────────────────────────────────────────────────────────────
const NO_MAP: ReadonlySet<MaterialPattern> = new Set(['paint', 'plain', 'glass', 'emissive', 'water']);

function generate(def: MaterialDef, color: string): Generated | null {
  if (NO_MAP.has(def.pattern)) return null;
  const base = hexToRgb(color);
  const c2 = hexToRgb(def.color2 ?? '#cccccc');
  const seed = hashString(def.id);
  switch (def.pattern) {
    case 'parquet':
      return planks(base, seed, 8, 2, 2, true);
    case 'deck':
      return planks(base, seed, 9, 1, 5, false);
    case 'herringbone':
      return herringbone(base, seed);
    case 'marble':
      return marble(base, c2, seed);
    case 'tiles':
      return tiles(base, c2, seed, 2, 4);
    case 'smalltiles':
      return tiles(base, c2, seed, 4, 5);
    case 'hydraulic':
      return hydraulic(base, c2, seed);
    case 'concrete':
      return concrete(base, seed, def.categories.includes('exterior'));
    case 'plaster':
      return plaster(base, seed);
    case 'brick':
      return brick(base, c2, seed);
    case 'stone':
      return stone(base, seed, def.id === 'piedra' ? 6 : 3);
    case 'wood':
      return wood(base, seed, false);
    case 'panels':
      return wood(base, seed, true);
    case 'grass':
      return grass(base, seed);
    case 'gravel':
      return gravel(base, seed);
    case 'fabric':
      return fabric(base, seed);
    case 'metal':
      return brushed(base, seed);
    default:
      return null;
  }
}

const cache = new Map<string, { gen: Generated | null; maps: MaterialMaps }>();

function toTexture(img: HTMLCanvasElement, def: MaterialDef, srgb: boolean): Texture {
  const t = new CanvasTexture(img);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(1 / def.tileSize, 1 / def.tileSize);
  t.colorSpace = srgb ? SRGBColorSpace : LinearSRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

function entry(def: MaterialDef, color: string) {
  const key = `${def.id}|${color}`;
  let e = cache.get(key);
  if (!e) {
    let gen: Generated | null = null;
    try {
      gen = typeof document !== 'undefined' ? generate(def, color) : null;
    } catch (err) {
      console.warn('No se pudo generar la textura', def.id, err);
    }
    const maps: MaterialMaps = {};
    if (gen) {
      maps.map = toTexture(gen.color, def, true);
      if (gen.bump) {
        maps.bumpMap = toTexture(gen.bump, def, false);
        maps.bumpScale = gen.bumpScale ?? 1;
      }
    }
    e = { gen, maps };
    cache.set(key, e);
  }
  return e;
}

export function getMaterialMaps(def: MaterialDef, color: string): MaterialMaps {
  return entry(def, color).maps;
}

/** Lienzo de color generado (para miniaturas de la interfaz). */
export function getPatternCanvas(def: MaterialDef, color: string): HTMLCanvasElement | null {
  return entry(def, color).gen?.color ?? null;
}
