/** Televisores. */
import type { CatalogItem } from '../types';
import { B, LACQ, METAL, R, SCREEN, WOOD, legs } from './parts';
import { TV_BEZEL, TV_STAND_H, inchesFromWidth, pint, tvSize } from '../params';

export const MEDIA: CatalogItem[] = [
  {
    id: 'tv-55',
    name: 'Televisor con peana',
    category: 'televisores',
    ...tvSize(55, true),
    elevation: 0.5,
    slots: { primary: METAL(), screen: SCREEN() },
    blocks: false,
    params: [{ key: 'inches', label: 'Pulgadas', kind: 'int', default: 55, min: 24, max: 110, unit: '"', hint: 'Diagonal de la pantalla (formato 16:9)' }],
    derive: (p) => tvSize(pint(p, 'inches', 55, 24, 110), true),
    fromSize: (s) => ({ inches: inchesFromWidth(s.w) }),
    build: (w, d, h) => {
      const sw = Math.min(0.6, w * 0.32);
      return [B(0, TV_STAND_H, 0, w, h - TV_STAND_H, 0.045, 'primary'), B(0, TV_STAND_H + TV_BEZEL, 0.0235, w - 2 * TV_BEZEL, h - TV_STAND_H - 2 * TV_BEZEL, 0.002, 'screen'), B(0, 0, -0.01, sw, 0.012, d * 0.9, 'primary'), B(0, 0.012, -0.03, 0.06, TV_STAND_H, 0.04, 'primary')];
    },
  },
  {
    id: 'tv-65-wall',
    name: 'Televisor de pared',
    category: 'televisores',
    ...tvSize(65, false),
    elevation: 0.95,
    slots: { primary: METAL(), screen: SCREEN() },
    blocks: false,
    params: [{ key: 'inches', label: 'Pulgadas', kind: 'int', default: 65, min: 24, max: 110, unit: '"', hint: 'Diagonal de la pantalla (formato 16:9)' }],
    derive: (p) => tvSize(pint(p, 'inches', 65, 24, 110), false),
    fromSize: (s) => ({ inches: inchesFromWidth(s.w) }),
    build: (w, d, h) => [B(0, 0, 0, w, h, d, 'primary'), B(0, TV_BEZEL, d / 2, w - 2 * TV_BEZEL, h - 2 * TV_BEZEL, 0.002, 'screen')],
  },
  { id: 'tv-stand', name: 'Mueble de TV', category: 'televisores', w: 1.8, d: 0.42, h: 0.5, slots: { primary: WOOD('#5f3f29', 'madera-nogal'), secondary: LACQ('#f4f4f1') }, build: (w, d, h) => [B(0, 0.1, 0, w, h - 0.1, d, 'primary'), B(-w / 4, 0.12, d / 2, w / 2 - 0.02, h - 0.14, 0.01, 'secondary'), B(w / 4, 0.12, d / 2, w / 2 - 0.02, h - 0.14, 0.01, 'secondary'), ...legs(w, d, 0.1, 0.03, 'primary', 0.06)] },
  { id: 'soundbar', name: 'Barra de sonido', category: 'televisores', w: 0.9, d: 0.1, h: 0.07, elevation: 0.5, slots: { primary: METAL() }, blocks: false, build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.02)] },
];
