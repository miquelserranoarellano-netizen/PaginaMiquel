/**
 * Piezas y constructores comunes del catálogo de muebles.
 * Coordenadas locales: x = ancho, y = alto (desde el suelo), z = fondo (+z = frente).
 */
import type { MaterialSlot, ParamValues, Part } from '../types';
import { SHELF_T, pbool, pint, pnum } from '../params';

export type V3 = [number, number, number];
export const H = Math.PI / 2;

/** Caja apoyada: (x, y inferior, z) y dimensiones (ancho, alto, fondo). */
export const B = (x: number, y0: number, z: number, w: number, h: number, d: number, m: string, r?: V3): Part => ({ s: 'box', p: [x, y0 + h / 2, z], d: [w, h, d], m, r });
export const R = (x: number, y0: number, z: number, w: number, h: number, d: number, m: string, radius = 0.04, r?: V3): Part => ({ s: 'rbox', p: [x, y0 + h / 2, z], d: [w, h, d], m, radius, r });
/** Cilindro vertical apoyado (diámetros X/Z). */
export const C = (x: number, y0: number, z: number, dx: number, h: number, dz: number, m: string, r?: V3): Part => ({ s: 'cyl', p: [x, y0 + h / 2, z], d: [dx, h, dz], m, r });
/** Cilindro centrado (para piezas giradas). */
export const Cc = (x: number, y: number, z: number, dx: number, h: number, dz: number, m: string, r?: V3): Part => ({ s: 'cyl', p: [x, y, z], d: [dx, h, dz], m, r });
export const K = (x: number, y0: number, z: number, dx: number, h: number, dz: number, m: string): Part => ({ s: 'cone', p: [x, y0 + h / 2, z], d: [dx, h, dz], m });
export const S = (x: number, y: number, z: number, dx: number, dy: number, dz: number, m: string): Part => ({ s: 'sphere', p: [x, y, z], d: [dx, dy, dz], m });

export const slot = (label: string, materialId: string, color: string): MaterialSlot => ({ label, materialId, color });
export const FABRIC = (color = '#8d9095') => slot('Tapicería', 'tela', color);
export const WOOD = (color = '#b98a59', id = 'madera-roble') => slot('Madera', id, color);
export const METAL = (color = '#2a2a2c', id = 'metal-negro') => slot('Metal', id, color);
export const LACQ = (color = '#f4f4f1', label = 'Acabado') => slot(label, 'lacado', color);
export const LIGHT = () => slot('Luz', 'luz', '#fff1d6');
export const GLASS = () => slot('Vidrio', 'vidrio', '#cfe5ee');
export const PORC = () => slot('Porcelana', 'porcelana', '#fbfbfa');
export const CHROME = () => slot('Grifería', 'cromo', '#e3e6e9');
export const SCREEN = () => slot('Pantalla', 'pantalla', '#0c0e12');

/** Cuatro patas en las esquinas. */
export function legs(w: number, d: number, h: number, size: number, m: string, inset = 0.04, round = false): Part[] {
  const xs = [-w / 2 + inset + size / 2, w / 2 - inset - size / 2];
  const zs = [-d / 2 + inset + size / 2, d / 2 - inset - size / 2];
  const out: Part[] = [];
  for (const x of xs) for (const z of zs) out.push(round ? C(x, 0, z, size, h, size, m) : B(x, 0, z, size, h, size, m));
  return out;
}

export function sofa(w: number, d: number, h: number, seats: number): Part[] {
  const arm = Math.min(0.2, w * 0.12);
  const legH = 0.1;
  const baseH = 0.3;
  const backD = Math.min(0.22, d * 0.25);
  const inner = w - arm * 2;
  const parts: Part[] = [
    R(0, legH, 0, w, baseH, d, 'primary', 0.03),
    R(0, legH, -d / 2 + backD / 2, w, h - legH, backD, 'primary', 0.05),
    R(-w / 2 + arm / 2, legH, 0.01, arm, Math.min(h, 0.62) - legH, d - 0.02, 'primary', 0.05),
    R(w / 2 - arm / 2, legH, 0.01, arm, Math.min(h, 0.62) - legH, d - 0.02, 'primary', 0.05),
    ...legs(w, d, legH, 0.05, 'secondary', 0.06, true),
  ];
  const cw = inner / seats;
  for (let i = 0; i < seats; i++) {
    const x = -inner / 2 + cw * (i + 0.5);
    parts.push(R(x, legH + baseH, backD / 2, cw - 0.02, 0.14, d - backD - 0.02, 'primary', 0.05));
    parts.push(R(x, legH + baseH + 0.1, -d / 2 + backD + 0.08, cw - 0.04, Math.max(0.2, h - legH - baseH - 0.14), 0.16, 'primary', 0.06, [-0.12, 0, 0]));
  }
  return parts;
}

export function bed(w: number, d: number, h: number): Part[] {
  const frameH = 0.32;
  const mattH = 0.24;
  const head = 0.08;
  const pillows = w > 1.2 ? 2 : 1;
  const parts: Part[] = [
    R(0, 0.06, head / 2, w, frameH - 0.06, d - head, 'secondary', 0.02),
    R(0, 0, -d / 2 + head / 2, w + 0.04, h, head, 'secondary', 0.02),
    ...legs(w, d - head, 0.06, 0.06, 'secondary', 0.03).map((p) => ({ ...p, p: [p.p[0], p.p[1], p.p[2] + head / 2] as V3 })),
    R(0, frameH, head / 2 + 0.01, w - 0.06, mattH, d - head - 0.04, 'mattress', 0.05),
    R(0, frameH + mattH - 0.03, head / 2 + (d - head) * 0.18, w - 0.02, 0.08, (d - head) * 0.66, 'primary', 0.04),
  ];
  const pw = (w - 0.2) / pillows;
  for (let i = 0; i < pillows; i++) {
    parts.push(R(-((w - 0.2) / 2) + pw * (i + 0.5), frameH + mattH, -d / 2 + head + 0.22, pw - 0.06, 0.12, 0.36, 'mattress', 0.05));
  }
  return parts;
}

export function wardrobe(w: number, d: number, h: number, doors: number): Part[] {
  const parts: Part[] = [B(0, 0.05, 0, w, h - 0.05, d - 0.02, 'primary'), B(0, 0, -0.01, w - 0.04, 0.05, d - 0.06, 'primary')];
  const dw = w / doors;
  for (let i = 0; i < doors; i++) {
    const x = -w / 2 + dw * (i + 0.5);
    parts.push(B(x, 0.06, d / 2 - 0.01, dw - 0.006, h - 0.07, 0.02, 'primary'));
    const hx = i % 2 === 0 ? x + dw / 2 - 0.06 : x - dw / 2 + 0.06;
    parts.push(B(hx, h * 0.45, d / 2 + 0.01, 0.02, 0.3, 0.025, 'secondary'));
  }
  return parts;
}

export function drawers(w: number, d: number, h: number, rows: number, cols: number, y0 = 0.08): Part[] {
  const parts: Part[] = [B(0, y0, 0, w, h - y0, d - 0.02, 'primary')];
  const rh = (h - y0) / rows;
  const cw = w / cols;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + cw * (c + 0.5);
      const y = y0 + rh * r;
      parts.push(B(x, y + 0.004, d / 2 - 0.01, cw - 0.008, rh - 0.008, 0.02, 'primary'));
      parts.push(B(x, y + rh / 2 - 0.01, d / 2 + 0.008, Math.min(0.2, cw * 0.4), 0.02, 0.02, 'secondary'));
    }
  return parts;
}

export function kitchenBase(w: number, d: number, h: number, extra: Part[] = [], doors = Math.max(1, Math.round(w / 0.6))): Part[] {
  const top = 0.03;
  const plinth = 0.1;
  const parts: Part[] = [B(0, 0, -0.03, w, plinth, d - 0.1, 'black'), B(0, plinth, -0.01, w, h - top - plinth, d - 0.04, 'primary'), B(0, h - top, 0, w, top, d, 'top')];
  const dw = w / doors;
  for (let i = 0; i < doors; i++) {
    const x = -w / 2 + dw * (i + 0.5);
    parts.push(B(x, plinth + 0.004, d / 2 - 0.02, dw - 0.006, h - top - plinth - 0.01, 0.02, 'primary'));
    parts.push(B(x, h - top - 0.06, d / 2 + 0.002, dw * 0.5, 0.015, 0.02, 'metal'));
  }
  return parts.concat(extra);
}

export function plantParts(w: number, h: number, potH: number): Part[] {
  const potD = Math.min(w * 0.55, 0.45);
  return [
    C(0, 0, 0, potD, potH, potD, 'secondary'),
    C(0, potH - 0.03, 0, potD * 0.9, 0.03, potD * 0.9, 'soil'),
    C(0, potH, 0, 0.03, (h - potH) * 0.5, 0.03, 'trunk'),
    S(0, potH + (h - potH) * 0.55, 0, w * 0.8, (h - potH) * 0.65, w * 0.8, 'primary'),
    S(w * 0.15, potH + (h - potH) * 0.75, -w * 0.08, w * 0.55, (h - potH) * 0.45, w * 0.55, 'primary'),
    S(-w * 0.14, potH + (h - potH) * 0.4, w * 0.1, w * 0.5, (h - potH) * 0.4, w * 0.5, 'primary'),
  ];
}

export function books(w: number, y: number, z: number, depth: number, height: number, seed: number): Part[] {
  const parts: Part[] = [];
  let x = -w / 2 + 0.03;
  let k = seed;
  while (x < w / 2 - 0.08) {
    k = (k * 9301 + 49297) % 233280;
    const bw = 0.025 + (k / 233280) * 0.03;
    const bh = height * (0.7 + ((k * 7) % 100) / 400);
    const slotName = ['book1', 'book2', 'book3'][k % 3];
    parts.push({ ...B(x + bw / 2, y, z, bw, bh, depth, slotName), noPlan: true });
    x += bw + 0.004;
    if (k % 5 === 0) x += 0.08;
  }
  return parts;
}

/** Estantería con baldas y módulos configurables. */
export function shelving(w: number, d: number, h: number, p: ParamValues): Part[] {
  const t = SHELF_T;
  const levels = pint(p, 'levels', 5, 1, 12);
  const columns = pint(p, 'columns', 1, 1, 8);
  const withBooks = pbool(p, 'books', true);
  const parts: Part[] = [];
  if (pbool(p, 'back', true)) parts.push(B(0, 0, -d / 2 + 0.005, w, h, 0.01, 'primary'));
  const cw = (w - t * (columns + 1)) / columns;
  for (let c = 0; c <= columns; c++) parts.push(B(-w / 2 + t / 2 + c * (cw + t), 0, 0, t, h, d, 'primary'));
  const ch = (h - t * (levels + 1)) / levels;
  for (let i = 0; i <= levels; i++) {
    const y = i * (ch + t);
    parts.push(B(0, y, 0, w - 2 * t, t, d, 'primary'));
    if (i < levels && withBooks && ch > 0.12)
      for (let c = 0; c < columns; c++) {
        const cx = -w / 2 + t + c * (cw + t) + cw / 2;
        parts.push(...books(cw, y + t, 0, d * 0.75, Math.min(0.3, ch - 0.03), i * 13 + c * 7 + 7).map((b) => ({ ...b, p: [b.p[0] + cx, b.p[1], b.p[2]] as V3 })));
      }
  }
  return parts;
}

export const CUBE = 0.335;
export const CUBE_T = 0.039;
export const cubeSpan = (n: number) => Math.round((n * CUBE + (n + 1) * CUBE_T) * 1000) / 1000;

/** Estantería de cubos (tipo módulo cuadrado), opcionalmente con cajas de tela. */
export function cubeShelf(w: number, d: number, h: number, p: ParamValues): Part[] {
  const rows = pint(p, 'rows', 4, 1, 6);
  const cols = pint(p, 'cols', 4, 1, 6);
  const t = CUBE_T;
  const cw = (w - t * (cols + 1)) / cols;
  const ch = (h - t * (rows + 1)) / rows;
  const parts: Part[] = [];
  for (let c = 0; c <= cols; c++) parts.push(B(-w / 2 + t / 2 + c * (cw + t), 0, 0, t, h, d, 'primary'));
  for (let r = 0; r <= rows; r++) parts.push(B(0, r * (ch + t), 0, w - 2 * t, t, d, 'primary'));
  if (pbool(p, 'boxes', true)) {
    let k = 0;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        k++;
        const x = -w / 2 + t + c * (cw + t) + cw / 2;
        const y = t + r * (ch + t);
        if ((r * 3 + c * 5) % 4 === 0) parts.push({ ...R(x, y, 0.02, cw - 0.02, ch - 0.02, d - 0.06, 'boxes', 0.02), noPlan: true });
        else if (k % 3 === 0) parts.push(...books(cw, y, 0, d * 0.7, Math.min(0.28, ch - 0.03), k * 11).map((b) => ({ ...b, p: [b.p[0] + x, b.p[1], b.p[2]] as V3 })));
      }
  }
  return parts;
}

/** Baldas flotantes de pared con separación configurable. */
export function wallShelves(w: number, d: number, p: ParamValues): Part[] {
  const count = pint(p, 'count', 3, 1, 8);
  const spacing = pnum(p, 'spacing', 0.35);
  const parts: Part[] = [];
  for (let i = 0; i < count; i++) {
    const y = i * spacing;
    parts.push(B(0, y, 0, w, 0.03, d, 'primary'));
    if (!pbool(p, 'decor', true) || spacing < 0.15) continue;
    const bh = Math.min(0.26, spacing - 0.06);
    if (i % 2 === 0) parts.push(...books(w * 0.55, y + 0.03, 0, d * 0.8, bh, i * 17 + 3).map((b) => ({ ...b, p: [b.p[0] - w * 0.2, b.p[1], b.p[2]] as V3 })));
    else parts.push(...books(w * 0.4, y + 0.03, 0, d * 0.8, bh, i * 17 + 3).map((b) => ({ ...b, p: [b.p[0] + w * 0.25, b.p[1], b.p[2]] as V3 })));
    parts.push({ ...S(i % 2 === 0 ? w * 0.32 : -w * 0.3, y + 0.03 + Math.min(0.09, bh * 0.4), 0, Math.min(0.12, d * 0.6), Math.min(0.18, bh * 0.8), Math.min(0.12, d * 0.6), 'decor'), noPlan: true });
  }
  return parts;
}

export const BOOKS = { book1: slot('Libros 1', 'plastico', '#9b4a3c'), book2: slot('Libros 2', 'plastico', '#3d5a73'), book3: slot('Libros 3', 'plastico', '#d8c9a3') };


/**
 * Armario empotrado de suelo a techo: tapajuntas (marco), zócalo, puertas
 * abatibles o correderas y altillo opcional. `doors` = 0 calcula las puertas
 * según el ancho (abatibles de ~50 cm, correderas de ~90 cm).
 */
export function builtInWardrobe(w: number, d: number, h: number, o: { doors: number; sliding: boolean; altillo: boolean; frame: boolean; mirror: boolean }): Part[] {
  const fw = o.frame ? Math.min(0.05, w * 0.05) : 0;
  const plinth = 0.07;
  const zf = d / 2;
  const x0 = -w / 2 + fw;
  const areaW = w - 2 * fw;
  const y0 = plinth;
  const y1 = h - fw;
  const altillo = o.altillo && h >= 2.05;
  const ya = altillo ? y1 - Math.min(0.6, Math.max(0.35, h * 0.18)) : y1;
  const parts: Part[] = [
    // Hueco / cuerpo (queda detrás del frente)
    B(0, 0, -0.03, w, h, d - 0.06, 'primary'),
    B(0, 0, zf - 0.035, areaW, plinth, 0.02, 'frame'),
  ];
  if (o.frame) {
    parts.push(B(-w / 2 + fw / 2, 0, zf - 0.01, fw, h, 0.02, 'frame'), B(w / 2 - fw / 2, 0, zf - 0.01, fw, h, 0.02, 'frame'), B(0, h - fw, zf - 0.01, areaW, fw, 0.02, 'frame'));
  }
  if (altillo) parts.push(B(0, ya - 0.012, zf - 0.03, areaW, 0.024, 0.03, 'frame'));
  const mainTop = altillo ? ya - 0.014 : y1;
  if (o.sliding) {
    const n = o.doors > 0 ? Math.min(6, o.doors) : Math.max(2, Math.min(4, Math.round(areaW / 0.9)));
    const pw = areaW / n;
    const overlap = 0.03;
    for (let i = 0; i < n; i++) {
      const x = x0 + pw * (i + 0.5);
      const z = i % 2 === 0 ? zf - 0.016 : zf - 0.046;
      const mirror = o.mirror && n >= 2 && i === Math.floor((n - 1) / 2);
      parts.push(B(x, y0 + 0.004, z, pw + (i > 0 && i < n - 1 ? overlap * 2 : overlap), mainTop - y0 - 0.008, 0.022, mirror ? 'mirror' : 'primary'));
      // Perfil vertical para tirar (en el canto exterior de cada hoja)
      const edge = i < n / 2 ? x - pw / 2 + 0.03 : x + pw / 2 - 0.03;
      parts.push(B(edge, y0 + 0.004, z + 0.013, 0.012, mainTop - y0 - 0.008, 0.006, 'secondary'));
    }
    // Guías superior e inferior
    parts.push(B(0, mainTop - 0.004, zf - 0.03, areaW, 0.012, 0.06, 'secondary'), B(0, y0 - 0.006, zf - 0.03, areaW, 0.01, 0.06, 'secondary'));
  } else {
    const n = o.doors > 0 ? Math.min(12, o.doors) : Math.max(1, Math.round(areaW / 0.5));
    const dw = areaW / n;
    for (let i = 0; i < n; i++) {
      const x = x0 + dw * (i + 0.5);
      const mirror = o.mirror && i === n - 1;
      parts.push(B(x, y0 + 0.003, zf - 0.012, dw - 0.004, mainTop - y0 - 0.006, 0.022, mirror ? 'mirror' : 'primary'));
      // Tiradores junto al canto que abre (por parejas)
      const right = n === 1 ? true : i % 2 === 0 && i < n - 1;
      const hx = right ? x + dw / 2 - 0.05 : x - dw / 2 + 0.05;
      parts.push(B(hx, Math.min(1.25, mainTop - 0.4) - 0.3, zf + 0.012, 0.015, 0.3, 0.02, 'secondary'));
      if (altillo) {
        parts.push(B(x, ya + 0.014, zf - 0.012, dw - 0.004, y1 - ya - 0.018, 0.022, 'primary'));
        parts.push(B(hx, ya + 0.05, zf + 0.012, 0.015, 0.12, 0.02, 'secondary'));
      }
    }
  }
  if (o.sliding && altillo) {
    const n = Math.max(1, Math.round(areaW / 0.6));
    const dw = areaW / n;
    for (let i = 0; i < n; i++) {
      const x = x0 + dw * (i + 0.5);
      parts.push(B(x, ya + 0.014, zf - 0.012, dw - 0.004, y1 - ya - 0.018, 0.022, 'primary'));
      parts.push(B(x, ya + 0.045, zf + 0.012, Math.min(0.16, dw * 0.4), 0.015, 0.02, 'secondary'));
    }
  }
  return parts;
}
