import { uid } from '@/core/ids';
import { cleanVec } from '@/core/geometry';
import { getRoomType } from '@/modules/Rooms/roomTypes';
import { getOpeningDef } from '@/modules/DoorsAndWindows/catalog';
import type {
  Dimension,
  ID,
  Opening,
  OpeningKind,
  ProjectSettings,
  Room,
  RoomType,
  Vec2,
  Wall,
} from './types';

export function createWall(levelId: ID, start: Vec2, end: Vec2, settings: ProjectSettings, overrides: Partial<Wall> = {}): Wall {
  return {
    id: uid('wall'),
    levelId,
    start: cleanVec(start),
    end: cleanVec(end),
    thickness: settings.defaultWallThickness,
    height: settings.defaultWallHeight,
    sideA: { ...settings.defaultInterior },
    sideB: { ...settings.defaultInterior },
    ...overrides,
  };
}

export function createRoom(levelId: ID, type: RoomType, points: Vec2[], overrides: Partial<Room> = {}): Room {
  const def = getRoomType(type);
  return {
    id: uid('room'),
    levelId,
    name: def.name,
    type,
    points: points.map(cleanVec),
    floor: { ...def.floor },
    ceiling: { materialId: 'pintura', color: '#f7f6f3' },
    hasCeiling: def.hasCeiling,
    ceilingHeight: null,
    ceilingLight: !def.exterior,
    color: def.color,
    ...overrides,
  };
}

export function createOpening(levelId: ID, wallId: ID, kind: OpeningKind, offset: number, overrides: Partial<Opening> = {}): Opening {
  const def = getOpeningDef(kind);
  return {
    id: uid('open'),
    levelId,
    wallId,
    kind,
    offset,
    width: def.width,
    height: def.height,
    sill: def.sill,
    hinge: 'left',
    swing: 'a',
    frame: { ...def.frame },
    panel: { ...def.panel },
    ...overrides,
  };
}

export function createDimension(levelId: ID, start: Vec2, end: Vec2, offset = 0): Dimension {
  return { id: uid('dim'), levelId, start: cleanVec(start), end: cleanVec(end), offset };
}
