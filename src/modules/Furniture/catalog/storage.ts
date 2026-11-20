/** Armarios y estanterías. */
import type { CatalogItem } from '../types';
import { BOOKS, CUBE, CUBE_T, LACQ, METAL, WOOD, cubeShelf, cubeSpan, drawers, legs, shelving, slot, wallShelves, wardrobe } from './parts';
import type { V3 } from './parts';
import { pint, pnum } from '../params';

export const STORAGE: CatalogItem[] = [
  { id: 'wardrobe-2', name: 'Armario 2 puertas', category: 'armarios', w: 1.0, d: 0.6, h: 2.2, slots: { primary: LACQ('#f4f4f1'), secondary: METAL() }, build: (w, d, h) => wardrobe(w, d, h, 2) },
  { id: 'wardrobe-3', name: 'Armario 3 puertas', category: 'armarios', w: 1.5, d: 0.6, h: 2.4, slots: { primary: WOOD('#d8b48a', 'madera-clara'), secondary: METAL() }, build: (w, d, h) => wardrobe(w, d, h, 3) },
  {
    id: 'bookshelf',
    name: 'Estantería',
    category: 'armarios',
    w: 1.0,
    d: 0.35,
    h: 2.0,
    slots: { primary: WOOD(), ...BOOKS },
    params: [
      { key: 'levels', label: 'Baldas', kind: 'int', default: 5, min: 1, max: 12, hint: 'Número de huecos en altura' },
      { key: 'columns', label: 'Módulos', kind: 'int', default: 1, min: 1, max: 8, hint: 'Columnas separadas por montantes' },
      { key: 'back', label: 'Con trasera', kind: 'bool', default: true },
      { key: 'books', label: 'Con libros', kind: 'bool', default: true },
    ],
    build: (w, d, h, p) => shelving(w, d, h, p),
  },
  {
    id: 'cube-shelf',
    name: 'Estantería de cubos',
    category: 'armarios',
    w: 1.47,
    d: 0.39,
    h: 1.47,
    slots: { primary: LACQ('#f4f4f1'), boxes: slot('Cajas', 'tela', '#b9b2a6'), ...BOOKS },
    params: [
      { key: 'rows', label: 'Filas', kind: 'int', default: 4, min: 1, max: 6 },
      { key: 'cols', label: 'Columnas', kind: 'int', default: 4, min: 1, max: 6 },
      { key: 'boxes', label: 'Con cajas', kind: 'bool', default: true },
    ],
    derive: (p) => ({ w: cubeSpan(pint(p, 'cols', 4, 1, 6)), h: cubeSpan(pint(p, 'rows', 4, 1, 6)) }),
    fromSize: (s) => ({ cols: Math.max(1, Math.min(6, Math.round((s.w - CUBE_T) / (CUBE + CUBE_T)))), rows: Math.max(1, Math.min(6, Math.round((s.h - CUBE_T) / (CUBE + CUBE_T)))) }),
    build: (w, d, h, p) => cubeShelf(w, d, h, p),
  },
  {
    id: 'wall-shelves',
    name: 'Baldas de pared',
    category: 'armarios',
    w: 1.2,
    d: 0.25,
    h: 0.73,
    elevation: 1.1,
    slots: { primary: WOOD(), decor: slot('Decoración', 'porcelana', '#e9e2d4'), ...BOOKS },
    blocks: false,
    params: [
      { key: 'count', label: 'Baldas', kind: 'int', default: 3, min: 1, max: 8 },
      { key: 'spacing', label: 'Separación', kind: 'number', default: 0.35, min: 0.15, max: 0.8, step: 0.01, unit: 'm' },
      { key: 'decor', label: 'Con objetos', kind: 'bool', default: true, hint: 'Libros y decoración' },
    ],
    derive: (p) => ({ h: Math.round(((pint(p, 'count', 3, 1, 8) - 1) * pnum(p, 'spacing', 0.35) + 0.03) * 1000) / 1000 }),
    build: (w, d, _h, p) => wallShelves(w, d, p),
  },
  { id: 'sideboard', name: 'Aparador', category: 'armarios', w: 1.8, d: 0.45, h: 0.75, slots: { primary: WOOD('#5f3f29', 'madera-nogal'), secondary: METAL('#c9a24f', 'laton') }, build: (w, d, h) => drawers(w, d, h - 0.15, 1, 3, 0).map((p) => ({ ...p, p: [p.p[0], p.p[1] + 0.15, p.p[2]] as V3 })).concat(legs(w, d, 0.15, 0.03, 'secondary', 0.05)) },
  { id: 'dresser', name: 'Cómoda', category: 'armarios', w: 1.0, d: 0.5, h: 0.85, slots: { primary: LACQ('#f4f4f1'), secondary: WOOD() }, build: (w, d, h) => drawers(w, d, h, 4, 1) },
  { id: 'shoe-cabinet', name: 'Zapatero', category: 'armarios', w: 0.9, d: 0.3, h: 1.1, slots: { primary: LACQ('#e9e2d4'), secondary: METAL() }, build: (w, d, h) => drawers(w, d, h, 3, 1, 0.05) },
];
