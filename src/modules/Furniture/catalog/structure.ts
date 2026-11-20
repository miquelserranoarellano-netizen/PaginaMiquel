/** Escaleras y elementos estructurales. */
import type { CatalogItem, Part } from '../types';
import { pbool, pint, pnum } from '../params';
import { B, C, GLASS, LACQ, METAL, WOOD, slot } from './parts';

const RUN = 0.27; // huella de cada peldaño

export const STRUCTURE: CatalogItem[] = [
  {
    id: 'stairs-straight',
    name: 'Escalera recta',
    category: 'estructura',
    w: 0.95,
    d: 16 * RUN,
    h: 2.95,
    slots: { primary: WOOD('#b98a59'), secondary: LACQ('#f4f4f1', 'Estructura'), rail: METAL() },
    params: [
      { key: 'steps', label: 'Peldaños', kind: 'int', default: 16, min: 3, max: 24, hint: 'Huella de 27 cm por peldaño' },
      { key: 'height', label: 'Altura a salvar', kind: 'number', default: 2.95, min: 0.5, max: 6, step: 0.01, unit: 'm', hint: 'Altura libre de la planta + forjado' },
      { key: 'railing', label: 'Con barandilla', kind: 'bool', default: true },
    ],
    derive: (p) => ({ d: Math.round(pint(p, 'steps', 16, 3, 24) * RUN * 1000) / 1000, h: pnum(p, 'height', 2.95) }),
    build: (w, d, h, p) => {
      const n = pint(p, 'steps', 16, 3, 24);
      const rise = h / n;
      const run = d / n;
      const parts: Part[] = [];
      // Sube hacia el fondo (−z): el primer peldaño está en el frente.
      for (let i = 0; i < n; i++) {
        const z = d / 2 - (i + 0.5) * run;
        parts.push(B(0, (i + 1) * rise - 0.04, z - 0.01, w, 0.04, run + 0.02, 'primary'));
        parts.push({ ...B(0, i * rise, z + run / 2 - 0.01, w - 0.02, rise - 0.04, 0.02, 'secondary'), noPlan: true });
      }
      // Zanca maciza bajo los peldaños
      for (let i = 0; i < n; i++) parts.push({ ...B(0, 0, d / 2 - (i + 0.5) * run, w - 0.04, Math.max(0.01, (i + 1) * rise - 0.04), run, 'secondary'), noPlan: true });
      if (pbool(p, 'railing', true)) {
        const posts = Math.max(2, Math.round(n / 4) + 1);
        for (let k = 0; k < posts; k++) {
          const i = Math.min(n - 1, Math.round((k * (n - 1)) / (posts - 1)));
          const z = d / 2 - (i + 0.5) * run;
          parts.push({ ...B(w / 2 - 0.03, (i + 1) * rise, z, 0.03, 0.9, 0.03, 'rail'), noPlan: true });
        }
        const len = Math.hypot(d, h);
        parts.push({ s: 'box', p: [w / 2 - 0.03, h / 2 + 0.9, 0], d: [0.04, 0.04, len], r: [Math.atan2(h, d), 0, 0], m: 'rail', noPlan: true });
      }
      return parts;
    },
  },
  {
    id: 'stairs-spiral',
    name: 'Escalera de caracol',
    category: 'estructura',
    w: 1.6,
    d: 1.6,
    h: 2.95,
    slots: { primary: WOOD('#b98a59'), rail: METAL() },
    params: [
      { key: 'steps', label: 'Peldaños', kind: 'int', default: 14, min: 6, max: 20 },
      { key: 'height', label: 'Altura a salvar', kind: 'number', default: 2.95, min: 1, max: 6, step: 0.01, unit: 'm' },
    ],
    derive: (p) => ({ h: pnum(p, 'height', 2.95) }),
    build: (w, d, h, p) => {
      const n = pint(p, 'steps', 14, 6, 20);
      const rise = h / n;
      const r = Math.min(w, d) / 2;
      const parts: Part[] = [C(0, 0, 0, 0.12, h + 0.9, 0.12, 'rail')];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 1.75;
        parts.push({ s: 'box', p: [Math.cos(a) * r * 0.52, (i + 1) * rise - 0.025, -Math.sin(a) * r * 0.52], d: [r * 0.95, 0.04, r * 0.5], r: [0, a, 0], m: 'primary' });
        parts.push({ ...B(Math.cos(a) * r * 0.97, (i + 1) * rise, -Math.sin(a) * r * 0.97, 0.025, 0.9, 0.025, 'rail'), noPlan: true });
      }
      return parts;
    },
  },
  { id: 'column', name: 'Pilar', category: 'estructura', w: 0.3, d: 0.3, h: 2.7, slots: { primary: slot('Acabado', 'pintura', '#f3f1ec') }, build: (w, d, h) => [B(0, 0, 0, w, h, d, 'primary')] },
  {
    id: 'glass-railing',
    name: 'Barandilla de vidrio',
    category: 'estructura',
    w: 2.0,
    d: 0.06,
    h: 1.0,
    slots: { primary: GLASS(), rail: METAL('#c4c7cb', 'aluminio') },
    build: (w, d, h) => [B(0, 0.04, 0, w, h - 0.08, 0.012, 'primary'), B(0, 0, 0, w, 0.06, d, 'rail'), B(0, h - 0.04, 0, w, 0.04, d, 'rail')],
  },
];
