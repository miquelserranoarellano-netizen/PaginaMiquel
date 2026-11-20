/** Decoración. */
import type { CatalogItem, Part } from '../types';
import { B, C, H, METAL, plantParts, S, slot, WOOD } from './parts';
import type { V3 } from './parts';

export const DECOR: CatalogItem[] = [
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
  {
    id: 'coat-rack',
    name: 'Perchero',
    category: 'decoracion',
    w: 0.45,
    d: 0.45,
    h: 1.8,
    slots: { primary: WOOD('#5f3f29', 'madera-nogal') },
    blocks: false,
    build: (w, d, h) => {
      const parts: Part[] = [C(0, 0, 0, 0.04, h, 0.04, 'primary'), C(0, 0, 0, w * 0.55, 0.03, d * 0.55, 'primary')];
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + 0.4;
        parts.push({ s: 'box', p: [Math.cos(a) * 0.08, h - 0.15, -Math.sin(a) * 0.08], d: [0.18, 0.025, 0.025], r: [0, a, 0.5], m: 'primary', noPlan: true });
      }
      return parts;
    },
  },
];
