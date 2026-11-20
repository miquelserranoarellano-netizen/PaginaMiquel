import type { SurfaceMaterial } from '@/modules/FloorPlan/types';

/**
 * Los muebles del catálogo se describen con piezas paramétricas en un espacio
 * local: x = ancho (-w/2..w/2), y = alto (0..h), z = fondo (-d/2 = trasera,
 * +d/2 = frente). Así se pueden redimensionar sin deformarse y generan
 * automáticamente su símbolo en planta.
 */
export type PartShape = 'box' | 'rbox' | 'cyl' | 'sphere' | 'cone';

export interface Part {
  s: PartShape;
  /** Centro de la pieza. */
  p: [number, number, number];
  /** Dimensiones (ancho, alto, fondo). Para cilindros: diámetro X, alto, diámetro Z. */
  d: [number, number, number];
  /** Rotación Euler (radianes). */
  r?: [number, number, number];
  /** Ranura de material. */
  m: string;
  /** Radio de redondeo (rbox). */
  radius?: number;
  /** No dibujar en planta. */
  noPlan?: boolean;
}

export type FurnitureCategory =
  | 'sofas'
  | 'mesas'
  | 'sillas'
  | 'camas'
  | 'armarios'
  | 'escritorios'
  | 'televisores'
  | 'electrodomesticos'
  | 'cocina'
  | 'sanitarios'
  | 'duchas'
  | 'lamparas'
  | 'decoracion'
  | 'exterior'
  | 'climatizacion'
  | 'estructura'
  | 'importados';

export interface MaterialSlot extends SurfaceMaterial {
  label: string;
}

export type ParamValue = number | boolean;
export type ParamValues = Record<string, ParamValue>;

/** Parámetro configurable de un mueble (pulgadas de un televisor, baldas de una estantería…). */
export interface ParamDef {
  key: string;
  label: string;
  kind: 'number' | 'int' | 'bool';
  default: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: string;
}

export interface Size3 {
  w: number;
  d: number;
  h: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  w: number;
  d: number;
  h: number;
  /** Elevación por defecto (cuadros, televisores de pared, lámparas de techo…). */
  elevation?: number;
  slots: Record<string, MaterialSlot>;
  build: (w: number, d: number, h: number, p: ParamValues) => Part[];
  /** Parámetros configurables. */
  params?: ParamDef[];
  /** Medidas que dependen de los parámetros (p. ej. las pulgadas fijan el ancho y alto de una TV). */
  derive?: (p: ParamValues, current: Size3) => Partial<Size3>;
  /** Parámetros equivalentes a unas medidas (al redimensionar con los tiradores). */
  fromSize?: (size: Size3, p: ParamValues) => ParamValues;
  /** Fuente de luz (lámparas). y relativo a la altura total (0..1). */
  light?: { y: number; intensity: number; color: string; distance: number };
  /** Bloquea el paso en el recorrido (por defecto si mide más de 40 cm). */
  blocks?: boolean;
}

export const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  sofas: 'Sofás',
  mesas: 'Mesas',
  sillas: 'Sillas',
  camas: 'Camas',
  armarios: 'Armarios',
  escritorios: 'Escritorios',
  televisores: 'Televisores',
  electrodomesticos: 'Electrodomésticos',
  cocina: 'Cocina',
  sanitarios: 'Sanitarios',
  duchas: 'Duchas y bañeras',
  lamparas: 'Lámparas',
  decoracion: 'Decoración',
  exterior: 'Exterior',
  climatizacion: 'Climatización',
  estructura: 'Escaleras y estructura',
  importados: 'Modelos importados',
};
