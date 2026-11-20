import type { RoomType, SurfaceMaterial } from '@/modules/FloorPlan/types';

export interface RoomTypeDef {
  type: RoomType;
  name: string;
  /** Relleno del plano 2D. */
  color: string;
  floor: SurfaceMaterial;
  hasCeiling: boolean;
  /** Estancia exterior (terraza, jardín…): sin techo ni luz de techo por defecto. */
  exterior: boolean;
}

export const ROOM_TYPES: RoomTypeDef[] = [
  { type: 'salon', name: 'Salón', color: '#efe4d2', floor: { materialId: 'parquet-roble', color: '#b8875a' }, hasCeiling: true, exterior: false },
  { type: 'comedor', name: 'Comedor', color: '#f0e6d6', floor: { materialId: 'parquet-roble', color: '#b8875a' }, hasCeiling: true, exterior: false },
  { type: 'cocina', name: 'Cocina', color: '#e3eef0', floor: { materialId: 'ceramica-gris', color: '#8e9092' }, hasCeiling: true, exterior: false },
  { type: 'dormitorio', name: 'Dormitorio', color: '#e9e4f1', floor: { materialId: 'parquet-roble', color: '#b8875a' }, hasCeiling: true, exterior: false },
  { type: 'bano', name: 'Baño', color: '#dcebf3', floor: { materialId: 'ceramica-blanca', color: '#efeeea' }, hasCeiling: true, exterior: false },
  { type: 'aseo', name: 'Aseo', color: '#dcebf3', floor: { materialId: 'ceramica-blanca', color: '#efeeea' }, hasCeiling: true, exterior: false },
  { type: 'despacho', name: 'Despacho', color: '#eee8dc', floor: { materialId: 'parquet-nogal', color: '#6e4a2f' }, hasCeiling: true, exterior: false },
  { type: 'pasillo', name: 'Pasillo', color: '#ecebe7', floor: { materialId: 'parquet-roble', color: '#b8875a' }, hasCeiling: true, exterior: false },
  { type: 'recibidor', name: 'Recibidor', color: '#ecebe7', floor: { materialId: 'marmol-blanco', color: '#eeece8' }, hasCeiling: true, exterior: false },
  { type: 'lavadero', name: 'Lavadero', color: '#e4ecec', floor: { materialId: 'ceramica-blanca', color: '#efeeea' }, hasCeiling: true, exterior: false },
  { type: 'garaje', name: 'Garaje', color: '#e3e3e3', floor: { materialId: 'hormigon-pulido', color: '#a5a49f' }, hasCeiling: true, exterior: false },
  { type: 'terraza', name: 'Terraza', color: '#ede3d5', floor: { materialId: 'tarima-exterior', color: '#8a6446' }, hasCeiling: false, exterior: true },
  { type: 'jardin', name: 'Jardín', color: '#dcebd2', floor: { materialId: 'cesped', color: '#5d8c39' }, hasCeiling: false, exterior: true },
  { type: 'piscina', name: 'Piscina', color: '#cfe7f2', floor: { materialId: 'agua', color: '#3a95b8' }, hasCeiling: false, exterior: true },
  { type: 'otro', name: 'Otra estancia', color: '#eeeeec', floor: { materialId: 'ceramica-beige', color: '#cbbba3' }, hasCeiling: true, exterior: false },
];

const map = new Map(ROOM_TYPES.map((r) => [r.type, r]));
export const getRoomType = (t: RoomType): RoomTypeDef => map.get(t) ?? map.get('otro')!;
