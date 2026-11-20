/**
 * Modelo de datos único del proyecto. El plano 2D, el modelo 3D y el
 * recorrido virtual son vistas de este documento.
 *
 * Unidades: metros. Coordenadas del plano: x → derecha, y → abajo.
 * En 3D: X = x, Z = y, Y = elevación.
 */
import type { Vec2 } from '@/core/geometry';

export type ID = string;
export type { Vec2 };

export const SCHEMA_VERSION = 1;

/** Referencia a un material de la biblioteca con su color. */
export interface SurfaceMaterial {
  materialId: string;
  color: string;
}

export interface Level {
  id: ID;
  name: string;
  /** Cota del suelo de la planta (m). */
  elevation: number;
  /** Altura libre por defecto de los muros de la planta (m). */
  height: number;
  order: number;
  /** Grosor del forjado (suelo) de la planta. */
  slabThickness: number;
}

export interface Wall {
  id: ID;
  levelId: ID;
  start: Vec2;
  end: Vec2;
  thickness: number;
  height: number;
  /** Cara izquierda (lado +normal, a la izquierda yendo de start a end). */
  sideA: SurfaceMaterial;
  /** Cara derecha. */
  sideB: SurfaceMaterial;
}

export type RoomType =
  | 'salon'
  | 'comedor'
  | 'cocina'
  | 'dormitorio'
  | 'bano'
  | 'aseo'
  | 'despacho'
  | 'pasillo'
  | 'recibidor'
  | 'lavadero'
  | 'garaje'
  | 'terraza'
  | 'jardin'
  | 'piscina'
  | 'otro';

export interface Room {
  id: ID;
  levelId: ID;
  name: string;
  type: RoomType;
  /** Polígono del suelo (sin cerrar: el último punto conecta con el primero). */
  points: Vec2[];
  floor: SurfaceMaterial;
  ceiling: SurfaceMaterial;
  hasCeiling: boolean;
  /** Altura del techo; null = altura de la planta. */
  ceilingHeight: number | null;
  /** Luz de techo automática en el centro de la estancia. */
  ceilingLight: boolean;
  /** Color del relleno en el plano 2D. */
  color: string;
}

export type OpeningKind =
  | 'door'
  | 'double-door'
  | 'sliding-door'
  | 'entrance-door'
  | 'garage-door'
  | 'window'
  | 'small-window'
  | 'french-window'
  | 'sliding-window'
  | 'fixed-window';

export interface Opening {
  id: ID;
  levelId: ID;
  wallId: ID;
  kind: OpeningKind;
  /** Distancia desde el inicio del muro hasta el centro del hueco (m). */
  offset: number;
  width: number;
  height: number;
  /** Altura del antepecho (0 en puertas). */
  sill: number;
  /** Lado de las bisagras visto desde la cara A. */
  hinge: 'left' | 'right';
  /** Hacia qué cara del muro abre: 'a' (lado +normal) o 'b'. */
  swing: 'a' | 'b';
  frame: SurfaceMaterial;
  panel: SurfaceMaterial;
}

export interface FurnitureItem {
  id: ID;
  levelId: ID;
  catalogId: string;
  name: string;
  /** Centro de la huella en planta. */
  position: Vec2;
  /** Grados, sentido horario visto en planta. */
  rotation: number;
  /** Altura de la base sobre el suelo de la planta. */
  elevation: number;
  width: number;
  depth: number;
  height: number;
  /** Material por ranura (primary, secondary, …). */
  materials: Record<string, SurfaceMaterial>;
  /** Modelo GLB/GLTF importado (id en `assets`). */
  assetId?: ID;
  /** Para lámparas: encendida y potencia relativa. */
  light?: { on: boolean; intensity: number; color: string };
}

/** Cota (línea de medida) persistente. */
export interface Dimension {
  id: ID;
  levelId: ID;
  start: Vec2;
  end: Vec2;
  /** Desplazamiento perpendicular de la línea de cota (m). */
  offset: number;
}

export interface Asset {
  id: ID;
  name: string;
  mime: 'model/gltf-binary' | 'model/gltf+json';
  /** Contenido codificado como data URL (base64). */
  dataUrl: string;
  size: number;
}

export type LightingPreset = 'manana' | 'mediodia' | 'atardecer' | 'noche';

export interface LightingSettings {
  preset: LightingPreset;
  /** Intensidad del sol (luz natural). */
  sunIntensity: number;
  /** Orientación del sol en grados (0 = norte, 90 = este). */
  sunAzimuth: number;
  /** Altura del sol sobre el horizonte en grados. */
  sunElevation: number;
  sunColor: string;
  ambientIntensity: number;
  /** Multiplicador de luces interiores (lámparas y luces de techo). */
  interiorIntensity: number;
  interiorOn: boolean;
  exposure: number;
  shadows: boolean;
}

export interface ProjectSettings {
  defaultWallThickness: number;
  defaultWallHeight: number;
  /** Material exterior por defecto para muros nuevos. */
  defaultExterior: SurfaceMaterial;
  defaultInterior: SurfaceMaterial;
  showGround: boolean;
  ground: SurfaceMaterial;
}

export interface ProjectDoc {
  schemaVersion: number;
  id: ID;
  name: string;
  createdAt: number;
  updatedAt: number;
  settings: ProjectSettings;
  lighting: LightingSettings;
  levels: Record<ID, Level>;
  walls: Record<ID, Wall>;
  rooms: Record<ID, Room>;
  openings: Record<ID, Opening>;
  furniture: Record<ID, FurnitureItem>;
  dimensions: Record<ID, Dimension>;
  assets: Record<ID, Asset>;
}

export type ElementKind = 'wall' | 'room' | 'opening' | 'furniture' | 'dimension';

export interface ElementRef {
  kind: ElementKind;
  id: ID;
}

export const COLLECTION: Record<ElementKind, 'walls' | 'rooms' | 'openings' | 'furniture' | 'dimensions'> = {
  wall: 'walls',
  room: 'rooms',
  opening: 'openings',
  furniture: 'furniture',
  dimension: 'dimensions',
};

export interface ProjectMeta {
  id: ID;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
  /** Superficie total de estancias (m²) para mostrar en la lista. */
  area?: number;
  rooms?: number;
}
