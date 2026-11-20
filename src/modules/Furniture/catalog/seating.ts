/** Sofás y sillas. */
import type { CatalogItem } from '../types';
import { slot, B, C, FABRIC, legs, METAL, R, sofa, WOOD } from './parts';
import type { V3 } from './parts';

export const SEATING: CatalogItem[] = [
  { id: 'sofa-3', name: 'Sofá 3 plazas', category: 'sofas', w: 2.2, d: 0.95, h: 0.85, slots: { primary: FABRIC(), secondary: WOOD('#5f3f29', 'madera-nogal'), accent: slot('Cojines', 'tela', '#d9b44a') }, build: (w, d, h) => sofa(w, d, h, 3) },
  { id: 'sofa-2', name: 'Sofá 2 plazas', category: 'sofas', w: 1.6, d: 0.92, h: 0.85, slots: { primary: FABRIC('#c9bba6'), secondary: WOOD('#5f3f29', 'madera-nogal'), accent: slot('Cojines', 'tela', '#7f8f80') }, build: (w, d, h) => sofa(w, d, h, 2) },
  {
    id: 'sofa-l',
    name: 'Sofá rinconera',
    category: 'sofas',
    w: 2.8,
    d: 1.7,
    h: 0.85,
    slots: { primary: FABRIC('#6f747a'), secondary: METAL(), accent: slot('Cojines', 'tela', '#d9b44a') },
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
  {
    id: 'entry-bench',
    name: 'Banco de recibidor',
    category: 'sillas',
    w: 1.0,
    d: 0.38,
    h: 0.48,
    slots: { primary: WOOD(), secondary: FABRIC('#d6c7a8') },
    build: (w, d, h) => [R(0, h - 0.06, 0, w, 0.06, d, 'secondary', 0.02), B(0, h - 0.09, 0, w, 0.03, d, 'primary'), B(0, 0.08, 0, w - 0.04, 0.02, d - 0.04, 'primary'), B(-w / 2 + 0.02, 0, 0, 0.04, h - 0.09, d, 'primary'), B(w / 2 - 0.02, 0, 0, 0.04, h - 0.09, d, 'primary')],
  },
];
