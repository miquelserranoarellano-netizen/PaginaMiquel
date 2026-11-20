/** Climatización: aire acondicionado, calefacción y ventilación. */
import type { CatalogItem, Part } from '../types';
import { B, C, Cc, CHROME, H, LACQ, LIGHT, METAL, R, slot } from './parts';

export const CLIMATE: CatalogItem[] = [
  {
    id: 'ac-split',
    name: 'Aire acondicionado (split)',
    category: 'climatizacion',
    w: 0.9,
    d: 0.23,
    h: 0.3,
    elevation: 2.15,
    slots: { primary: LACQ('#f7f7f5', 'Carcasa'), secondary: METAL('#c4c7cb', 'aluminio') },
    blocks: false,
    build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.05), B(0, 0.03, d / 2 - 0.02, w * 0.92, 0.035, 0.03, 'secondary')],
  },
  {
    id: 'radiator',
    name: 'Radiador',
    category: 'climatizacion',
    w: 0.8,
    d: 0.09,
    h: 0.6,
    elevation: 0.12,
    slots: { primary: LACQ('#f4f4f1', 'Acabado') },
    blocks: false,
    build: (w, d, h) => {
      const parts: Part[] = [];
      const n = Math.max(3, Math.round(w / 0.08));
      for (let i = 0; i < n; i++) parts.push(R(-w / 2 + (w / n) * (i + 0.5), 0, 0, w / n - 0.012, h, d, 'primary', 0.015));
      parts.push(B(0, h * 0.08, 0, w, 0.03, d * 0.4, 'primary'), B(0, h * 0.88, 0, w, 0.03, d * 0.4, 'primary'));
      return parts;
    },
  },
  {
    id: 'ceiling-fan',
    name: 'Ventilador de techo con luz',
    category: 'climatizacion',
    w: 1.3,
    d: 1.3,
    h: 0.42,
    elevation: 2.28,
    slots: { primary: WOODLIKE(), secondary: METAL('#c9a24f', 'laton'), light: LIGHT() },
    light: { y: 0.15, intensity: 0.8, color: '#ffe9c4', distance: 6 },
    blocks: false,
    build: (w, _d, h) => {
      const parts: Part[] = [C(0, h - 0.04, 0, 0.14, 0.04, 0.14, 'secondary'), C(0, 0.2, 0, 0.025, h - 0.24, 0.025, 'secondary'), C(0, 0.12, 0, 0.22, 0.1, 0.22, 'secondary'), { s: 'sphere', p: [0, 0.1, 0], d: [0.2, 0.12, 0.2], m: 'light' }];
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        parts.push({ s: 'box', p: [Math.cos(a) * w * 0.27, 0.17, -Math.sin(a) * w * 0.27], d: [w * 0.42, 0.012, 0.13], r: [0, a, 0.06], m: 'primary' });
      }
      return parts;
    },
  },
  {
    id: 'water-heater',
    name: 'Termo eléctrico',
    category: 'climatizacion',
    w: 0.45,
    d: 0.47,
    h: 0.9,
    elevation: 1.2,
    slots: { primary: LACQ('#f7f7f5', 'Carcasa'), secondary: CHROME() },
    blocks: false,
    build: (w, d, h) => [C(0, 0, 0, w, h, d, 'primary'), C(-0.08, -0.15, 0, 0.025, 0.15, 0.025, 'secondary'), C(0.08, -0.15, 0, 0.025, 0.15, 0.025, 'secondary')],
  },
  {
    id: 'heat-pump',
    name: 'Bomba de calor (exterior)',
    category: 'climatizacion',
    w: 0.95,
    d: 0.4,
    h: 0.82,
    slots: { primary: LACQ('#eceeef', 'Carcasa'), secondary: METAL() },
    build: (w, d, h) => [B(0, 0.05, 0, w, h - 0.05, d, 'primary'), Cc(-w * 0.12, h * 0.52, d / 2 + 0.005, h * 0.62, 0.01, h * 0.62, 'secondary', [H, 0, 0]), B(-w / 2 + 0.08, 0, 0, 0.06, 0.05, d, 'secondary'), B(w / 2 - 0.08, 0, 0, 0.06, 0.05, d, 'secondary')],
  },
];

function WOODLIKE() {
  return slot('Aspas', 'madera-nogal', '#5f3f29');
}
