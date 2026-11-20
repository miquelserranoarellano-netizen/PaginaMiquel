/** Cocina. */
import type { CatalogItem, Part } from '../types';
import { B, C, Cc, H, LACQ, METAL, WOOD, kitchenBase, slot } from './parts';

export const KITCHEN: CatalogItem[] = [
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
];
