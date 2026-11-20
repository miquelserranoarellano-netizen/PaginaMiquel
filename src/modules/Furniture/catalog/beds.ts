/** Camas. */
import type { CatalogItem, Part } from '../types';
import { B, bed, FABRIC, LACQ, legs, R, slot, WOOD } from './parts';

export const BEDS: CatalogItem[] = [
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
  {
    id: 'bunk-bed',
    name: 'Litera',
    category: 'camas',
    w: 0.97,
    d: 2.0,
    h: 1.65,
    slots: { primary: WOOD('#d8b48a', 'madera-clara'), mattress: slot('Sábanas', 'colchon', '#f1eee8'), secondary: slot('Edredón', 'tela', '#9fb7a4') },
    build: (w, d, h) => {
      const parts: Part[] = [];
      for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) for (const z of [-d / 2 + 0.03, d / 2 - 0.03]) parts.push(B(x, 0, z, 0.06, h, 0.06, 'primary'));
      for (const y0 of [0.22, h - 0.62]) {
        parts.push(B(0, y0, 0, w - 0.06, 0.05, d - 0.06, 'primary'), R(0, y0 + 0.05, 0, w - 0.1, 0.16, d - 0.1, 'mattress', 0.04), R(0, y0 + 0.17, 0.25, w - 0.08, 0.06, d * 0.6, 'secondary', 0.03));
      }
      parts.push(B(0, h - 0.4, d / 2 - 0.03, w - 0.06, 0.04, 0.03, 'primary'), B(0, h - 0.2, d / 2 - 0.03, w - 0.06, 0.04, 0.03, 'primary'));
      for (let i = 1; i < 5; i++) parts.push({ ...B(w / 2 + 0.02, (h * i) / 5, d / 2 - 0.35, 0.03, 0.03, 0.4, 'primary'), noPlan: true });
      return parts;
    },
  },
];
