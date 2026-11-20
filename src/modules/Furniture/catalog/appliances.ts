/** Electrodomésticos. */
import type { CatalogItem } from '../types';
import { B, Cc, GLASS, H, LACQ, METAL, R, SCREEN, slot } from './parts';

export const APPLIANCES: CatalogItem[] = [
  { id: 'fridge', name: 'Frigorífico combi', category: 'electrodomesticos', w: 0.6, d: 0.66, h: 1.86, slots: { primary: slot('Acabado', 'acero', '#a7adb3'), secondary: METAL() }, build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.015), B(0, h * 0.62, d / 2 + 0.003, w - 0.01, 0.008, 0.01, 'secondary'), B(-w / 2 + 0.06, h * 0.68, d / 2 + 0.02, 0.02, 0.4, 0.03, 'secondary'), B(-w / 2 + 0.06, h * 0.38, d / 2 + 0.02, 0.02, 0.3, 0.03, 'secondary')] },
  { id: 'fridge-american', name: 'Frigorífico americano', category: 'electrodomesticos', w: 0.91, d: 0.72, h: 1.78, slots: { primary: slot('Acabado', 'acero', '#a7adb3'), secondary: METAL() }, build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.015), B(0, 0, d / 2 + 0.003, 0.008, h, 0.01, 'secondary'), B(-0.05, h * 0.35, d / 2 + 0.03, 0.02, 0.7, 0.03, 'secondary'), B(0.05, h * 0.35, d / 2 + 0.03, 0.02, 0.7, 0.03, 'secondary')] },
  { id: 'washer', name: 'Lavadora', category: 'electrodomesticos', w: 0.6, d: 0.6, h: 0.85, slots: { primary: LACQ('#f4f4f1', 'Carcasa'), secondary: GLASS(), tertiary: METAL('#a7adb3', 'acero') }, build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.015), Cc(0, h * 0.45, d / 2 + 0.01, w * 0.62, 0.04, w * 0.62, 'tertiary', [H, 0, 0]), Cc(0, h * 0.45, d / 2 + 0.03, w * 0.48, 0.02, w * 0.48, 'secondary', [H, 0, 0]), B(0, h - 0.1, d / 2, w - 0.04, 0.07, 0.01, 'tertiary')] },
  { id: 'dryer', name: 'Secadora', category: 'electrodomesticos', w: 0.6, d: 0.6, h: 0.85, slots: { primary: LACQ('#e8ecef', 'Carcasa'), secondary: GLASS(), tertiary: METAL() }, build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.015), Cc(0, h * 0.45, d / 2 + 0.01, w * 0.62, 0.04, w * 0.62, 'tertiary', [H, 0, 0]), Cc(0, h * 0.45, d / 2 + 0.03, w * 0.48, 0.02, w * 0.48, 'secondary', [H, 0, 0])] },
  { id: 'dishwasher', name: 'Lavavajillas', category: 'electrodomesticos', w: 0.6, d: 0.6, h: 0.85, slots: { primary: slot('Acabado', 'acero', '#a7adb3'), secondary: METAL() }, build: (w, d, h) => [B(0, 0, 0, w, h, d, 'primary'), B(0, h - 0.12, d / 2 + 0.015, w - 0.1, 0.02, 0.025, 'secondary')] },
  {
    id: 'oven-column',
    name: 'Columna de horno',
    category: 'electrodomesticos',
    w: 0.6,
    d: 0.6,
    h: 2.2,
    slots: { primary: LACQ('#f4f4f1'), secondary: SCREEN(), metal: METAL('#a7adb3', 'acero') },
    build: (w, d, h) => [B(0, 0, 0, w, h, d, 'primary'), B(0, 0.85, d / 2, w - 0.04, 0.58, 0.012, 'secondary'), B(0, 1.25, d / 2 + 0.02, w - 0.12, 0.02, 0.025, 'metal'), B(0, 1.47, d / 2, w - 0.04, 0.38, 0.012, 'secondary')],
  },
  { id: 'microwave', name: 'Microondas', category: 'electrodomesticos', w: 0.5, d: 0.38, h: 0.3, elevation: 0.92, slots: { primary: METAL('#a7adb3', 'acero'), secondary: SCREEN() }, blocks: false, build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.01), B(-0.05, 0.03, d / 2, w * 0.65, h - 0.06, 0.005, 'secondary')] },
];
