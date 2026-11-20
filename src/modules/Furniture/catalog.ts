/**
 * Catálogo de muebles y objetos. Cada elemento se construye con piezas
 * paramétricas (ver types.ts) a partir de su ancho (w), fondo (d) y alto (h).
 */
import type { CatalogItem, FurnitureCategory, MaterialSlot, Part } from './types';

type V3 = [number, number, number];
const H = Math.PI / 2;

/** Caja apoyada: (x, y inferior, z) y dimensiones (ancho, alto, fondo). */
const B = (x: number, y0: number, z: number, w: number, h: number, d: number, m: string, r?: V3): Part => ({ s: 'box', p: [x, y0 + h / 2, z], d: [w, h, d], m, r });
const R = (x: number, y0: number, z: number, w: number, h: number, d: number, m: string, radius = 0.04, r?: V3): Part => ({ s: 'rbox', p: [x, y0 + h / 2, z], d: [w, h, d], m, radius, r });
/** Cilindro vertical apoyado (diámetros X/Z). */
const C = (x: number, y0: number, z: number, dx: number, h: number, dz: number, m: string, r?: V3): Part => ({ s: 'cyl', p: [x, y0 + h / 2, z], d: [dx, h, dz], m, r });
/** Cilindro centrado (para piezas giradas). */
const Cc = (x: number, y: number, z: number, dx: number, h: number, dz: number, m: string, r?: V3): Part => ({ s: 'cyl', p: [x, y, z], d: [dx, h, dz], m, r });
const K = (x: number, y0: number, z: number, dx: number, h: number, dz: number, m: string): Part => ({ s: 'cone', p: [x, y0 + h / 2, z], d: [dx, h, dz], m });
const S = (x: number, y: number, z: number, dx: number, dy: number, dz: number, m: string): Part => ({ s: 'sphere', p: [x, y, z], d: [dx, dy, dz], m });

const slot = (label: string, materialId: string, color: string): MaterialSlot => ({ label, materialId, color });
const FABRIC = (color = '#8d9095') => slot('Tapicería', 'tela', color);
const WOOD = (color = '#b98a59', id = 'madera-roble') => slot('Madera', id, color);
const METAL = (color = '#2a2a2c', id = 'metal-negro') => slot('Metal', id, color);
const LACQ = (color = '#f4f4f1', label = 'Acabado') => slot(label, 'lacado', color);
const LIGHT = () => slot('Luz', 'luz', '#fff1d6');
const GLASS = () => slot('Vidrio', 'vidrio', '#cfe5ee');
const PORC = () => slot('Porcelana', 'porcelana', '#fbfbfa');
const CHROME = () => slot('Grifería', 'cromo', '#e3e6e9');
const SCREEN = () => slot('Pantalla', 'pantalla', '#0c0e12');

/** Cuatro patas en las esquinas. */
function legs(w: number, d: number, h: number, size: number, m: string, inset = 0.04, round = false): Part[] {
  const xs = [-w / 2 + inset + size / 2, w / 2 - inset - size / 2];
  const zs = [-d / 2 + inset + size / 2, d / 2 - inset - size / 2];
  const out: Part[] = [];
  for (const x of xs) for (const z of zs) out.push(round ? C(x, 0, z, size, h, size, m) : B(x, 0, z, size, h, size, m));
  return out;
}

function sofa(w: number, d: number, h: number, seats: number): Part[] {
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

function bed(w: number, d: number, h: number): Part[] {
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

function wardrobe(w: number, d: number, h: number, doors: number): Part[] {
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

function drawers(w: number, d: number, h: number, rows: number, cols: number, y0 = 0.08): Part[] {
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

function kitchenBase(w: number, d: number, h: number, extra: Part[] = [], doors = Math.max(1, Math.round(w / 0.6))): Part[] {
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

function plantParts(w: number, h: number, potH: number): Part[] {
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

function books(w: number, y: number, z: number, depth: number, height: number, seed: number): Part[] {
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

const BOOKS = { book1: slot('Libros 1', 'plastico', '#9b4a3c'), book2: slot('Libros 2', 'plastico', '#3d5a73'), book3: slot('Libros 3', 'plastico', '#d8c9a3') };

export const CATALOG: CatalogItem[] = [
  // ── Sofás ──────────────────────────────────────────────
  { id: 'sofa-3', name: 'Sofá 3 plazas', category: 'sofas', w: 2.2, d: 0.95, h: 0.85, slots: { primary: FABRIC(), secondary: WOOD('#5f3f29', 'madera-nogal') }, build: (w, d, h) => sofa(w, d, h, 3) },
  { id: 'sofa-2', name: 'Sofá 2 plazas', category: 'sofas', w: 1.6, d: 0.92, h: 0.85, slots: { primary: FABRIC('#c9bba6'), secondary: WOOD('#5f3f29', 'madera-nogal') }, build: (w, d, h) => sofa(w, d, h, 2) },
  {
    id: 'sofa-l',
    name: 'Sofá rinconera',
    category: 'sofas',
    w: 2.8,
    d: 1.7,
    h: 0.85,
    slots: { primary: FABRIC('#6f747a'), secondary: METAL() },
    build: (w, d, h) => {
      const main = Math.min(0.95, d * 0.6);
      const chaise = Math.min(0.95, w * 0.4);
      const back = sofa(w, main, h, 3).map((p) => ({ ...p, p: [p.p[0], p.p[1], p.p[2] - d / 2 + main / 2] as V3 }));
      return [
        ...back,
        R(w / 2 - chaise / 2 - 0.2, 0.1, main / 2 - 0.05, chaise - 0.02, 0.3, d - main + 0.1, 'primary', 0.03),
        R(w / 2 - chaise / 2 - 0.2, 0.4, main / 2 - 0.05, chaise - 0.06, 0.14, d - main + 0.06, 'primary', 0.05),
      ];
    },
  },
  { id: 'armchair', name: 'Sillón', category: 'sofas', w: 0.85, d: 0.85, h: 0.9, slots: { primary: FABRIC('#3f5f57'), secondary: WOOD('#5f3f29', 'madera-nogal') }, build: (w, d, h) => sofa(w, d, h, 1) },
  { id: 'pouf', name: 'Puf', category: 'sofas', w: 0.55, d: 0.55, h: 0.42, slots: { primary: FABRIC('#d6c7a8') }, build: (w, d, h) => [{ ...R(0, 0, 0, w, h, d, 'primary', Math.min(w, h) * 0.25) }] },

  // ── Mesas ──────────────────────────────────────────────
  { id: 'dining-table', name: 'Mesa de comedor', category: 'mesas', w: 1.8, d: 0.9, h: 0.75, slots: { primary: WOOD(), secondary: METAL() }, build: (w, d, h) => [B(0, h - 0.04, 0, w, 0.04, d, 'primary'), ...legs(w, d, h - 0.04, 0.06, 'secondary', 0.08)] },
  { id: 'round-table', name: 'Mesa redonda', category: 'mesas', w: 1.1, d: 1.1, h: 0.75, slots: { primary: LACQ('#f4f4f1'), secondary: WOOD() }, build: (w, d, h) => [C(0, h - 0.035, 0, w, 0.035, d, 'primary'), C(0, 0.03, 0, 0.12, h - 0.06, 0.12, 'secondary'), C(0, 0, 0, w * 0.45, 0.03, d * 0.45, 'secondary')] },
  { id: 'coffee-table', name: 'Mesa de centro', category: 'mesas', w: 1.2, d: 0.6, h: 0.4, slots: { primary: WOOD('#d8b48a', 'madera-clara'), secondary: METAL() }, build: (w, d, h) => [B(0, h - 0.04, 0, w, 0.04, d, 'primary'), B(0, 0.1, 0, w - 0.1, 0.02, d - 0.1, 'primary'), ...legs(w, d, h - 0.04, 0.03, 'secondary', 0.03)] },
  { id: 'side-table', name: 'Mesa auxiliar', category: 'mesas', w: 0.45, d: 0.45, h: 0.5, slots: { primary: slot('Sobre', 'marmol-blanco', '#eeece8'), secondary: METAL('#c9a24f', 'laton') }, build: (w, d, h) => [C(0, h - 0.02, 0, w, 0.02, d, 'primary'), C(0, 0, 0, 0.03, h - 0.02, 0.03, 'secondary'), C(0, 0, 0, w * 0.6, 0.015, d * 0.6, 'secondary')] },
  { id: 'nightstand', name: 'Mesita de noche', category: 'mesas', w: 0.5, d: 0.4, h: 0.55, slots: { primary: WOOD(), secondary: METAL('#c9a24f', 'laton') }, build: (w, d, h) => drawers(w, d, h, 2, 1, 0.12).concat(legs(w, d, 0.12, 0.03, 'secondary', 0.03)) },
  {
    id: 'outdoor-dining',
    name: 'Mesa con sillas',
    category: 'mesas',
    w: 1.8,
    d: 1.8,
    h: 0.9,
    slots: { primary: WOOD(), secondary: METAL(), seat: FABRIC('#d6c7a8') },
    build: (w, d) => {
      const tw = w * 0.62;
      const td = d * 0.48;
      const parts: Part[] = [B(0, 0.71, 0, tw, 0.04, td, 'primary'), ...legs(tw, td, 0.71, 0.05, 'secondary', 0.05)];
      const chair = (x: number, z: number, rot: number) => {
        const c: Part[] = [R(0, 0.43, 0, 0.44, 0.05, 0.44, 'seat', 0.02), B(0, 0.45, -0.2, 0.42, 0.42, 0.03, 'primary'), ...legs(0.42, 0.42, 0.43, 0.03, 'secondary', 0.02)];
        const cs = Math.cos(rot);
        const sn = Math.sin(rot);
        return c.map((p) => ({ ...p, p: [x + p.p[0] * cs + p.p[2] * sn, p.p[1], z - p.p[0] * sn + p.p[2] * cs] as V3, r: [0, rot, 0] as V3 }));
      };
      const n = Math.max(1, Math.floor(tw / 0.6));
      for (let i = 0; i < n; i++) {
        const x = -tw / 2 + (tw / n) * (i + 0.5);
        parts.push(...chair(x, -td / 2 - 0.2, 0), ...chair(x, td / 2 + 0.2, Math.PI));
      }
      return parts;
    },
  },

  // ── Sillas ─────────────────────────────────────────────
  { id: 'chair', name: 'Silla', category: 'sillas', w: 0.45, d: 0.52, h: 0.88, slots: { primary: WOOD(), secondary: FABRIC('#c9bba6') }, build: (w, d, h) => [R(0, 0.44, 0.02, w, 0.05, d - 0.04, 'secondary', 0.02), B(0, 0.46, -d / 2 + 0.03, w - 0.02, h - 0.46, 0.03, 'primary', [-0.08, 0, 0]), ...legs(w, d, 0.44, 0.035, 'primary', 0.02)] },
  { id: 'stool', name: 'Taburete alto', category: 'sillas', w: 0.4, d: 0.4, h: 0.76, slots: { primary: WOOD('#5f3f29', 'madera-nogal'), secondary: METAL() }, build: (w, d, h) => [C(0, h - 0.04, 0, w, 0.04, d, 'primary'), ...legs(w * 0.8, d * 0.8, h - 0.04, 0.025, 'secondary', 0.02, true), B(0, 0.28, 0, w * 0.7, 0.02, 0.02, 'secondary'), B(0, 0.28, 0, 0.02, 0.02, d * 0.7, 'secondary')] },
  {
    id: 'office-chair',
    name: 'Silla de oficina',
    category: 'sillas',
    w: 0.65,
    d: 0.65,
    h: 1.1,
    slots: { primary: FABRIC('#2f3439'), secondary: METAL('#a7adb3', 'acero') },
    build: (w, d, h) => [B(0, 0.04, 0, w, 0.04, 0.05, 'secondary'), B(0, 0.04, 0, 0.05, 0.04, d, 'secondary'), C(0, 0.08, 0, 0.05, 0.34, 0.05, 'secondary'), R(0, 0.42, 0.02, w * 0.75, 0.08, d * 0.72, 'primary', 0.03), R(0, 0.55, -d * 0.33, w * 0.7, h - 0.55, 0.06, 'primary', 0.03, [-0.1, 0, 0])],
  },

  // ── Camas ──────────────────────────────────────────────
  { id: 'bed-double', name: 'Cama doble 150', category: 'camas', w: 1.6, d: 2.05, h: 1.0, slots: { primary: slot('Edredón', 'tela', '#e6e1d8'), secondary: WOOD(), mattress: slot('Sábanas', 'colchon', '#f1eee8') }, build: bed },
  { id: 'bed-king', name: 'Cama 180', category: 'camas', w: 1.9, d: 2.1, h: 1.05, slots: { primary: slot('Edredón', 'tela', '#b9c4cc'), secondary: FABRIC('#6f747a'), mattress: slot('Sábanas', 'colchon', '#f1eee8') }, build: bed },
  { id: 'bed-single', name: 'Cama individual 90', category: 'camas', w: 0.95, d: 2.0, h: 0.9, slots: { primary: slot('Edredón', 'tela', '#9fb7a4'), secondary: WOOD('#d8b48a', 'madera-clara'), mattress: slot('Sábanas', 'colchon', '#f1eee8') }, build: bed },
  {
    id: 'crib',
    name: 'Cuna',
    category: 'camas',
    w: 0.66,
    d: 1.26,
    h: 0.95,
    slots: { primary: LACQ('#f4f4f1'), mattress: slot('Colchón', 'colchon', '#f1eee8') },
    build: (w, d, h) => {
      const parts: Part[] = [...legs(w, d, h, 0.04, 'primary', 0), B(0, 0.3, 0, w - 0.06, 0.12, d - 0.06, 'mattress'), B(0, h - 0.04, -d / 2 + 0.02, w, 0.04, 0.04, 'primary'), B(0, h - 0.04, d / 2 - 0.02, w, 0.04, 0.04, 'primary'), B(-w / 2 + 0.02, h - 0.04, 0, 0.04, 0.04, d, 'primary'), B(w / 2 - 0.02, h - 0.04, 0, 0.04, 0.04, d, 'primary')];
      for (let i = 1; i < 12; i++) {
        const z = -d / 2 + (d / 12) * i;
        parts.push({ ...B(-w / 2 + 0.02, 0.3, z, 0.02, h - 0.34, 0.02, 'primary'), noPlan: true }, { ...B(w / 2 - 0.02, 0.3, z, 0.02, h - 0.34, 0.02, 'primary'), noPlan: true });
      }
      return parts;
    },
  },

  // ── Armarios ───────────────────────────────────────────
  { id: 'wardrobe-2', name: 'Armario 2 puertas', category: 'armarios', w: 1.0, d: 0.6, h: 2.2, slots: { primary: LACQ('#f4f4f1'), secondary: METAL() }, build: (w, d, h) => wardrobe(w, d, h, 2) },
  { id: 'wardrobe-3', name: 'Armario 3 puertas', category: 'armarios', w: 1.5, d: 0.6, h: 2.4, slots: { primary: WOOD('#d8b48a', 'madera-clara'), secondary: METAL() }, build: (w, d, h) => wardrobe(w, d, h, 3) },
  {
    id: 'bookshelf',
    name: 'Estantería',
    category: 'armarios',
    w: 1.0,
    d: 0.35,
    h: 2.0,
    slots: { primary: WOOD(), ...BOOKS },
    build: (w, d, h) => {
      const t = 0.025;
      const shelves = Math.max(2, Math.round(h / 0.38));
      const parts: Part[] = [B(-w / 2 + t / 2, 0, 0, t, h, d, 'primary'), B(w / 2 - t / 2, 0, 0, t, h, d, 'primary'), B(0, 0, -d / 2 + 0.005, w, h, 0.01, 'primary')];
      for (let i = 0; i <= shelves; i++) {
        const y = Math.min(h - t, (h / shelves) * i);
        parts.push(B(0, y, 0, w - 2 * t, t, d, 'primary'));
        if (i < shelves) parts.push(...books(w - 2 * t, y + t, 0, d * 0.75, h / shelves - 0.08, i * 13 + 7));
      }
      return parts;
    },
  },
  { id: 'sideboard', name: 'Aparador', category: 'armarios', w: 1.8, d: 0.45, h: 0.75, slots: { primary: WOOD('#5f3f29', 'madera-nogal'), secondary: METAL('#c9a24f', 'laton') }, build: (w, d, h) => drawers(w, d, h - 0.15, 1, 3, 0).map((p) => ({ ...p, p: [p.p[0], p.p[1] + 0.15, p.p[2]] as V3 })).concat(legs(w, d, 0.15, 0.03, 'secondary', 0.05)) },
  { id: 'dresser', name: 'Cómoda', category: 'armarios', w: 1.0, d: 0.5, h: 0.85, slots: { primary: LACQ('#f4f4f1'), secondary: WOOD() }, build: (w, d, h) => drawers(w, d, h, 4, 1) },
  { id: 'shoe-cabinet', name: 'Zapatero', category: 'armarios', w: 0.9, d: 0.3, h: 1.1, slots: { primary: LACQ('#e9e2d4'), secondary: METAL() }, build: (w, d, h) => drawers(w, d, h, 3, 1, 0.05) },

  // ── Escritorios ────────────────────────────────────────
  { id: 'desk', name: 'Escritorio', category: 'escritorios', w: 1.4, d: 0.7, h: 0.75, slots: { primary: WOOD('#d8b48a', 'madera-clara'), secondary: METAL() }, build: (w, d, h) => [B(0, h - 0.03, 0, w, 0.03, d, 'primary'), ...legs(w, d, h - 0.03, 0.04, 'secondary', 0.04), B(w / 2 - 0.25, h - 0.18, 0, 0.4, 0.15, d - 0.1, 'primary')] },
  {
    id: 'desk-l',
    name: 'Escritorio en L',
    category: 'escritorios',
    w: 1.6,
    d: 1.4,
    h: 0.75,
    slots: { primary: LACQ('#f4f4f1'), secondary: METAL() },
    build: (w, d, h) => [B(0, h - 0.03, -d / 2 + 0.35, w, 0.03, 0.7, 'primary'), B(-w / 2 + 0.3, h - 0.03, 0.35, 0.6, 0.03, d - 0.7, 'primary'), B(w / 2 - 0.03, 0, -d / 2 + 0.35, 0.03, h - 0.03, 0.66, 'secondary'), B(-w / 2 + 0.03, 0, 0, 0.03, h - 0.03, d - 0.04, 'secondary'), B(-w / 2 + 0.3, 0, d / 2 - 0.03, 0.56, h - 0.03, 0.03, 'secondary')],
  },
  {
    id: 'computer',
    name: 'Ordenador y monitor',
    category: 'escritorios',
    w: 0.62,
    d: 0.3,
    h: 0.45,
    elevation: 0.75,
    slots: { primary: METAL(), screen: SCREEN() },
    blocks: false,
    build: (w, d, h) => [B(0, 0, -d / 2 + 0.08, 0.22, 0.015, 0.16, 'primary'), B(0, 0.015, -d / 2 + 0.08, 0.04, h * 0.35, 0.03, 'primary'), B(0, h * 0.25, -d / 2 + 0.06, w, h * 0.72, 0.03, 'primary'), B(0, h * 0.27, -d / 2 + 0.077, w - 0.03, h * 0.68, 0.005, 'screen'), B(0, 0, d / 2 - 0.08, 0.44, 0.02, 0.14, 'primary')],
  },

  // ── Televisores ────────────────────────────────────────
  { id: 'tv-55', name: 'Televisor 55"', category: 'televisores', w: 1.23, d: 0.25, h: 0.78, elevation: 0.5, slots: { primary: METAL(), screen: SCREEN() }, blocks: false, build: (w, d, h) => [B(0, 0.08, 0, w, h - 0.08, 0.05, 'primary'), B(0, 0.09, 0.026, w - 0.02, h - 0.1, 0.002, 'screen'), B(-w * 0.35, 0, 0, 0.05, 0.08, d, 'primary'), B(w * 0.35, 0, 0, 0.05, 0.08, d, 'primary')] },
  { id: 'tv-65-wall', name: 'Televisor 65" de pared', category: 'televisores', w: 1.45, d: 0.06, h: 0.84, elevation: 1.0, slots: { primary: METAL(), screen: SCREEN() }, blocks: false, build: (w, d, h) => [B(0, 0, 0, w, h, d, 'primary'), B(0, 0.01, d / 2, w - 0.02, h - 0.02, 0.002, 'screen')] },
  { id: 'tv-stand', name: 'Mueble de TV', category: 'televisores', w: 1.8, d: 0.42, h: 0.5, slots: { primary: WOOD('#5f3f29', 'madera-nogal'), secondary: LACQ('#f4f4f1') }, build: (w, d, h) => [B(0, 0.1, 0, w, h - 0.1, d, 'primary'), B(-w / 4, 0.12, d / 2, w / 2 - 0.02, h - 0.14, 0.01, 'secondary'), B(w / 4, 0.12, d / 2, w / 2 - 0.02, h - 0.14, 0.01, 'secondary'), ...legs(w, d, 0.1, 0.03, 'primary', 0.06)] },
  { id: 'soundbar', name: 'Barra de sonido', category: 'televisores', w: 0.9, d: 0.1, h: 0.07, elevation: 0.5, slots: { primary: METAL() }, blocks: false, build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.02)] },

  // ── Electrodomésticos ──────────────────────────────────
  { id: 'fridge', name: 'Frigorífico combi', category: 'electrodomesticos', w: 0.6, d: 0.66, h: 1.86, slots: { primary: slot('Acabado', 'acero', '#a7adb3'), secondary: METAL() }, build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.015), B(0, h * 0.62, d / 2 + 0.003, w - 0.01, 0.008, 0.01, 'secondary'), B(-w / 2 + 0.06, h * 0.68, d / 2 + 0.02, 0.02, 0.4, 0.03, 'secondary'), B(-w / 2 + 0.06, h * 0.38, d / 2 + 0.02, 0.02, 0.3, 0.03, 'secondary')] },
  { id: 'fridge-american', name: 'Frigorífico americano', category: 'electrodomesticos', w: 0.91, d: 0.72, h: 1.78, slots: { primary: slot('Acabado', 'acero', '#a7adb3'), secondary: METAL() }, build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.015), B(0, 0, d / 2 + 0.003, 0.008, h, 0.01, 'secondary'), B(-0.05, h * 0.35, d / 2 + 0.03, 0.02, 0.7, 0.03, 'secondary'), B(0.05, h * 0.35, d / 2 + 0.03, 0.02, 0.7, 0.03, 'secondary')] },
  { id: 'washer', name: 'Lavadora', category: 'electrodomesticos', w: 0.6, d: 0.6, h: 0.85, slots: { primary: LACQ('#f4f4f1', 'Carcasa'), secondary: GLASS(), tertiary: METAL('#a7adb3', 'acero') }, build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.015), Cc(0, h * 0.45, d / 2 + 0.01, w * 0.62, 0.04, w * 0.62, 'tertiary', [H, 0, 0]), Cc(0, h * 0.45, d / 2 + 0.03, w * 0.48, 0.02, w * 0.48, 'secondary', [H, 0, 0]), B(0, h - 0.1, d / 2, w - 0.04, 0.07, 0.01, 'tertiary')] },
  { id: 'dryer', name: 'Secadora', category: 'electrodomesticos', w: 0.6, d: 0.6, h: 0.85, slots: { primary: LACQ('#e8ecef', 'Carcasa'), secondary: GLASS(), tertiary: METAL() }, build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.015), Cc(0, h * 0.45, d / 2 + 0.01, w * 0.62, 0.04, w * 0.62, 'tertiary', [H, 0, 0]), Cc(0, h * 0.45, d / 2 + 0.03, w * 0.48, 0.02, w * 0.48, 'secondary', [H, 0, 0])] },
  { id: 'dishwasher', name: 'Lavavajillas', category: 'electrodomesticos', w: 0.6, d: 0.6, h: 0.85, slots: { primary: slot('Acabado', 'acero', '#a7adb3'), secondary: METAL() }, build: (w, d, h) => [B(0, 0, 0, w, h, d, 'primary'), B(0, h - 0.12, d / 2 + 0.015, w - 0.1, 0.02, 0.025, 'secondary')] },
  {
    id: 'oven-column',
    name: 'Columna de horno',
    category: 'electrodomesticos',
    w: 0.6,
    d: 0.6,
    h: 2.2,
    slots: { primary: LACQ('#f4f4f1'), secondary: SCREEN(), metal: METAL('#a7adb3', 'acero') },
    build: (w, d, h) => [B(0, 0, 0, w, h, d, 'primary'), B(0, 0.85, d / 2, w - 0.04, 0.58, 0.012, 'secondary'), B(0, 1.25, d / 2 + 0.02, w - 0.12, 0.02, 0.025, 'metal'), B(0, 1.47, d / 2, w - 0.04, 0.38, 0.012, 'secondary')],
  },
  { id: 'microwave', name: 'Microondas', category: 'electrodomesticos', w: 0.5, d: 0.38, h: 0.3, elevation: 0.92, slots: { primary: METAL('#a7adb3', 'acero'), secondary: SCREEN() }, blocks: false, build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.01), B(-0.05, 0.03, d / 2, w * 0.65, h - 0.06, 0.005, 'secondary')] },

  // ── Cocina ─────────────────────────────────────────────
  { id: 'kitchen-base', name: 'Mueble bajo de cocina', category: 'cocina', w: 1.2, d: 0.6, h: 0.9, slots: { primary: LACQ('#f4f4f1', 'Frentes'), top: slot('Encimera', 'marmol-blanco', '#eeece8'), metal: METAL('#a7adb3', 'acero'), black: METAL() }, build: (w, d, h) => kitchenBase(w, d, h) },
  {
    id: 'kitchen-sink',
    name: 'Fregadero',
    category: 'cocina',
    w: 1.2,
    d: 0.6,
    h: 0.9,
    slots: { primary: LACQ('#f4f4f1', 'Frentes'), top: slot('Encimera', 'marmol-blanco', '#eeece8'), metal: METAL('#a7adb3', 'acero'), black: METAL() },
    build: (w, d, h) => kitchenBase(w, d, h, [B(0, h - 0.005, 0.02, Math.min(0.75, w - 0.2), 0.008, d - 0.2, 'metal'), C(0, h, -d / 2 + 0.08, 0.04, 0.32, 0.04, 'metal'), Cc(0, h + 0.3, -d / 2 + 0.16, 0.03, 0.18, 0.03, 'metal', [H, 0, 0])]),
  },
  {
    id: 'kitchen-hob',
    name: 'Placa de cocción',
    category: 'cocina',
    w: 0.6,
    d: 0.6,
    h: 0.9,
    slots: { primary: LACQ('#f4f4f1', 'Frentes'), top: slot('Encimera', 'marmol-blanco', '#eeece8'), metal: METAL('#a7adb3', 'acero'), black: METAL(), glass: slot('Vitrocerámica', 'pantalla', '#0c0e12') },
    build: (w, d, h) => kitchenBase(w, d, h, [B(0, h, 0.02, Math.min(0.58, w - 0.04), 0.006, d - 0.1, 'glass')], 1),
  },
  {
    id: 'kitchen-wall',
    name: 'Mueble alto de cocina',
    category: 'cocina',
    w: 1.2,
    d: 0.35,
    h: 0.7,
    elevation: 1.45,
    slots: { primary: LACQ('#f4f4f1', 'Frentes'), metal: METAL('#a7adb3', 'acero') },
    blocks: false,
    build: (w, d, h) => {
      const doors = Math.max(1, Math.round(w / 0.6));
      const dw = w / doors;
      const parts: Part[] = [B(0, 0, -0.01, w, h, d - 0.02, 'primary')];
      for (let i = 0; i < doors; i++) {
        const x = -w / 2 + dw * (i + 0.5);
        parts.push(B(x, 0.004, d / 2 - 0.02, dw - 0.006, h - 0.008, 0.02, 'primary'), B(x, 0.04, d / 2 + 0.002, dw * 0.5, 0.015, 0.02, 'metal'));
      }
      return parts;
    },
  },
  {
    id: 'kitchen-island',
    name: 'Isla de cocina',
    category: 'cocina',
    w: 2.2,
    d: 1.0,
    h: 0.92,
    slots: { primary: WOOD('#5f3f29', 'madera-nogal'), top: slot('Encimera', 'marmol-blanco', '#eeece8'), metal: METAL('#a7adb3', 'acero'), black: METAL() },
    build: (w, d, h) => [B(0, 0, -d * 0.1, w - 0.1, 0.1, d * 0.62, 'black'), B(0, 0.1, -d * 0.1, w - 0.04, h - 0.14, d * 0.7, 'primary'), B(0, h - 0.04, 0, w, 0.04, d, 'top')],
  },
  { id: 'hood', name: 'Campana extractora', category: 'cocina', w: 0.9, d: 0.5, h: 0.9, elevation: 1.6, slots: { primary: METAL('#a7adb3', 'acero') }, blocks: false, build: (w, d, h) => [B(0, 0, 0, w, 0.08, d, 'primary'), B(0, 0.08, -d / 2 + 0.15, 0.3, h - 0.08, 0.25, 'primary')] },

  // ── Sanitarios ─────────────────────────────────────────
  {
    id: 'toilet',
    name: 'Inodoro',
    category: 'sanitarios',
    w: 0.38,
    d: 0.68,
    h: 0.8,
    slots: { primary: PORC(), secondary: CHROME() },
    build: (w, d, h) => [C(0, 0, 0.06, w * 0.75, 0.38, d * 0.62, 'primary'), C(0, 0.38, 0.08, w, 0.04, d * 0.66, 'primary'), R(0, 0.3, -d / 2 + 0.09, w, h - 0.3, 0.18, 'primary', 0.03), B(0, h, -d / 2 + 0.09, 0.05, 0.01, 0.03, 'secondary')],
  },
  {
    id: 'vanity',
    name: 'Lavabo con mueble',
    category: 'sanitarios',
    w: 0.8,
    d: 0.46,
    h: 0.86,
    slots: { primary: WOOD(), secondary: PORC(), tertiary: CHROME() },
    build: (w, d, h) => [B(0, 0.2, 0, w, h - 0.2 - 0.04, d - 0.02, 'primary'), R(0, h - 0.04, 0.01, w, 0.06, d, 'secondary', 0.02), C(0, h + 0.01, 0.04, w * 0.55, 0.03, d * 0.55, 'tertiary'), C(0, h + 0.02, -d / 2 + 0.06, 0.03, 0.2, 0.03, 'tertiary'), Cc(0, h + 0.2, -d / 2 + 0.12, 0.025, 0.12, 0.025, 'tertiary', [H, 0, 0])],
  },
  { id: 'bidet', name: 'Bidé', category: 'sanitarios', w: 0.36, d: 0.55, h: 0.4, slots: { primary: PORC(), secondary: CHROME() }, build: (w, d, h) => [C(0, 0, 0.03, w * 0.8, h - 0.02, d * 0.8, 'primary'), C(0, h - 0.04, 0.03, w, 0.04, d * 0.9, 'primary'), C(0, h, -d / 2 + 0.07, 0.03, 0.08, 0.03, 'secondary')] },
  { id: 'mirror', name: 'Espejo', category: 'sanitarios', w: 0.8, d: 0.03, h: 0.9, elevation: 1.05, slots: { primary: slot('Espejo', 'cromo', '#e3e6e9'), secondary: METAL() }, blocks: false, build: (w, d, h) => [B(0, 0, 0, w, h, d, 'secondary'), B(0, 0.02, d / 2, w - 0.04, h - 0.04, 0.004, 'primary')] },
  { id: 'towel-rail', name: 'Toallero', category: 'sanitarios', w: 0.5, d: 0.1, h: 0.9, elevation: 0.5, slots: { primary: CHROME(), secondary: slot('Toalla', 'tela', '#e9e2d4') }, blocks: false, build: (w, _d, h) => [B(-w / 2 + 0.02, 0, 0, 0.03, h, 0.03, 'primary'), B(w / 2 - 0.02, 0, 0, 0.03, h, 0.03, 'primary'), ...[0.2, 0.45, 0.7].map((y) => B(0, h * y, 0, w, 0.02, 0.02, 'primary')), B(0, h * 0.35, 0.02, w * 0.8, h * 0.4, 0.03, 'secondary')] },

  // ── Duchas y bañeras ───────────────────────────────────
  {
    id: 'shower',
    name: 'Plato de ducha con mampara',
    category: 'duchas',
    w: 1.2,
    d: 0.8,
    h: 2.0,
    slots: { primary: PORC(), secondary: GLASS(), tertiary: CHROME() },
    build: (w, d, h) => [B(0, 0, 0, w, 0.04, d, 'primary'), B(w * 0.15, 0.04, d / 2 - 0.01, w * 0.7, h - 0.04, 0.01, 'secondary'), B(-w / 2 + 0.25, 0.04, -d / 2 + 0.03, 0.03, h * 0.95, 0.03, 'tertiary'), C(-w / 2 + 0.25, h * 0.95, -d / 2 + 0.15, 0.25, 0.02, 0.25, 'tertiary')],
  },
  {
    id: 'walkin-shower',
    name: 'Ducha de obra',
    category: 'duchas',
    w: 1.4,
    d: 0.9,
    h: 2.0,
    slots: { primary: slot('Suelo', 'piedra-exterior', '#b5ad9f'), secondary: GLASS(), tertiary: METAL() },
    build: (w, d, h) => [B(0, 0, 0, w, 0.02, d, 'primary'), B(w / 2 - 0.01, 0.02, 0, 0.012, h - 0.02, d, 'secondary'), B(w / 2 - 0.01, h - 0.02, 0, 0.03, 0.02, d, 'tertiary'), C(0, h * 0.97, -d / 2 + 0.2, 0.3, 0.015, 0.3, 'tertiary'), B(0, 0.04, -d / 2 + 0.02, 0.02, h * 0.95, 0.02, 'tertiary')],
  },
  {
    id: 'bathtub',
    name: 'Bañera',
    category: 'duchas',
    w: 1.7,
    d: 0.75,
    h: 0.58,
    slots: { primary: PORC(), secondary: CHROME(), water: slot('Agua', 'agua', '#3a95b8') },
    build: (w, d, h) => {
      const t = 0.07;
      return [B(0, 0, 0, w, 0.08, d, 'primary'), B(0, 0, -d / 2 + t / 2, w, h, t, 'primary'), B(0, 0, d / 2 - t / 2, w, h, t, 'primary'), B(-w / 2 + t / 2, 0, 0, t, h, d - 2 * t, 'primary'), B(w / 2 - t / 2, 0, 0, t, h, d - 2 * t, 'primary'), C(-w / 2 + 0.04, h, 0, 0.035, 0.2, 0.035, 'secondary')];
    },
  },
  {
    id: 'freestanding-tub',
    name: 'Bañera exenta',
    category: 'duchas',
    w: 1.6,
    d: 0.8,
    h: 0.6,
    slots: { primary: PORC(), secondary: CHROME() },
    build: (w, d, h) => [R(0, 0, 0, w, h * 0.3, d, 'primary', 0.12), R(0, 0, -d / 2 + 0.05, w, h, 0.1, 'primary', 0.05), R(0, 0, d / 2 - 0.05, w, h, 0.1, 'primary', 0.05), R(-w / 2 + 0.07, 0, 0, 0.14, h, d - 0.1, 'primary', 0.06), R(w / 2 - 0.07, 0, 0, 0.14, h, d - 0.1, 'primary', 0.06), C(w / 2 + 0.15, 0, 0, 0.04, 1.0, 0.04, 'secondary')],
  },

  // ── Lámparas ───────────────────────────────────────────
  { id: 'ceiling-lamp', name: 'Lámpara de techo', category: 'lamparas', w: 0.45, d: 0.45, h: 0.3, elevation: 2.4, slots: { primary: LACQ('#f4f4f1', 'Pantalla'), light: LIGHT() }, light: { y: 0.3, intensity: 1, color: '#ffe9c4', distance: 7 }, blocks: false, build: (w, d, h) => [C(0, h - 0.04, 0, 0.12, 0.04, 0.12, 'primary'), C(0, h * 0.35, 0, 0.01, h * 0.6, 0.01, 'primary'), { s: 'cyl', p: [0, h * 0.2, 0], d: [w, h * 0.4, d], m: 'primary' }, S(0, h * 0.15, 0, 0.1, 0.1, 0.1, 'light')] },
  { id: 'pendant', name: 'Lámpara colgante', category: 'lamparas', w: 0.32, d: 0.32, h: 0.9, elevation: 1.8, slots: { primary: METAL(), light: LIGHT() }, light: { y: 0.1, intensity: 0.9, color: '#ffe2b0', distance: 6 }, blocks: false, build: (w, d, h) => [C(0, 0.18, 0, 0.012, h - 0.18, 0.012, 'primary'), K(0, 0, 0, w, 0.2, d, 'primary'), S(0, 0.04, 0, 0.09, 0.09, 0.09, 'light')] },
  { id: 'floor-lamp', name: 'Lámpara de pie', category: 'lamparas', w: 0.42, d: 0.42, h: 1.6, slots: { primary: slot('Pantalla', 'tela', '#efe6d6'), secondary: METAL('#c9a24f', 'laton'), light: LIGHT() }, light: { y: 0.82, intensity: 0.7, color: '#ffdca8', distance: 5 }, build: (w, d, h) => [C(0, 0, 0, w * 0.65, 0.025, d * 0.65, 'secondary'), C(0, 0.025, 0, 0.025, h * 0.78, 0.025, 'secondary'), { s: 'cyl', p: [0, h * 0.89, 0], d: [w, h * 0.2, d], m: 'primary' }, S(0, h * 0.85, 0, 0.09, 0.09, 0.09, 'light')] },
  { id: 'table-lamp', name: 'Lámpara de sobremesa', category: 'lamparas', w: 0.3, d: 0.3, h: 0.5, elevation: 0.55, slots: { primary: slot('Pantalla', 'tela', '#efe6d6'), secondary: slot('Base', 'porcelana', '#d6cbb8'), light: LIGHT() }, light: { y: 0.7, intensity: 0.45, color: '#ffd9a0', distance: 3.5 }, blocks: false, build: (w, d, h) => [S(0, h * 0.2, 0, w * 0.5, h * 0.4, d * 0.5, 'secondary'), C(0, h * 0.35, 0, 0.015, h * 0.3, 0.015, 'secondary'), { s: 'cyl', p: [0, h * 0.8, 0], d: [w, h * 0.36, d], m: 'primary' }, S(0, h * 0.72, 0, 0.06, 0.06, 0.06, 'light')] },
  { id: 'wall-sconce', name: 'Aplique de pared', category: 'lamparas', w: 0.2, d: 0.14, h: 0.24, elevation: 1.8, slots: { primary: METAL('#2a2a2c'), light: LIGHT() }, light: { y: 0.5, intensity: 0.4, color: '#ffdca8', distance: 3.5 }, blocks: false, build: (w, d, h) => [B(0, 0, -d / 2 + 0.01, 0.08, h, 0.02, 'primary'), { s: 'cyl', p: [0, h / 2, 0.01], d: [w, h * 0.8, d * 0.9], m: 'primary' }, S(0, h / 2, 0.02, 0.06, 0.06, 0.06, 'light')] },
  { id: 'spotlights', name: 'Foco empotrado', category: 'lamparas', w: 0.12, d: 0.12, h: 0.03, elevation: 2.66, slots: { primary: LACQ('#f4f4f1', 'Aro'), light: LIGHT() }, light: { y: 0, intensity: 0.5, color: '#fff1d6', distance: 4 }, blocks: false, build: (w, d, h) => [C(0, 0, 0, w, h, d, 'primary'), C(0, -0.002, 0, w * 0.7, 0.005, d * 0.7, 'light')] },

  // ── Decoración ─────────────────────────────────────────
  { id: 'plant', name: 'Planta grande', category: 'decoracion', w: 0.55, d: 0.55, h: 1.3, slots: { primary: slot('Hojas', 'vegetal', '#4d7a35'), secondary: slot('Maceta', 'hormigon-pulido', '#a5a49f'), soil: slot('Tierra', 'tierra', '#5a4332'), trunk: WOOD('#6b4a2f', 'madera-nogal') }, build: (w, _d, h) => plantParts(w, h, 0.38) },
  { id: 'plant-small', name: 'Planta pequeña', category: 'decoracion', w: 0.3, d: 0.3, h: 0.45, slots: { primary: slot('Hojas', 'vegetal', '#5f8f45'), secondary: slot('Maceta', 'porcelana', '#e9e2d4'), soil: slot('Tierra', 'tierra', '#5a4332'), trunk: WOOD('#6b4a2f', 'madera-nogal') }, blocks: false, build: (w, _d, h) => plantParts(w, h, 0.16) },
  { id: 'rug', name: 'Alfombra', category: 'decoracion', w: 2.0, d: 1.4, h: 0.012, slots: { primary: slot('Alfombra', 'moqueta', '#c8bba5') }, blocks: false, build: (w, d, h) => [B(0, 0, 0, w, h, d, 'primary')] },
  { id: 'rug-round', name: 'Alfombra redonda', category: 'decoracion', w: 1.6, d: 1.6, h: 0.012, slots: { primary: slot('Alfombra', 'moqueta', '#9aa5ad') }, blocks: false, build: (w, d, h) => [C(0, 0, 0, w, h, d, 'primary')] },
  { id: 'painting', name: 'Cuadro', category: 'decoracion', w: 0.9, d: 0.04, h: 0.6, elevation: 1.35, slots: { primary: slot('Lienzo', 'plastico', '#b9cdb0'), secondary: WOOD('#2a2a2c', 'lacado') }, blocks: false, build: (w, d, h) => [B(0, 0, 0, w, h, d, 'secondary'), B(0, 0.04, d / 2, w - 0.08, h - 0.08, 0.004, 'primary')] },
  {
    id: 'curtain',
    name: 'Cortina',
    category: 'decoracion',
    w: 1.6,
    d: 0.12,
    h: 2.5,
    slots: { primary: slot('Tela', 'tela', '#efe9df'), secondary: METAL() },
    blocks: false,
    build: (w, d, h) => {
      const parts: Part[] = [C(0, h - 0.03, 0, 0.025, w + 0.1, 0.025, 'secondary')].map((p) => ({ ...p, p: [0, h - 0.015, 0] as V3, r: [0, 0, H] as V3 }));
      const n = Math.max(4, Math.round(w / 0.12));
      for (let i = 0; i < n; i++) parts.push(B(-w / 2 + (w / n) * (i + 0.5), 0.02, (i % 2 ? 1 : -1) * d * 0.2, w / n + 0.01, h - 0.07, 0.02, 'primary', [0, (i % 2 ? 1 : -1) * 0.5, 0]));
      return parts;
    },
  },
  { id: 'vase', name: 'Jarrón', category: 'decoracion', w: 0.18, d: 0.18, h: 0.38, elevation: 0.75, slots: { primary: slot('Cerámica', 'porcelana', '#5f88a8') }, blocks: false, build: (w, d, h) => [S(0, h * 0.35, 0, w, h * 0.7, d, 'primary'), C(0, h * 0.6, 0, w * 0.45, h * 0.4, d * 0.45, 'primary')] },
  {
    id: 'fireplace',
    name: 'Chimenea',
    category: 'decoracion',
    w: 1.3,
    d: 0.45,
    h: 1.1,
    slots: { primary: slot('Revestimiento', 'marmol-blanco', '#eeece8'), secondary: METAL(), light: slot('Fuego', 'luz', '#ffb060') },
    light: { y: 0.25, intensity: 0.6, color: '#ff9a40', distance: 4 },
    build: (w, d, h) => [B(0, 0, 0, w, 0.12, d + 0.1, 'primary'), B(-w / 2 + 0.15, 0.12, 0, 0.3, h - 0.22, d, 'primary'), B(w / 2 - 0.15, 0.12, 0, 0.3, h - 0.22, d, 'primary'), B(0, h - 0.1, 0.02, w + 0.1, 0.1, d + 0.06, 'primary'), B(0, 0.12, -d / 2 + 0.05, w - 0.6, h - 0.22, 0.1, 'secondary'), B(0, 0.62, 0, w - 0.6, h - 0.72, d, 'primary'), S(0, 0.22, 0, 0.3, 0.16, 0.12, 'light')],
  },

  // ── Exterior ───────────────────────────────────────────
  {
    id: 'tree',
    name: 'Árbol',
    category: 'exterior',
    w: 3.0,
    d: 3.0,
    h: 5.0,
    slots: { primary: slot('Copa', 'vegetal', '#4d7a35'), trunk: WOOD('#6b4a2f', 'madera-nogal') },
    build: (w, d, h) => [C(0, 0, 0, 0.3, h * 0.5, 0.3, 'trunk'), S(0, h * 0.62, 0, w * 0.85, h * 0.55, d * 0.85, 'primary'), S(w * 0.18, h * 0.75, d * 0.1, w * 0.6, h * 0.4, d * 0.6, 'primary'), S(-w * 0.2, h * 0.55, -d * 0.12, w * 0.6, h * 0.38, d * 0.6, 'primary')],
  },
  { id: 'pine', name: 'Ciprés', category: 'exterior', w: 1.2, d: 1.2, h: 5.0, slots: { primary: slot('Copa', 'vegetal', '#3f6a2e'), trunk: WOOD('#6b4a2f', 'madera-nogal') }, build: (w, d, h) => [C(0, 0, 0, 0.2, h * 0.2, 0.2, 'trunk'), K(0, h * 0.12, 0, w, h * 0.88, d, 'primary')] },
  { id: 'hedge', name: 'Seto', category: 'exterior', w: 2.0, d: 0.6, h: 1.2, slots: { primary: slot('Hojas', 'vegetal', '#46733a') }, build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.2)] },
  { id: 'lounger', name: 'Tumbona', category: 'exterior', w: 0.68, d: 1.95, h: 0.75, slots: { primary: slot('Colchoneta', 'tela', '#efe9df'), secondary: WOOD('#8a6446', 'madera-roble') }, build: (w, d) => [B(0, 0.12, 0.2, w, 0.1, d * 0.75, 'secondary'), R(0, 0.22, 0.2, w - 0.04, 0.07, d * 0.72, 'primary', 0.03), R(0, 0.3, -d / 2 + 0.3, w - 0.04, 0.07, 0.65, 'primary', 0.03, [0.85, 0, 0]), ...legs(w, d * 0.75, 0.12, 0.05, 'secondary', 0.03).map((p) => ({ ...p, p: [p.p[0], p.p[1], p.p[2] + 0.2] as V3 }))] },
  { id: 'umbrella', name: 'Sombrilla', category: 'exterior', w: 2.6, d: 2.6, h: 2.5, slots: { primary: slot('Lona', 'tela', '#efe9df'), secondary: WOOD() }, blocks: false, build: (w, d, h) => [C(0, 0, 0, 0.5, 0.06, 0.5, 'secondary'), C(0, 0.06, 0, 0.05, h - 0.1, 0.05, 'secondary'), K(0, h - 0.5, 0, w, 0.5, d, 'primary')] },
  { id: 'garden-bench', name: 'Banco de jardín', category: 'exterior', w: 1.5, d: 0.62, h: 0.85, slots: { primary: WOOD('#8a6446'), secondary: METAL() }, build: (w, d, h) => [B(0, 0.42, 0.05, w, 0.04, d - 0.15, 'primary'), B(0, 0.5, -d / 2 + 0.04, w, h - 0.5, 0.04, 'primary', [-0.15, 0, 0]), B(-w / 2 + 0.1, 0, 0, 0.05, 0.42, d - 0.1, 'secondary'), B(w / 2 - 0.1, 0, 0, 0.05, 0.42, d - 0.1, 'secondary')] },
  { id: 'bbq', name: 'Barbacoa', category: 'exterior', w: 1.2, d: 0.6, h: 1.05, slots: { primary: METAL(), secondary: METAL('#a7adb3', 'acero') }, build: (w, d, h) => [B(0, 0.1, 0, w * 0.55, h * 0.75, d, 'primary'), B(w * 0.36, h * 0.8, 0, w * 0.28, 0.03, d * 0.9, 'secondary'), B(-w * 0.36, h * 0.8, 0, w * 0.28, 0.03, d * 0.9, 'secondary'), R(0, h * 0.82, 0, w * 0.55, h * 0.18, d, 'primary', 0.06), ...legs(w * 0.55, d, 0.1, 0.05, 'secondary', 0.02)] },
  { id: 'garden-lamp', name: 'Farola de jardín', category: 'exterior', w: 0.25, d: 0.25, h: 1.1, slots: { primary: METAL(), light: LIGHT() }, light: { y: 0.92, intensity: 0.6, color: '#ffd9a0', distance: 6 }, build: (w, d, h) => [C(0, 0, 0, w * 0.8, 0.04, d * 0.8, 'primary'), C(0, 0.04, 0, 0.06, h - 0.25, 0.06, 'primary'), C(0, h - 0.21, 0, w, 0.18, d, 'light'), C(0, h - 0.03, 0, w + 0.03, 0.03, d + 0.03, 'primary')] },
  {
    id: 'fence',
    name: 'Valla de madera',
    category: 'exterior',
    w: 2.0,
    d: 0.06,
    h: 1.2,
    slots: { primary: WOOD('#8a6446') },
    build: (w, d, h) => {
      const parts: Part[] = [B(0, h * 0.2, -d / 2 + 0.01, w, 0.06, 0.02, 'primary'), B(0, h * 0.75, -d / 2 + 0.01, w, 0.06, 0.02, 'primary')];
      const n = Math.max(2, Math.round(w / 0.14));
      for (let i = 0; i < n; i++) parts.push(B(-w / 2 + (w / n) * (i + 0.5), 0, 0.01, w / n - 0.03, h, 0.02, 'primary'));
      return parts;
    },
  },
  {
    id: 'car',
    name: 'Coche',
    category: 'exterior',
    w: 1.85,
    d: 4.5,
    h: 1.45,
    slots: { primary: slot('Carrocería', 'lacado', '#b3261e'), secondary: slot('Lunas', 'vidrio', '#33424d'), tyres: METAL('#1b1b1c'), chrome: METAL('#c4c7cb', 'aluminio') },
    build: (w, d, h) => {
      const wheelD = Math.min(0.68, h * 0.47);
      const parts: Part[] = [R(0, 0.22, 0, w, h * 0.38, d, 'primary', 0.12), R(0, 0.22 + h * 0.36, -d * 0.05, w * 0.86, h * 0.36, d * 0.5, 'primary', 0.12), R(0, 0.22 + h * 0.38, -d * 0.05, w * 0.87, h * 0.28, d * 0.46, 'secondary', 0.1)];
      for (const x of [-w / 2 + 0.12, w / 2 - 0.12])
        for (const z of [-d * 0.32, d * 0.32]) {
          parts.push(Cc(x, wheelD / 2, z, wheelD, 0.24, wheelD, 'tyres', [0, 0, H]));
          parts.push({ ...Cc(x + Math.sign(x) * 0.121, wheelD / 2, z, wheelD * 0.6, 0.01, wheelD * 0.6, 'chrome', [0, 0, H]), noPlan: true });
        }
      return parts;
    },
  },
];

export const CATALOG_BY_ID = new Map(CATALOG.map((c) => [c.id, c]));

export function getCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG_BY_ID.get(id);
}

export const CATEGORY_ORDER: FurnitureCategory[] = [
  'sofas',
  'mesas',
  'sillas',
  'camas',
  'armarios',
  'escritorios',
  'televisores',
  'electrodomesticos',
  'cocina',
  'sanitarios',
  'duchas',
  'lamparas',
  'decoracion',
  'exterior',
];
