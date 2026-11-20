/**
 * Texturas procedurales (sin ficheros externos): se generan en un canvas a
 * partir del patrón y del color elegido, son repetibles sin costuras y se
 * cachean. Cada textura cubre `tileSize` metros reales (las UV están en metros).
 *
 * Este módulo solo dibuja en canvas (no depende de three.js) para que las
 * miniaturas de materiales de la interfaz no arrastren el motor 3D al
 * paquete inicial. La conversión a texturas está en textures.ts.
 */
import { hexToRgb } from '@/core/color';
import type { MaterialDef, MaterialPattern } from './library';

const SIZE = 512;
/** Resolución de las texturas de madera (más detalle en suelos). */
const WOOD_SIZE = 1024;
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

/** Ruido periódico con distinto número de celdas en X e Y (vetas alargadas). */
function makeNoise2(seed: number, px: number, py: number) {
  const r = rng(seed);
  const grid = new Float32Array(px * py).map(() => r());
  const at = (x: number, y: number) => grid[(((y % py) + py) % py) * px + (((x % px) + px) % px)];
  return (u: number, v: number) => {
    const x = u * px;
    const y = v * py;
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

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const shade = (c: RGB, f: number): string => `rgb(${clamp255(c[0] * f)},${clamp255(c[1] * f)},${clamp255(c[2] * f)})`;

function canvas(size: number = SIZE) {
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
export interface Generated {
  color: HTMLCanvasElement;
  bump?: HTMLCanvasElement;
  bumpScale?: number;
}

/**
 * Tira de madera con veta realista (píxel a píxel): fibras alargadas, anillos
 * de crecimiento ondulados y poros. Se recorta para cada lama.
 */
const STRIP_W = 1024;
const STRIP_H = 160;
const stripCache = new Map<string, HTMLCanvasElement>();

function woodStrip(base: RGB, seed: number): HTMLCanvasElement {
  const key = `${base.join(',')}|${seed}`;
  const hit = stripCache.get(key);
  if (hit) return hit;
  const fibers = makeNoise2(seed, 8, 140);
  const fibers2 = makeNoise2(seed + 1, 40, 320);
  const warp = makeNoise2(seed + 2, 6, 4);
  const pores = makeNoise2(seed + 3, 260, 420);
  const blotch = makeNoise2(seed + 4, 5, 2);
  const c = document.createElement('canvas');
  c.width = STRIP_W;
  c.height = STRIP_H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(STRIP_W, STRIP_H);
  for (let y = 0; y < STRIP_H; y++) {
    const v = y / STRIP_H;
    for (let x = 0; x < STRIP_W; x++) {
      const u = x / STRIP_W;
      const w = warp(u, v);
      // Anillos finos casi paralelos a la lama, con una deriva suave.
      const ring = Math.sin((v * 13 + (w - 0.5) * 0.9 + Math.sin(u * Math.PI * 2 + v * 3) * 0.12) * Math.PI * 2);
      const late = Math.pow(Math.max(0, ring), 5) * 0.11;
      const f = fibers(u, v) * 0.55 + fibers2(u, v) * 0.45;
      const p = pores(u, v) > 0.86 ? 0.05 : 0;
      const k = (0.95 + (f - 0.5) * 0.16 - late - p) * (0.95 + blotch(u, v) * 0.1);
      const i = (y * STRIP_W + x) * 4;
      img.data[i] = clamp255(base[0] * k * (1 + late * 0.15));
      img.data[i + 1] = clamp255(base[1] * k);
      img.data[i + 2] = clamp255(base[2] * k * (1 - late * 0.25));
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  stripCache.set(key, c);
  return c;
}

/** Dibuja una lama recortando la tira de veta, con tono propio y biselado. */
function drawPlank(g: CanvasRenderingContext2D, strip: HTMLCanvasElement, x: number, y: number, w: number, h: number, r: () => number, vertical: boolean) {
  const len = vertical ? h : w;
  const wid = vertical ? w : h;
  const sw = Math.min(STRIP_W, len * (0.7 + r() * 0.5));
  const sh = Math.min(STRIP_H, Math.max(8, wid * (0.6 + r() * 0.5)));
  const sx = r() * (STRIP_W - sw);
  const sy = r() * (STRIP_H - sh);
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  if (vertical) {
    g.translate(x + w, y);
    g.rotate(Math.PI / 2);
    g.drawImage(strip, sx, sy, sw, sh, 0, 0, h, w);
  } else {
    if (r() < 0.5) {
      g.translate(x + w, y);
      g.scale(-1, 1);
      g.drawImage(strip, sx, sy, sw, sh, 0, 0, w, h);
    } else g.drawImage(strip, sx, sy, sw, sh, x, y, w, h);
  }
  g.restore();
  // Variación de tono entre lamas
  const t = r();
  g.fillStyle = t > 0.5 ? `rgba(255,240,220,${(t - 0.5) * 0.16})` : `rgba(40,20,5,${(0.5 - t) * 0.22})`;
  g.fillRect(x, y, w, h);
  // Biselado: luz arriba/izquierda, sombra abajo/derecha
  g.fillStyle = 'rgba(255,255,255,0.07)';
  g.fillRect(x, y, w, 2);
  g.fillRect(x, y, 2, h);
  g.fillStyle = 'rgba(0,0,0,0.16)';
  g.fillRect(x, y + h - 2, w, 2);
  g.fillRect(x + w - 2, y, 2, h);
}

function planks(base: RGB, seed: number, rows: number, cols: number, gap: number, stagger: boolean): Generated {
  const S = WOOD_SIZE;
  const { c, g } = canvas(S);
  const bump = canvas(S);
  bump.g.fillStyle = '#fff';
  bump.g.fillRect(0, 0, S, S);
  const strip = woodStrip(base, seed % 97);
  const r = rng(seed);
  const ph = S / rows;
  const pw = S / cols;
  for (let row = 0; row < rows; row++) {
    const offset = stagger ? (r() * 0.8 + 0.1) * pw : 0;
    const y = row * ph;
    for (let k = -1; k <= cols; k++) {
      const x = k * pw + offset;
      for (const dx of [0, -S]) {
        const px = x + dx;
        if (px > S || px + pw < 0) continue;
        drawPlank(g, strip, px, y, pw, ph, rng(seed + row * 131 + (((k % cols) + cols) % cols) * 17), false);
        // juntas
        g.fillStyle = shade(base, 0.38);
        g.fillRect(px, y, gap, ph);
        bump.g.fillStyle = '#222';
        bump.g.fillRect(px, y, gap, ph);
        bump.g.fillStyle = '#bbb';
        bump.g.fillRect(px + gap, y, 2, ph);
      }
    }
    g.fillStyle = shade(base, 0.38);
    g.fillRect(0, y, S, gap);
    bump.g.fillStyle = '#222';
    bump.g.fillRect(0, y, S, gap);
  }
  return { color: c, bump: bump.c, bumpScale: 1.4 };
}

function herringbone(base: RGB, seed: number): Generated {
  // Lamas de L = 4w; periodo del canvas = 8w (ver documentación de arquitectura).
  const S = WOOD_SIZE;
  const { c, g } = canvas(S);
  const bump = canvas(S);
  bump.g.fillStyle = '#fff';
  bump.g.fillRect(0, 0, S, S);
  const w = S / 8;
  const L = 4 * w;
  const strip = woodStrip(base, seed % 97);
  const plank = (x: number, y: number, pw: number, ph: number, vertical: boolean, id: number) => {
    for (const ox of [-S, 0, S])
      for (const oy of [-S, 0, S]) {
        const px = x + ox;
        const py = y + oy;
        if (px > S || py > S || px + pw < 0 || py + ph < 0) continue;
        drawPlank(g, strip, px, py, pw, ph, rng(seed + id * 7919), vertical);
        g.strokeStyle = shade(base, 0.4);
        g.lineWidth = 2;
        g.strokeRect(px, py, pw, ph);
        bump.g.strokeStyle = '#222';
        bump.g.lineWidth = 2.5;
        bump.g.strokeRect(px, py, pw, ph);
      }
  };
  for (let m = -3; m <= 3; m++) {
    for (let k = -12; k <= 12; k++) {
      const ox = m * L;
      const oy = -m * L;
      // (m, k) y (m±1, k+4) son la misma lama en la repetición: id invariante.
      const id = ((((k + 4 * m) % 8) + 8) % 8) * 2;
      plank(ox + k * w, oy + k * w, L, w, false, id);
      plank(ox + k * w + L, oy + k * w + w - L, w, L, true, id + 1);
    }
  }
  return { color: c, bump: bump.c, bumpScale: 1.4 };
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
  const S = WOOD_SIZE;
  const { c, g } = canvas(S);
  const strip = woodStrip(base, seed % 97);
  const r = rng(seed);
  if (panels) {
    const count = 6;
    const pw = S / count;
    for (let i = 0; i < count; i++) {
      drawPlank(g, strip, i * pw, 0, pw, S, rng(seed + i * 31), true);
      g.fillStyle = shade(base, 0.45);
      g.fillRect(i * pw, 0, 4, S);
    }
  } else {
    // Tablero continuo: varias tiras apiladas sin juntas marcadas.
    const rows = 4;
    for (let i = 0; i < rows; i++) {
      g.drawImage(strip, r() * (STRIP_W / 3), 0, STRIP_W * 0.66, STRIP_H, 0, (S / rows) * i, S, S / rows + 1);
    }
  }
  const bump = canvas(S);
  bump.g.drawImage(c, 0, 0);
  return { color: c, bump: bump.c, bumpScale: 0.5 };
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

const cache = new Map<string, Generated | null>();

/** Lienzos generados (color y relieve) para un material y color; cacheados. */
export function getPattern(def: MaterialDef, color: string): Generated | null {
  const key = `${def.id}|${color}`;
  if (cache.has(key)) return cache.get(key)!;
  let gen: Generated | null = null;
  try {
    gen = typeof document !== 'undefined' ? generate(def, color) : null;
  } catch (err) {
    console.warn('No se pudo generar la textura', def.id, err);
  }
  cache.set(key, gen);
  return gen;
}

/** Lienzo de color generado (para miniaturas de la interfaz). */
export function getPatternCanvas(def: MaterialDef, color: string): HTMLCanvasElement | null {
  return getPattern(def, color)?.color ?? null;
}
