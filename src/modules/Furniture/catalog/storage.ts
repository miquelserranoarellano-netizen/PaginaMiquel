/** Armarios y estanterías. */
import type { CatalogItem } from '../types';
import { BOOKS, CUBE, CUBE_T, LACQ, METAL, WOOD, builtInWardrobe, cubeShelf, cubeSpan, drawers, legs, shelving, slot, wallShelves, wardrobe } from './parts';
import type { V3 } from './parts';
import { pbool, pint, pnum } from '../params';
import type { ParamDef, ParamValues } from '../types';

const BUILT_IN_PARAMS = (sliding: boolean): ParamDef[] => [
  { key: 'doors', label: 'Puertas', kind: 'int', default: 0, min: 0, max: 12, hint: '0 = automático según el ancho' },
  { key: 'sliding', label: 'Correderas', kind: 'bool', default: sliding },
  { key: 'altillo', label: 'Con altillo', kind: 'bool', default: true, hint: 'Puertas pequeñas arriba, hasta el techo' },
  { key: 'frame', label: 'Marco tapajuntas', kind: 'bool', default: true },
  { key: 'mirror', label: 'Puerta con espejo', kind: 'bool', default: false },
];
const builtIn = (w: number, d: number, h: number, p: ParamValues, sliding: boolean) =>
  builtInWardrobe(w, d, h, { doors: pint(p, 'doors', 0, 0, 12), sliding: pbool(p, 'sliding', sliding), altillo: pbool(p, 'altillo', true), frame: pbool(p, 'frame', true), mirror: pbool(p, 'mirror', false) });
const BUILT_IN_SLOTS = { primary: LACQ('#f4f3ef', 'Puertas'), frame: LACQ('#f4f3ef', 'Marco y zócalo'), secondary: METAL('#9a9a9a', 'aluminio'), mirror: slot('Espejo', 'cromo', '#dfe4e8') };

export const STORAGE: CatalogItem[] = [
  {
    id: 'wardrobe-built-in',
    name: 'Armario empotrado',
    category: 'armarios',
    w: 1.8,
    d: 0.62,
    h: 2.6,
    fullHeight: true,
    slots: BUILT_IN_SLOTS,
    params: BUILT_IN_PARAMS(false),
    build: (w, d, h, p) => builtIn(w, d, h, p, false),
  },
  {
    id: 'wardrobe-built-in-sliding',
    name: 'Armario empotrado corredero',
    category: 'armarios',
    w: 2.4,
    d: 0.65,
    h: 2.6,
    fullHeight: true,
    slots: { ...BUILT_IN_SLOTS, primary: slot('Puertas', 'madera-clara', '#d8b48a') },
    params: BUILT_IN_PARAMS(true),
    build: (w, d, h, p) => builtIn(w, d, h, p, true),
  },
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
