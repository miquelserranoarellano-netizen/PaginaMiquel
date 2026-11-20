/** Exterior. */
import type { CatalogItem, Part } from '../types';
import { B, C, Cc, H, K, legs, LIGHT, METAL, PORC, R, S, slot, WOOD } from './parts';
import type { V3 } from './parts';

export const OUTDOOR: CatalogItem[] = [
  {
    id: 'tree',
    name: 'Árbol',
    category: 'exterior',
    w: 3.0,
    d: 3.0,
    h: 5.0,
    slots: { primary: slot('Copa', 'vegetal', '#4d7a35'), trunk: WOOD('#6b4a2f', 'madera-nogal') },
    build: (w, d, h) => [C(0, 0, 0, 0.3, h * 0.5, 0.3, 'trunk'), S(0, h * 0.62, 0, w * 0.85, h * 0.55, d * 0.85, 'primary'), S(w * 0.18, h * 0.75, d * 0.1, w * 0.6, h * 0.4, d * 0.6, 'primary'), S(-w * 0.2, h * 0.55, -d * 0.12, w * 0.6, h * 0.38, d * 0.6, 'primary')],
  },
  { id: 'pine', name: 'Ciprés', category: 'exterior', w: 1.2, d: 1.2, h: 5.0, slots: { primary: slot('Copa', 'vegetal', '#3f6a2e'), trunk: WOOD('#6b4a2f', 'madera-nogal') }, build: (w, d, h) => [C(0, 0, 0, 0.2, h * 0.2, 0.2, 'trunk'), K(0, h * 0.12, 0, w, h * 0.88, d, 'primary')] },
  { id: 'hedge', name: 'Seto', category: 'exterior', w: 2.0, d: 0.6, h: 1.2, slots: { primary: slot('Hojas', 'vegetal', '#46733a') }, build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.2)] },
  { id: 'lounger', name: 'Tumbona', category: 'exterior', w: 0.68, d: 1.95, h: 0.75, slots: { primary: slot('Colchoneta', 'tela', '#efe9df'), secondary: WOOD('#8a6446', 'madera-roble') }, build: (w, d) => [B(0, 0.12, 0.2, w, 0.1, d * 0.75, 'secondary'), R(0, 0.22, 0.2, w - 0.04, 0.07, d * 0.72, 'primary', 0.03), R(0, 0.3, -d / 2 + 0.3, w - 0.04, 0.07, 0.65, 'primary', 0.03, [0.85, 0, 0]), ...legs(w, d * 0.75, 0.12, 0.05, 'secondary', 0.03).map((p) => ({ ...p, p: [p.p[0], p.p[1], p.p[2] + 0.2] as V3 }))] },
  { id: 'umbrella', name: 'Sombrilla', category: 'exterior', w: 2.6, d: 2.6, h: 2.5, slots: { primary: slot('Lona', 'tela', '#efe9df'), secondary: WOOD() }, blocks: false, build: (w, d, h) => [C(0, 0, 0, 0.5, 0.06, 0.5, 'secondary'), C(0, 0.06, 0, 0.05, h - 0.1, 0.05, 'secondary'), K(0, h - 0.5, 0, w, 0.5, d, 'primary')] },
  { id: 'garden-bench', name: 'Banco de jardín', category: 'exterior', w: 1.5, d: 0.62, h: 0.85, slots: { primary: WOOD('#8a6446'), secondary: METAL() }, build: (w, d, h) => [B(0, 0.42, 0.05, w, 0.04, d - 0.15, 'primary'), B(0, 0.5, -d / 2 + 0.04, w, h - 0.5, 0.04, 'primary', [-0.15, 0, 0]), B(-w / 2 + 0.1, 0, 0, 0.05, 0.42, d - 0.1, 'secondary'), B(w / 2 - 0.1, 0, 0, 0.05, 0.42, d - 0.1, 'secondary')] },
  { id: 'bbq', name: 'Barbacoa', category: 'exterior', w: 1.2, d: 0.6, h: 1.05, slots: { primary: METAL(), secondary: METAL('#a7adb3', 'acero') }, build: (w, d, h) => [B(0, 0.1, 0, w * 0.55, h * 0.75, d, 'primary'), B(w * 0.36, h * 0.8, 0, w * 0.28, 0.03, d * 0.9, 'secondary'), B(-w * 0.36, h * 0.8, 0, w * 0.28, 0.03, d * 0.9, 'secondary'), R(0, h * 0.82, 0, w * 0.55, h * 0.18, d, 'primary', 0.06), ...legs(w * 0.55, d, 0.1, 0.05, 'secondary', 0.02)] },
  { id: 'garden-lamp', name: 'Farola de jardín', category: 'exterior', w: 0.25, d: 0.25, h: 1.1, slots: { primary: METAL(), light: LIGHT() }, light: { y: 0.92, intensity: 0.6, color: '#ffd9a0', distance: 6 }, build: (w, d, h) => [C(0, 0, 0, w * 0.8, 0.04, d * 0.8, 'primary'), C(0, 0.04, 0, 0.06, h - 0.25, 0.06, 'primary'), C(0, h - 0.21, 0, w, 0.18, d, 'light'), C(0, h - 0.03, 0, w + 0.03, 0.03, d + 0.03, 'primary')] },
  {
    id: 'fence',
    name: 'Valla de madera',
    category: 'exterior',
    w: 2.0,
    d: 0.06,
    h: 1.2,
    slots: { primary: WOOD('#8a6446') },
    build: (w, d, h) => {
      const parts: Part[] = [B(0, h * 0.2, -d / 2 + 0.01, w, 0.06, 0.02, 'primary'), B(0, h * 0.75, -d / 2 + 0.01, w, 0.06, 0.02, 'primary')];
      const n = Math.max(2, Math.round(w / 0.14));
      for (let i = 0; i < n; i++) parts.push(B(-w / 2 + (w / n) * (i + 0.5), 0, 0.01, w / n - 0.03, h, 0.02, 'primary'));
      return parts;
    },
  },
  {
    id: 'car',
    name: 'Coche',
    category: 'exterior',
    w: 1.85,
    d: 4.5,
    h: 1.45,
    slots: {
      primary: slot('Carrocería', 'lacado', '#b3261e'),
      // Lunas tintadas (opacas y con brillo, como se ven desde fuera)
      secondary: slot('Lunas', 'lacado', '#1b232a'),
      tyres: METAL('#1b1b1c'),
      chrome: METAL('#c4c7cb', 'aluminio'),
      trim: slot('Paragolpes y molduras', 'plastico', '#1f2022'),
      lights: slot('Faros', 'lacado', '#f1f4f7'),
      tail: slot('Pilotos', 'lacado', '#8e1414'),
    },
    build: (w, d, h) => {
      // Ruedas, carrocería en dos alturas (bajos y cintura), habitáculo con
      // parabrisas y luneta inclinados, techo, faros, pilotos y retrovisores.
      const rW = Math.min(0.34, h * 0.24);
      const body0 = 0.2;
      const lowY = Math.max(0.5, h * 0.4);
      const beltY = Math.max(0.66, h * 0.48);
      const axleF = d / 2 - Math.min(0.9, d * 0.2);
      const axleR = -d / 2 + Math.min(0.95, d * 0.21);
      const cabinL = d * 0.52;
      const cabinZ = -d * 0.05;
      const roofL = cabinL * 0.5;
      const roofZ = cabinZ - d * 0.02;
      const gw = w * 0.82;
      const parts: Part[] = [
        // Bajos y cintura (capó y maletero algo más bajos que la línea de cintura)
        R(0, body0, 0, w, lowY - body0, d, 'primary', 0.15),
        R(0, lowY - 0.05, -d * 0.015, w * 0.97, beltY - lowY + 0.05, d * 0.86, 'primary', 0.12),
        // Techo
        R(0, h - 0.07, roofZ, gw - 0.02, 0.07, roofL + 0.06, 'primary', 0.03),
        // Paragolpes y molduras inferiores
        { ...R(0, body0 - 0.02, d / 2 - 0.09, w * 0.98, 0.2, 0.2, 'trim', 0.06), noPlan: true },
        { ...R(0, body0 - 0.02, -d / 2 + 0.09, w * 0.98, 0.2, 0.2, 'trim', 0.06), noPlan: true },
        { ...B(-w / 2 + 0.005, body0 + 0.02, 0, 0.02, 0.1, d * 0.62, 'trim'), noPlan: true },
        { ...B(w / 2 - 0.005, body0 + 0.02, 0, 0.02, 0.1, d * 0.62, 'trim'), noPlan: true },
        // Faros, calandra y pilotos
        { ...B(-w * 0.32, lowY - 0.13, d / 2 - 0.02, 0.36, 0.09, 0.05, 'lights'), noPlan: true },
        { ...B(w * 0.32, lowY - 0.13, d / 2 - 0.02, 0.36, 0.09, 0.05, 'lights'), noPlan: true },
        { ...B(0, lowY - 0.24, d / 2 - 0.015, w * 0.34, 0.12, 0.04, 'trim'), noPlan: true },
        { ...B(-w * 0.33, lowY - 0.1, -d / 2 + 0.02, 0.32, 0.08, 0.05, 'tail'), noPlan: true },
        { ...B(w * 0.33, lowY - 0.1, -d / 2 + 0.02, 0.32, 0.08, 0.05, 'tail'), noPlan: true },
        // Retrovisores
        { ...R(-w / 2 - 0.05, beltY - 0.02, cabinZ + cabinL / 2 - 0.08, 0.12, 0.08, 0.06, 'primary', 0.02), noPlan: true },
        { ...R(w / 2 + 0.05, beltY - 0.02, cabinZ + cabinL / 2 - 0.08, 0.12, 0.08, 0.06, 'primary', 0.02), noPlan: true },
      ];
      // Habitáculo acristalado: se estrecha hacia el techo (parabrisas y luneta inclinados).
      const gh = h - 0.07 - (beltY - 0.03);
      parts.push({ s: 'taper', p: [0, beltY - 0.03 + gh / 2, cabinZ], d: [gw, gh, cabinL], taper: [gw - 0.14, roofL + 0.04, roofZ - cabinZ], m: 'secondary', noPlan: true });
      for (const x of [-w / 2 + 0.13, w / 2 - 0.13])
        for (const z of [axleF, axleR]) {
          parts.push(Cc(x, rW, z, rW * 2, 0.23, rW * 2, 'tyres', [0, 0, H]));
          parts.push({ ...Cc(x + Math.sign(x) * 0.115, rW, z, rW * 1.25, 0.012, rW * 1.25, 'chrome', [0, 0, H]), noPlan: true });
        }
      return parts;
    },
  },
  {
    id: 'pergola',
    name: 'Pérgola',
    category: 'exterior',
    w: 3.5,
    d: 3.0,
    h: 2.5,
    slots: { primary: WOOD('#8a6446') },
    blocks: false,
    build: (w, d, h) => {
      const parts: Part[] = [];
      for (const x of [-w / 2 + 0.07, w / 2 - 0.07]) for (const z of [-d / 2 + 0.07, d / 2 - 0.07]) parts.push(B(x, 0, z, 0.12, h, 0.12, 'primary'));
      for (const z of [-d / 2 + 0.07, d / 2 - 0.07]) parts.push(B(0, h - 0.2, z, w + 0.2, 0.18, 0.08, 'primary'));
      const n = Math.max(4, Math.round(w / 0.35));
      for (let i = 0; i < n; i++) parts.push({ ...B(-w / 2 + (w / n) * (i + 0.5), h - 0.06, 0, 0.05, 0.12, d + 0.3, 'primary'), noPlan: i % 2 === 1 });
      return parts;
    },
  },
  {
    id: 'jacuzzi',
    name: 'Jacuzzi',
    category: 'exterior',
    w: 2.1,
    d: 2.1,
    h: 0.9,
    slots: { primary: slot('Revestimiento', 'madera-paneles', '#6e4a2f'), secondary: PORC(), water: slot('Agua', 'agua', '#3a95b8') },
    build: (w, d, h) => [R(0, 0, 0, w, h, d, 'primary', 0.08), R(0, h - 0.02, 0, w - 0.06, 0.05, d - 0.06, 'secondary', 0.06), B(0, h - 0.06, 0, w - 0.3, 0.06, d - 0.3, 'water')],
  },
];
