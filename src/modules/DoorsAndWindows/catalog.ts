import type { OpeningKind, SurfaceMaterial } from '@/modules/FloorPlan/types';

export interface OpeningDef {
  kind: OpeningKind;
  name: string;
  category: 'puerta' | 'ventana';
  width: number;
  height: number;
  sill: number;
  /** Se puede atravesar en el recorrido (se abre al acercarse). */
  passable: boolean;
  frame: SurfaceMaterial;
  panel: SurfaceMaterial;
}

const WOOD: SurfaceMaterial = { materialId: 'madera-roble', color: '#b98a59' };
const WHITE: SurfaceMaterial = { materialId: 'lacado', color: '#f4f4f1' };
const ALU: SurfaceMaterial = { materialId: 'metal-negro', color: '#2a2a2c' };
const GLASS: SurfaceMaterial = { materialId: 'vidrio', color: '#cfe5ee' };

export const OPENING_TYPES: OpeningDef[] = [
  { kind: 'door', name: 'Puerta', category: 'puerta', width: 0.82, height: 2.05, sill: 0, passable: true, frame: WHITE, panel: WHITE },
  { kind: 'double-door', name: 'Puerta doble', category: 'puerta', width: 1.45, height: 2.05, sill: 0, passable: true, frame: WHITE, panel: WHITE },
  { kind: 'sliding-door', name: 'Puerta corredera', category: 'puerta', width: 0.9, height: 2.05, sill: 0, passable: true, frame: WHITE, panel: WOOD },
  { kind: 'entrance-door', name: 'Puerta de entrada', category: 'puerta', width: 1.0, height: 2.15, sill: 0, passable: true, frame: ALU, panel: { materialId: 'madera-nogal', color: '#5f3f29' } },
  { kind: 'garage-door', name: 'Puerta de garaje', category: 'puerta', width: 2.6, height: 2.2, sill: 0, passable: true, frame: ALU, panel: { materialId: 'aluminio', color: '#c4c7cb' } },
  { kind: 'window', name: 'Ventana', category: 'ventana', width: 1.2, height: 1.2, sill: 0.95, passable: false, frame: ALU, panel: GLASS },
  { kind: 'small-window', name: 'Ventana pequeña', category: 'ventana', width: 0.6, height: 0.6, sill: 1.5, passable: false, frame: ALU, panel: GLASS },
  { kind: 'french-window', name: 'Balconera', category: 'ventana', width: 1.4, height: 2.2, sill: 0, passable: true, frame: ALU, panel: GLASS },
  { kind: 'sliding-window', name: 'Ventanal corredero', category: 'ventana', width: 2.6, height: 2.3, sill: 0, passable: true, frame: ALU, panel: GLASS },
  { kind: 'fixed-window', name: 'Ventana fija', category: 'ventana', width: 1.6, height: 1.6, sill: 0.6, passable: false, frame: ALU, panel: GLASS },
];

const map = new Map(OPENING_TYPES.map((o) => [o.kind, o]));
export const getOpeningDef = (kind: OpeningKind): OpeningDef => map.get(kind) ?? map.get('door')!;
export const isDoorKind = (kind: OpeningKind): boolean => getOpeningDef(kind).category === 'puerta';
