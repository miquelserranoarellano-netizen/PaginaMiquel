/** Escritorios. */
import type { CatalogItem } from '../types';
import { B, LACQ, METAL, SCREEN, WOOD, legs } from './parts';

export const WORK: CatalogItem[] = [
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
];
