/** Mesas. */
import type { CatalogItem, Part } from '../types';
import { B, C, drawers, FABRIC, LACQ, legs, METAL, R, slot, WOOD } from './parts';
import type { V3 } from './parts';

export const TABLES: CatalogItem[] = [
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
  {
    id: 'console-table',
    name: 'Consola de recibidor',
    category: 'mesas',
    w: 1.1,
    d: 0.32,
    h: 0.8,
    slots: { primary: WOOD('#5f3f29', 'madera-nogal'), secondary: METAL('#c9a24f', 'laton') },
    build: (w, d, h) => [B(0, h - 0.03, 0, w, 0.03, d, 'primary'), B(0, 0.12, 0, w - 0.08, 0.02, d - 0.04, 'primary'), ...legs(w, d, h - 0.03, 0.025, 'secondary', 0.03)],
  },
];
