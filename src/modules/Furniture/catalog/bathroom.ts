/** Sanitarios, duchas y bañeras. */
import type { CatalogItem, Part } from '../types';
import { B, C, Cc, CHROME, GLASS, H, METAL, PORC, R, slot, WOOD } from './parts';

export const BATHROOM: CatalogItem[] = [
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
  {
    id: 'double-vanity',
    name: 'Lavabo doble con mueble',
    category: 'sanitarios',
    w: 1.4,
    d: 0.48,
    h: 0.86,
    slots: { primary: WOOD(), secondary: PORC(), tertiary: CHROME() },
    build: (w, d, h) => {
      const parts: Part[] = [B(0, 0.2, 0, w, h - 0.24, d - 0.02, 'primary'), R(0, h - 0.04, 0.01, w, 0.06, d, 'secondary', 0.02)];
      for (const x of [-w / 4, w / 4]) parts.push(C(x, h + 0.01, 0.04, w * 0.28, 0.03, d * 0.5, 'tertiary'), C(x, h + 0.02, -d / 2 + 0.06, 0.03, 0.2, 0.03, 'tertiary'));
      return parts;
    },
  },
];
