/**
 * Validación y migración de proyectos al abrir o importar. Garantiza que el
 * documento tenga todos los campos esperados; los datos inválidos se descartan
 * con un aviso en lugar de romper la aplicación.
 */
import { uid } from '@/core/ids';
import { DEFAULT_SETTINGS, createLevel, defaultLighting } from './defaults';
import type { ProjectDoc, SurfaceMaterial, Vec2 } from './types';
import { SCHEMA_VERSION } from './types';

export class ProjectFormatError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, def: number, min = -Infinity, max = Infinity): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
const str = (v: unknown, def: string): string => (typeof v === 'string' && v.length ? v : def);
const vec = (v: unknown): Vec2 | null => (isObj(v) && typeof v.x === 'number' && typeof v.y === 'number' && Number.isFinite(v.x) && Number.isFinite(v.y) ? { x: v.x, y: v.y } : null);
const mat = (v: unknown, def: SurfaceMaterial): SurfaceMaterial => (isObj(v) ? { materialId: str(v.materialId, def.materialId), color: str(v.color, def.color) } : { ...def });

export interface NormalizeResult {
  doc: ProjectDoc;
  warnings: string[];
}

export function normalizeProject(raw: unknown): NormalizeResult {
  const warnings: string[] = [];
  const src = isObj(raw) && isObj(raw.doc) ? raw.doc : raw; // admite { doc, meta }
  if (!isObj(src)) throw new ProjectFormatError('El fichero no contiene un proyecto válido');
  if (typeof src.schemaVersion === 'number' && src.schemaVersion > SCHEMA_VERSION)
    warnings.push('El proyecto se creó con una versión más reciente de la aplicación; algunos datos podrían ignorarse.');
  if (!isObj(src.levels) || !isObj(src.walls)) throw new ProjectFormatError('Faltan las plantas o los muros del proyecto');

  const now = Date.now();
  const s = isObj(src.settings) ? src.settings : {};
  const l = isObj(src.lighting) ? src.lighting : {};
  const baseLight = defaultLighting();
  const doc: ProjectDoc = {
    schemaVersion: SCHEMA_VERSION,
    id: str(src.id, uid('prj')),
    name: str(src.name, 'Proyecto sin nombre'),
    createdAt: num(src.createdAt, now),
    updatedAt: num(src.updatedAt, now),
    settings: {
      defaultWallThickness: num(s.defaultWallThickness, DEFAULT_SETTINGS.defaultWallThickness, 0.05, 1),
      defaultWallHeight: num(s.defaultWallHeight, DEFAULT_SETTINGS.defaultWallHeight, 0.3, 12),
      defaultExterior: mat(s.defaultExterior, DEFAULT_SETTINGS.defaultExterior),
      defaultInterior: mat(s.defaultInterior, DEFAULT_SETTINGS.defaultInterior),
      showGround: typeof s.showGround === 'boolean' ? s.showGround : true,
      ground: mat(s.ground, DEFAULT_SETTINGS.ground),
    },
    lighting: {
      preset: (['manana', 'mediodia', 'atardecer', 'noche'] as const).includes(l.preset as never) ? (l.preset as ProjectDoc['lighting']['preset']) : baseLight.preset,
      sunIntensity: num(l.sunIntensity, baseLight.sunIntensity, 0, 10),
      sunAzimuth: num(l.sunAzimuth, baseLight.sunAzimuth, 0, 360),
      sunElevation: num(l.sunElevation, baseLight.sunElevation, 0, 90),
      sunColor: str(l.sunColor, baseLight.sunColor),
      ambientIntensity: num(l.ambientIntensity, baseLight.ambientIntensity, 0, 5),
      interiorIntensity: num(l.interiorIntensity, baseLight.interiorIntensity, 0, 5),
      interiorOn: typeof l.interiorOn === 'boolean' ? l.interiorOn : baseLight.interiorOn,
      exposure: num(l.exposure, 1, 0.1, 4),
      shadows: typeof l.shadows === 'boolean' ? l.shadows : true,
    },
    levels: {},
    walls: {},
    rooms: {},
    openings: {},
    furniture: {},
    dimensions: {},
    assets: {},
  };

  let order = 0;
  for (const [id, v] of Object.entries(src.levels)) {
    if (!isObj(v)) continue;
    const def = createLevel();
    doc.levels[id] = {
      id,
      name: str(v.name, def.name),
      elevation: num(v.elevation, 0),
      height: num(v.height, def.height, 1, 20),
      order: num(v.order, order++),
      slabThickness: num(v.slabThickness, def.slabThickness, 0.01, 2),
    };
  }
  if (!Object.keys(doc.levels).length) {
    const lv = createLevel();
    doc.levels[lv.id] = lv;
    warnings.push('El proyecto no tenía plantas; se ha creado una.');
  }
  const firstLevel = Object.keys(doc.levels)[0];
  const lvl = (v: unknown) => (typeof v === 'string' && doc.levels[v] ? v : firstLevel);

  let dropped = 0;
  for (const [id, v] of Object.entries(src.walls)) {
    const a = isObj(v) ? vec(v.start) : null;
    const b = isObj(v) ? vec(v.end) : null;
    if (!isObj(v) || !a || !b || Math.hypot(a.x - b.x, a.y - b.y) < 0.01) {
      dropped++;
      continue;
    }
    doc.walls[id] = {
      id,
      levelId: lvl(v.levelId),
      start: a,
      end: b,
      thickness: num(v.thickness, 0.2, 0.02, 2),
      height: num(v.height, 2.7, 0.1, 30),
      sideA: mat(v.sideA, DEFAULT_SETTINGS.defaultInterior),
      sideB: mat(v.sideB, DEFAULT_SETTINGS.defaultInterior),
    };
  }
  for (const [id, v] of Object.entries(isObj(src.rooms) ? src.rooms : {})) {
    if (!isObj(v) || !Array.isArray(v.points)) {
      dropped++;
      continue;
    }
    const points = v.points.map(vec).filter((p): p is Vec2 => !!p);
    if (points.length < 3) {
      dropped++;
      continue;
    }
    doc.rooms[id] = {
      id,
      levelId: lvl(v.levelId),
      name: str(v.name, 'Estancia'),
      type: str(v.type, 'otro') as ProjectDoc['rooms'][string]['type'],
      points,
      floor: mat(v.floor, { materialId: 'parquet-roble', color: '#b8875a' }),
      ceiling: mat(v.ceiling, { materialId: 'pintura', color: '#f7f6f3' }),
      hasCeiling: typeof v.hasCeiling === 'boolean' ? v.hasCeiling : true,
      ceilingHeight: typeof v.ceilingHeight === 'number' ? v.ceilingHeight : null,
      ceilingLight: typeof v.ceilingLight === 'boolean' ? v.ceilingLight : true,
      color: str(v.color, '#eeeeec'),
    };
  }
  for (const [id, v] of Object.entries(isObj(src.openings) ? src.openings : {})) {
    if (!isObj(v) || typeof v.wallId !== 'string' || !doc.walls[v.wallId]) {
      dropped++;
      continue;
    }
    doc.openings[id] = {
      id,
      levelId: doc.walls[v.wallId].levelId,
      wallId: v.wallId,
      kind: str(v.kind, 'door') as ProjectDoc['openings'][string]['kind'],
      offset: num(v.offset, 0.5, 0),
      width: num(v.width, 0.8, 0.1, 10),
      height: num(v.height, 2.05, 0.1, 10),
      sill: num(v.sill, 0, 0, 10),
      hinge: v.hinge === 'right' ? 'right' : 'left',
      swing: v.swing === 'b' ? 'b' : 'a',
      frame: mat(v.frame, { materialId: 'lacado', color: '#f4f4f1' }),
      panel: mat(v.panel, { materialId: 'lacado', color: '#f4f4f1' }),
    };
  }
  for (const [id, v] of Object.entries(isObj(src.furniture) ? src.furniture : {})) {
    const pos = isObj(v) ? vec(v.position) : null;
    if (!isObj(v) || !pos) {
      dropped++;
      continue;
    }
    const materials: Record<string, SurfaceMaterial> = {};
    if (isObj(v.materials)) for (const [k, m] of Object.entries(v.materials)) materials[k] = mat(m, { materialId: 'plastico', color: '#e9e9e7' });
    const params: Record<string, number | boolean> = {};
    if (isObj(v.params)) for (const [k, val] of Object.entries(v.params)) if (typeof val === 'number' || typeof val === 'boolean') params[k] = val;
    const light = isObj(v.light) ? { on: v.light.on !== false, intensity: num(v.light.intensity, 1, 0, 10), color: str(v.light.color, '#ffe9c4') } : undefined;
    doc.furniture[id] = {
      id,
      levelId: lvl(v.levelId),
      catalogId: str(v.catalogId, 'imported'),
      name: str(v.name, 'Objeto'),
      position: pos,
      rotation: num(v.rotation, 0),
      elevation: num(v.elevation, 0, -5, 50),
      width: num(v.width, 1, 0.01, 50),
      depth: num(v.depth, 1, 0.01, 50),
      height: num(v.height, 1, 0.01, 50),
      materials,
      ...(typeof v.assetId === 'string' ? { assetId: v.assetId } : {}),
      ...(light ? { light } : {}),
      ...(Object.keys(params).length ? { params } : {}),
    };
  }
  for (const [id, v] of Object.entries(isObj(src.dimensions) ? src.dimensions : {})) {
    const a = isObj(v) ? vec(v.start) : null;
    const b = isObj(v) ? vec(v.end) : null;
    if (!isObj(v) || !a || !b) continue;
    doc.dimensions[id] = { id, levelId: lvl(v.levelId), start: a, end: b, offset: num(v.offset, 0) };
  }
  for (const [id, v] of Object.entries(isObj(src.assets) ? src.assets : {})) {
    if (!isObj(v) || typeof v.dataUrl !== 'string' || !v.dataUrl.startsWith('data:')) continue;
    doc.assets[id] = { id, name: str(v.name, 'modelo.glb'), mime: v.mime === 'model/gltf+json' ? 'model/gltf+json' : 'model/gltf-binary', dataUrl: v.dataUrl, size: num(v.size, 0) };
  }
  for (const f of Object.values(doc.furniture)) if (f.assetId && !doc.assets[f.assetId]) delete f.assetId;
  if (dropped) warnings.push(`Se han descartado ${dropped} elementos dañados.`);
  return { doc, warnings };
}
