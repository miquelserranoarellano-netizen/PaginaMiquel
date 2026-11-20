import { uid } from '@/core/ids';
import type { Level, LightingSettings, ProjectDoc, ProjectSettings } from './types';
import { SCHEMA_VERSION } from './types';

export const LIMITS = {
  wallThickness: { min: 0.05, max: 1 },
  wallHeight: { min: 0.3, max: 12 },
  wallLength: { min: 0.05, max: 200 },
  openingWidth: { min: 0.3, max: 8 },
  openingHeight: { min: 0.3, max: 6 },
  furnitureSize: { min: 0.02, max: 30 },
  levelHeight: { min: 2, max: 12 },
} as const;

export const DEFAULT_SETTINGS: ProjectSettings = {
  defaultWallThickness: 0.2,
  defaultWallHeight: 2.7,
  defaultExterior: { materialId: 'estuco', color: '#ece5d8' },
  defaultInterior: { materialId: 'pintura', color: '#f3f1ec' },
  showGround: true,
  ground: { materialId: 'cesped', color: '#5d8c39' },
};

export const LIGHTING_PRESETS: Record<LightingSettings['preset'], Omit<LightingSettings, 'preset' | 'shadows' | 'exposure'>> = {
  manana: { sunIntensity: 2.6, sunAzimuth: 105, sunElevation: 24, sunColor: '#ffe8cc', ambientIntensity: 0.55, interiorIntensity: 0.6, interiorOn: false },
  mediodia: { sunIntensity: 3.2, sunAzimuth: 180, sunElevation: 62, sunColor: '#fffaf0', ambientIntensity: 0.7, interiorIntensity: 0.6, interiorOn: false },
  atardecer: { sunIntensity: 2.0, sunAzimuth: 255, sunElevation: 7, sunColor: '#ffb070', ambientIntensity: 0.4, interiorIntensity: 0.8, interiorOn: true },
  noche: { sunIntensity: 0.15, sunAzimuth: 220, sunElevation: 35, sunColor: '#9fb4ff', ambientIntensity: 0.12, interiorIntensity: 1, interiorOn: true },
};

export function defaultLighting(preset: LightingSettings['preset'] = 'mediodia'): LightingSettings {
  return { preset, ...LIGHTING_PRESETS[preset], exposure: 1, shadows: true };
}

export function createLevel(partial: Partial<Level> = {}): Level {
  return {
    id: uid('lvl'),
    name: 'Planta baja',
    elevation: 0,
    height: DEFAULT_SETTINGS.defaultWallHeight,
    order: 0,
    slabThickness: 0.25,
    ...partial,
  };
}

export function createEmptyProject(name = 'Mi casa'): ProjectDoc {
  const level = createLevel();
  const now = Date.now();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid('prj'),
    name,
    createdAt: now,
    updatedAt: now,
    settings: structuredClone(DEFAULT_SETTINGS),
    lighting: defaultLighting(),
    levels: { [level.id]: level },
    walls: {},
    rooms: {},
    openings: {},
    furniture: {},
    dimensions: {},
    assets: {},
  };
}
